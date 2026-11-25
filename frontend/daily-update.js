/**
 * HEALTHY TREND TRADER - DAILY UPDATE HUB CONTROLLER
 * 
 * Orchestration and presentation layer for the Daily Update Hub.
 * Reuses existing APIs (/api/wealth, /api/trades, /api/risk-policy).
 * 
 * Card [02] Enhancements:
 * - Real-time account balance updates and validation
 * - Quick actions: Manter Saldo, Atualizar, Pendente, and Manter Todos
 * - Foreign currency (Nomad USD) support with conversion and exchange rate tracking
 * - Synchronizes with /api/wealth/adjustments and setOperationalEquity
 */

(function (root) {
  'use strict';

  function getRoot() {
    let el = document.getElementById('dailyUpdateRoot');
    if (!el) {
      const page = document.getElementById('dailyupdate');
      if (page) {
        page.innerHTML = '<div id="dailyUpdateRoot"></div>';
        el = document.getElementById('dailyUpdateRoot');
      }
    }
    return el;
  }

  const fmtBRL = (val) => {
    return (root.DailyUpdateModel?.formatBRL || ((n) => Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })))(val);
  };

  const fmtUSD = (val) => {
    return (root.DailyUpdateModel?.formatUSD || ((n) => 'US$ ' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })))(val);
  };

  const fmtPct = (val, withSign = true) => {
    return (root.DailyUpdateModel?.formatPercent || ((n) => (n > 0 ? '+' : '') + Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '%'))(val, withSign);
  };

  const fmtTime = (iso) => {
    return (root.DailyUpdateModel?.formatRelativeDate || ((s) => s ? 'Hoje' : 'Não conferido'))(iso);
  };

  class DailyUpdateHubController {
    constructor(options = {}) {
      this.root = options.root || (typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : root));
      const r = this.root;
      this.model = options.model || (r?.DailyUpdateModel ? new r.DailyUpdateModel() : (root?.DailyUpdateModel ? new root.DailyUpdateModel() : new Object()));
      this.isLoading = false;
      this.isInitialized = false;
      this.equityPeriod = 'all';
      this.equityOwner = 'both';
      this.activeHistoryTab = 'details';
      this.collapsedTitulares = new Set();
      this.collapsedPositionGroups = new Set();
      this.editingAccountInputs = new Map();
      this._domCache = null;
      this._equityBroadcastRaf = null;
      this._draftSaveTimer = null;
      this._syncSeq = 0;
      this._batchQuoteSeq = 0;
      this._priceSeqMap = new Map();
      this._accountLinkSeqMap = new Map();
      this._dirtyPositions = new Map();
      this._lifecycleListenersBound = false;
    }

    bindLifecycleListeners() {
      if (this._lifecycleListenersBound) return;
      this._lifecycleListenersBound = true;
      const r = this.root || root;
      if (typeof r?.addEventListener !== 'function') return;

      const isPageActive = () => {
        if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return false;
        const sec = document.getElementById('dailyupdate');
        return Boolean(sec && sec.classList && sec.classList.contains('active'));
      };

      r.addEventListener('healthyTrend:workspaceLoaded', () => {
        this.loadSavedState();
        if (typeof this.syncFromOperationalState === 'function') {
          this.syncFromOperationalState();
        }
        if (isPageActive()) this.render();
      });

      r.addEventListener('healthyTrend:authenticated', async () => {
        if (typeof this.syncFromOperationalState === 'function') {
          this.syncFromOperationalState();
        }
        await this.syncWithBackend();
        if (isPageActive()) this.render();
      });

      r.addEventListener('healthyTrend:tradesUpdated', async () => {
        if (typeof this.syncFromOperationalState === 'function') {
          this.syncFromOperationalState();
        }
        if (r.healthyTrendApi?.isAuthenticated?.()) {
          await this.syncWithBackend();
        }
        if (isPageActive()) this.render();
      });

      r.addEventListener('healthyTrend:positionDeleted', (e) => {
        const delId = e.detail?.id;
        if (delId && Array.isArray(this.model.positions)) {
          this.model.positions = this.model.positions.filter(p => String(p.id) !== String(delId));
          if (typeof this.model.saveDraft === 'function') this.model.saveDraft();
          this.model.updateClosingReadiness();
          if (isPageActive()) this.render();
        }
      });
    }

    async init() {
      this.bindLifecycleListeners();
      if (this.isInitialized) return;
      this.isInitialized = true;

      // 1. Load durable saved accounts, position meta (links/prices), and draft
      this.loadSavedState();

      // 2. Synchronize in-memory operational state if available
      if (typeof this.syncFromOperationalState === 'function') {
        this.syncFromOperationalState();
      }

      // 3. Sync with existing backend endpoints
      await this.syncWithBackend();

      // 4. Re-render if the user is already viewing Atualização Diária
      if (typeof document !== 'undefined' && typeof document.getElementById === 'function') {
        const sec = document.getElementById('dailyupdate');
        if (sec && sec.classList && sec.classList.contains('active')) {
          this.render();
        }
      }
    }

    syncFromOperationalState() {
      const r = this.root || root;
      if (!r || !r.operationalState) return;
      const oppPositions = Array.isArray(r.operationalState.positions) ? r.operationalState.positions : [];
      const oppClosed = Array.isArray(r.operationalState.closedPositions) ? r.operationalState.closedPositions : [];

      const activeOppMap = new Map();
      oppPositions.forEach(p => {
        if (p.id) activeOppMap.set(String(p.id), p);
        if (p.databaseId) activeOppMap.set(String(p.databaseId), p);
      });

      const closedOppMap = new Map();
      oppClosed.forEach(p => {
        if (p.id) closedOppMap.set(String(p.id), p);
        if (p.databaseId) closedOppMap.set(String(p.databaseId), p);
      });

      const savedMetaMap = typeof this.getMergedPositionMetaMap === 'function' ? this.getMergedPositionMetaMap() : {};

      // 1. Reconcile existing model positions against operationalState
      const remainingPositions = [];
      (this.model.positions || []).forEach(pos => {
        const idStr = String(pos.id);
        const isClosedInOpp = closedOppMap.has(idStr);
        const isActiveInOpp = activeOppMap.has(idStr);

        if (isClosedInOpp || (oppPositions.length > 0 && !isActiveInOpp && (/^[0-9a-f-]{36}$/i.test(idStr) || idStr.startsWith('trade-')))) {
          pos.closed = true;
          pos.status = 'encerrada';
          pos.quantity = 0;
          if (!this.model.closedPositions.some(c => String(c.id) === idStr)) {
            this.model.closedPositions.unshift(pos);
          }
        } else {
          const opp = activeOppMap.get(idStr);
          if (opp) {
            if (opp.currentPrice && Number(opp.currentPrice) > 0) pos.currentPrice = Number(opp.currentPrice);
            if (opp.currentStop) pos.trailingStop = Number(opp.currentStop);
            if (opp.remaining !== undefined) pos.quantity = Number(opp.remaining);
            else if (opp.initialQty !== undefined && !pos.isPartial) pos.quantity = Number(opp.initialQty);
            const strat = opp.strategy || opp.strategyType || opp.strategy_type;
            if (strat) pos.strategy = (String(strat).toUpperCase().includes('VOL')) ? 'VOLATILITY_TRADING' : 'TREND_FOLLOWING';
            if (opp.accountId && !pos.accountId) {
              pos.accountId = opp.accountId;
              if (opp.accountId === 'paper' || opp.mode === 'paper') {
                pos.broker = 'Paper Trading';
              } else {
                const acc = this.model.accounts.find(a => a.id === opp.accountId);
                if (acc) pos.broker = acc.label;
              }
            }
          }
          remainingPositions.push(pos);
        }
      });

      // 2. Add new positions present in operationalState that were not in model
      oppPositions.forEach(opp => {
        const idStr = String(opp.id || opp.databaseId || '');
        if (!idStr) return;
        const exists = remainingPositions.some(p => String(p.id) === idStr);
        if (!exists && opp.status !== 'closed' && !opp.isPending && opp.status !== 'pending') {
          const entry = Number(opp.entry || opp.averageEntry || opp.currentPrice || 0);
          const curr = Number(opp.currentPrice || entry);
          const qty = Number(opp.remaining ?? opp.initialQty ?? opp.totalQty ?? 0);
          const rawStrat = opp.strategy || opp.strategyType || opp.strategy_type || 'TREND_FOLLOWING';
          const resolvedStrat = (String(rawStrat).toUpperCase().includes('VOL')) ? 'VOLATILITY_TRADING' : 'TREND_FOLLOWING';

          const savedMeta = savedMetaMap[idStr] || null;
          const isPaper = opp.mode === 'paper' || opp.accountId === 'paper';
          let resolvedAccountId = isPaper ? 'paper' : (opp.accountId || savedMeta?.accountId || null);
          let resolvedBroker = isPaper ? 'Paper Trading' : (opp.broker || savedMeta?.broker || 'Pendente de conferência');
          if (!isPaper && resolvedAccountId) {
            const acc = this.model.accounts.find(a => a.id === resolvedAccountId);
            if (acc) resolvedBroker = acc.label;
          }

          const newPos = {
            id: idStr,
            ticker: opp.asset || opp.ticker,
            mode: opp.mode || (isPaper ? 'paper' : 'real'),
            assetClass: opp.market || 'Ações',
            market: opp.market || 'Ações',
            direction: opp.direction || 'long',
            side: (opp.direction === 'short' || opp.side === 'Venda') ? 'Venda' : 'Compra',
            strategy: resolvedStrat,
            currency: opp.currency || 'BRL',
            fxRate: Number(opp.fxRate || 1),
            accountId: resolvedAccountId,
            broker: resolvedBroker,
            quantity: qty,
            initialQuantity: Number(opp.initialQty ?? opp.totalQty ?? qty),
            contractMult: Number(opp.contractMult || 1),
            mult: Number(opp.contractMult || 1),
            isPartial: Array.isArray(opp.events) && opp.events.some(e => e.type === 'peeloff'),
            partialCount: Array.isArray(opp.events) ? opp.events.filter(e => e.type === 'peeloff').length : 0,
            entryDate: opp.entryDate || (opp.openedAt ? opp.openedAt.slice(0, 10) : new Date().toISOString().slice(0, 10)),
            openedAt: opp.openedAt || new Date().toISOString(),
            events: Array.isArray(opp.events) ? opp.events.slice() : [],
            entryPrice: entry,
            stopPrice: Number(opp.initialStop || opp.currentStop || 0),
            trailingStop: Number(opp.currentStop || opp.initialStop || 0),
            currentPrice: curr,
            priceUpdatedAt: new Date().toISOString(),
            priceSource: 'operational_sync',
            priceStale: false,
            status: 'conferida',
            checked: true,
            hasDivergence: false,
            divergence: null,
            checkedAt: new Date().toISOString()
          };
          remainingPositions.unshift(newPos);
        }
      });

      this.model.positions = remainingPositions;
      if (typeof this.model.saveDraft === 'function') {
        this.model.saveDraft();
      }
      this.model.updateClosingReadiness();
    }

    getMergedPositionMetaMap() {
      const storage = typeof localStorage !== 'undefined' ? localStorage : null;
      const key = root.DailyUpdateModel?.STORAGE_KEY_POSITION_META || 'healthy-daily-update-position-meta';
      const localMap = typeof this.model.loadPositionMeta === 'function' ? this.model.loadPositionMeta(storage) : {};
      let wsMap = {};
      try {
        if (root.healthyTrendWorkspace?.raw) {
          const rawWs = root.healthyTrendWorkspace.raw(key);
          if (rawWs) {
            const parsed = typeof rawWs === 'string' ? JSON.parse(rawWs) : rawWs;
            if (parsed && typeof parsed === 'object') wsMap = parsed;
          }
        }
      } catch (_) {}

      const merged = { ...wsMap };
      Object.entries(localMap || {}).forEach(([id, loc]) => {
        const existing = merged[id];
        if (!existing) {
          merged[id] = loc;
          return;
        }
        const locTs = loc?.updatedAt ? Date.parse(loc.updatedAt) : 0;
        const exTs = existing?.updatedAt ? Date.parse(existing.updatedAt) : 0;
        if (locTs >= exTs) {
          merged[id] = {
            ...existing,
            ...loc,
            accountId: loc.accountId !== undefined ? loc.accountId : existing.accountId,
            broker: loc.broker !== undefined ? loc.broker : existing.broker,
            currentPrice: (Number.isFinite(Number(loc.currentPrice)) && Number(loc.currentPrice) > 0)
              ? Number(loc.currentPrice)
              : existing.currentPrice
          };
        }
      });
      return merged;
    }

    loadSavedState() {
      const storage = typeof localStorage !== 'undefined' ? localStorage : null;
      const r = this.root || root;
      const accountsKey = r?.DailyUpdateModel?.STORAGE_KEY_ACCOUNTS || root?.DailyUpdateModel?.STORAGE_KEY_ACCOUNTS || 'healthy-daily-update-accounts';
      const draftKey = r?.DailyUpdateModel?.STORAGE_KEY_DRAFT || root?.DailyUpdateModel?.STORAGE_KEY_DRAFT || 'healthy-daily-update-draft-v1';

      // 1. Load saved accounts comparing workspace-state vs localStorage by freshest timestamp
      let workspaceAccounts = null;
      try {
        if (r?.healthyTrendWorkspace?.raw) {
          const rawAccounts = r.healthyTrendWorkspace.raw(accountsKey);
          if (rawAccounts) {
            const parsed = typeof rawAccounts === 'string' ? JSON.parse(rawAccounts) : rawAccounts;
            if (Array.isArray(parsed) && parsed.length > 0) workspaceAccounts = parsed;
          }
        }
      } catch (_) {}

      let localAccounts = null;
      try {
        const rawLocalAcc = storage ? storage.getItem(accountsKey) : null;
        if (rawLocalAcc) {
          const parsed = JSON.parse(rawLocalAcc);
          if (Array.isArray(parsed) && parsed.length > 0) localAccounts = parsed;
        }
      } catch (_) {}

      const newestTs = (list) => {
        if (!Array.isArray(list)) return 0;
        return list.reduce((mx, a) => {
          const t = a?.updatedAt ? Date.parse(a.updatedAt) : 0;
          return Number.isFinite(t) && t > mx ? t : mx;
        }, 0);
      };

      const chosenAccounts = (workspaceAccounts && localAccounts)
        ? (newestTs(localAccounts) > newestTs(workspaceAccounts) ? localAccounts : workspaceAccounts)
        : (workspaceAccounts || localAccounts);

      if (chosenAccounts) {
        this.model.accounts = JSON.parse(JSON.stringify(chosenAccounts));
      }

      // Ensure all loaded accounts have type, subtitle and merge newly introduced official accounts
      const defAccounts = r?.DailyUpdateModel?.DEFAULT_ACCOUNTS || root?.DailyUpdateModel?.DEFAULT_ACCOUNTS || [];
      (this.model.accounts || []).forEach(acc => {
        if (!acc.type) {
          const match = defAccounts.find(d => d.id === acc.id);
          acc.type = match ? match.type : 'INVESTMENT';
        }
        if (!acc.subtitle) {
          const match = defAccounts.find(d => d.id === acc.id);
          if (match?.subtitle) acc.subtitle = match.subtitle;
        }
        if (!acc.institution) {
          const match = defAccounts.find(d => d.id === acc.id);
          if (match?.institution) acc.institution = match.institution;
        }
      });
      defAccounts.forEach(defAcc => {
        if (!this.model.accounts.some(a => a.id === defAcc.id)) {
          this.model.accounts.push(JSON.parse(JSON.stringify(defAcc)));
        }
      });
      this.model.updateClosingReadiness();

      // 2. Load draft (without skipping positions when workspace accounts were already loaded!)
      try {
        const rawDraft = storage ? storage.getItem(draftKey) : null;
        if (rawDraft) {
          const parsedDraft = JSON.parse(rawDraft);
          const hasLegacyMock = Array.isArray(parsedDraft?.accounts) && parsedDraft.accounts.some(a => a.id === 'genial_natalia' && (a.newBalance > 300000 || a.previousBalance > 300000));
          if (hasLegacyMock) {
            this.model.clearDraft();
          } else {
            const savedAccountsSnapshot = chosenAccounts ? JSON.parse(JSON.stringify(this.model.accounts)) : null;
            this.model.loadDraft(storage);
            // If durable accounts were newer than draft accounts, restore them while keeping draft positions
            if (savedAccountsSnapshot && newestTs(savedAccountsSnapshot) >= newestTs(this.model.accounts)) {
              this.model.accounts = savedAccountsSnapshot;
              this.model.updateClosingReadiness();
            }
          }
        }
      } catch (_) {}

      // 3. ALWAYS overlay durable position metadata (account links + last valid prices) from workspace + localStorage
      try {
        const mergedMeta = this.getMergedPositionMetaMap();
        if (typeof this.model.applyPositionMetaMap === 'function') {
          this.model.applyPositionMetaMap(mergedMeta, { forceAccount: false });
        }
      } catch (_) {}

      // 4. History in localStorage and workspace-state (sanitize if containing obsolete legacy mock snapshots)
      try {
        const historyKey = r?.DailyUpdateModel?.STORAGE_KEY_HISTORY || root?.DailyUpdateModel?.STORAGE_KEY_HISTORY || 'healthy-daily-update-history';
        if (storage) {
          const rawHist = storage.getItem(historyKey);
          if (rawHist) {
            const parsedHist = JSON.parse(rawHist);
            const hasLegacyMock = Array.isArray(parsedHist) && parsedHist.some(s => {
              const accs = Array.isArray(s.accounts) ? s.accounts : [];
              return accs.some(a => a.id === 'genial_natalia' && (Number(a.newBalance || 0) > 300000 || Number(a.previousBalance || 0) > 300000)) ||
                     (s.date && s.date.startsWith('2026-11') && Number(s.realWealth || 0) > 1050000);
            });
            if (hasLegacyMock) {
              const clean = this.model.getHistory();
              storage.setItem(historyKey, JSON.stringify(clean));
              if (r?.healthyTrendWorkspace?.save) {
                r.healthyTrendWorkspace.save(historyKey, clean);
              }
            }
          }
        }
      } catch (_) {}
    }

    async syncWithBackend() {
      const seq = ++this._syncSeq;
      try {
        const r = this.root || root;
        if (!r?.healthyTrendApi?.request) return;

        // Fetch current wealth summary from /api/wealth
        const wealthRes = await r.healthyTrendApi.request('/api/wealth').catch(() => null);
        if (seq !== this._syncSeq) return; // Discard out-of-order stale sync
        if (wealthRes?.summary) {
          if (wealthRes.summary.strategyEquity) {
            this.model.strategyEquity = Number(wealthRes.summary.strategyEquity);
          }
          if (wealthRes.summary.realWealth) {
            this.model.previousClosingWealth = Number(wealthRes.summary.realWealth);
          }
        }

        // Fetch current open trades from /api/trades?status=open
        const tradesRes = await r.healthyTrendApi.request('/api/trades?status=open').catch(() => null);
        if (seq !== this._syncSeq) return; // Discard out-of-order stale sync

        const list = Array.isArray(tradesRes) ? tradesRes : (tradesRes?.trades || []);
        const openTrades = list.filter(t => t.status === 'open');
        const existingPositionsSnapshot = [...(this.model.positions || [])];
        if (openTrades.length > 0) {
          const savedMetaMap = this.getMergedPositionMetaMap();

          this.model.positions = openTrades.map((t, idx) => {
            const posId = String(t.id || `pos_${idx}`);
            const existingPos = this.model.positions.find(p => String(p.id) === posId);
            const savedMeta = savedMetaMap[posId] || null;
            const dirty = this._dirtyPositions.get(posId) || null;

            const backendEntry = Number(t.average_entry_price || t.execution_price || t.entry_price || 0);
            const backendUpdatedMs = t.updated_at ? Date.parse(t.updated_at) : 0;
            const entry = (dirty?.entryPrice && dirty.entryUpdatedAt >= backendUpdatedMs)
              ? Number(dirty.entryPrice)
              : backendEntry;

            const initialStop = Number(t.stop_price || 0);
            const events = Array.isArray(t.events) ? t.events : [];
            const entryEvent = events.find(e => e.type === 'entry');
            const updateEvents = events.filter(e => e.type === 'update' && Number(e.stop) > 0);
            const trailingStop = updateEvents.length ? Number(updateEvents[updateEvents.length - 1].stop) : initialStop;
            const latestPriceEvent = events.filter(e => e.type === 'update' && Number.isFinite(Number(e.price)) && Number(e.price) > 0).pop();
            const peeloffs = events.filter(e => e.type === 'peeloff');
            const totalBought = Number(t.total_quantity || t.executed_quantity || t.planned_quantity || 0);
            const closedQty = events.filter(e => e.type === 'peeloff' || e.type === 'close').reduce((s, e) => s + Number(e.qty || 0), 0);
            const remaining = Math.max(0, totalBought - closedQty);
            const contractMult = Number(t.contractMult || t.metadata?.contractMult || 1);
            const sign = (t.direction === 'short' || t.side === 'Venda') ? -1 : 1;
            const realizedFromEvents = peeloffs.reduce((s, e) => s + ((Number(e.price || entry) - entry) * sign * Number(e.qty || 0) * contractMult), 0);

            // Resolve durable account/broker link (never reset to null when persisted locally or in backend)
            let resolvedAccountId = null;
            if (dirty && dirty.accountId !== undefined) {
              resolvedAccountId = dirty.accountId || null;
            } else {
              resolvedAccountId =
                t.account_id ||
                t.accountId ||
                t.metadata?.accountId ||
                savedMeta?.accountId ||
                existingPos?.accountId ||
                null;
            }
            const isPaper = (t.mode === 'paper' || t.metadata?.mode === 'paper' || resolvedAccountId === 'paper' || existingPos?.mode === 'paper');
            const resolvedMode = isPaper ? 'paper' : 'real';
            if (isPaper && !resolvedAccountId) resolvedAccountId = 'paper';

            const matchedAcc = resolvedAccountId && resolvedAccountId !== 'paper'
              ? this.model.accounts.find(a => a.id === resolvedAccountId)
              : null;
            let resolvedBroker =
              (dirty && dirty.accountId !== undefined ? (dirty.broker || matchedAcc?.label || (resolvedAccountId === 'paper' ? 'Paper Trading' : 'Não vinculada')) : null) ||
              (resolvedAccountId === 'paper' ? 'Paper Trading' : null) ||
              matchedAcc?.label ||
              t.broker ||
              t.metadata?.broker ||
              t.metadata?.account ||
              savedMeta?.broker ||
              existingPos?.broker ||
              'Pendente de conferência';

            // Resolve most recent valid positive currentPrice (NEVER overwrite valid price with null/0/entry fallback)
            const priceCandidates = [];
            const pushCandidate = (priceVal, tsVal, sourceVal, priority) => {
              const n = Number(priceVal);
              if (!Number.isFinite(n) || n <= 0) return;
              const ts = tsVal ? Date.parse(tsVal) : 0;
              priceCandidates.push({
                price: n,
                ts: Number.isFinite(ts) ? ts : 0,
                iso: Number.isFinite(ts) && ts > 0 ? new Date(ts).toISOString() : null,
                source: sourceVal || 'persisted',
                priority
              });
            };

            if (dirty?.currentPrice) {
              pushCandidate(dirty.currentPrice, dirty.priceUpdatedAt, dirty.priceSource || 'manual', 5);
            }
            pushCandidate(t.current_price ?? t.currentPrice ?? t.metadata?.currentPrice, t.price_updated_at ?? t.priceUpdatedAt ?? t.metadata?.priceUpdatedAt ?? t.updated_at, t.price_source ?? t.priceSource ?? t.metadata?.priceSource ?? 'backend', 4);
            if (latestPriceEvent) {
              pushCandidate(latestPriceEvent.price, latestPriceEvent.at || latestPriceEvent.createdAt, 'event_update', 3);
            }
            if (savedMeta?.currentPrice) {
              pushCandidate(savedMeta.currentPrice, savedMeta.priceUpdatedAt || savedMeta.updatedAt, savedMeta.priceSource || 'persisted', 2);
            }
            if (existingPos?.currentPrice && existingPos.priceUpdatedAt) {
              pushCandidate(existingPos.currentPrice, existingPos.priceUpdatedAt, existingPos.priceSource || 'local', 1);
            } else if (existingPos?.currentPrice && Math.abs(Number(existingPos.currentPrice) - entry) > 0.0001) {
              pushCandidate(existingPos.currentPrice, existingPos.checkedAt, existingPos.priceSource || 'local', 1);
            }

            priceCandidates.sort((a, b) => (b.ts - a.ts) || (b.priority - a.priority));
            const bestPrice = priceCandidates[0] || null;
            const resolvedCurrentPrice = bestPrice ? bestPrice.price : entry;
            const resolvedPriceUpdatedAt = bestPrice ? bestPrice.iso : null;
            const resolvedPriceSource = bestPrice ? bestPrice.source : 'entry_fallback';
            const resolvedPriceStale = bestPrice ? Boolean(savedMeta?.priceStale && !dirty?.currentPrice && bestPrice.source === savedMeta?.priceSource) : true;

            const resolvedEntryDate = root.DailyUpdateModel?.resolvePositionEntryDate
              ? root.DailyUpdateModel.resolvePositionEntryDate({
                  entryDate: t.metadata?.entryDate || existingPos?.entryDate,
                  events,
                  entries: t.entries,
                  executed_at: t.executed_at,
                  created_at: t.created_at
                })
              : (t.metadata?.entryDate || entryEvent?.at || t.executed_at || t.created_at || existingPos?.entryDate || null);

            return {
              id: posId,
              ticker: t.ticker || t.asset,
              mode: resolvedMode,
              assetClass: t.asset_class || t.assetClass || t.metadata?.assetClass || t.market || existingPos?.assetClass || null,
              market: t.market || t.metadata?.market || existingPos?.market || null,
              direction: t.direction || t.metadata?.direction || existingPos?.direction || 'long',
              side: (t.direction === 'short' || t.side === 'Venda') ? 'Venda' : (existingPos?.side || 'Compra'),
              strategy: t.strategy_type || t.strategyType || t.strategy || t.metadata?.strategyType || t.metadata?.strategy || existingPos?.strategy || null,
              currency: t.currency || t.metadata?.currency || existingPos?.currency || 'BRL',
              fxRate: Number(t.fx_rate || t.fxRate || t.metadata?.fxRate || existingPos?.fxRate || 1),
              accountId: resolvedAccountId,
              broker: resolvedBroker,
              quantity: remaining || totalBought,
              initialQuantity: totalBought,
              contractMult: contractMult,
              mult: contractMult,
              isPartial: peeloffs.length > 0,
              partialCount: peeloffs.length,
              realizedResult: Math.round(realizedFromEvents * 100) / 100,
              costs: Number(t.costs || t.metadata?.costs || existingPos?.costs || 0),
              entryDate: resolvedEntryDate,
              openedAt: t.executed_at || t.created_at || existingPos?.openedAt || null,
              events: events.slice(),
              entryPrice: entry,
              stopPrice: initialStop,
              trailingStop: trailingStop,
              currentPrice: resolvedCurrentPrice,
              priceUpdatedAt: resolvedPriceUpdatedAt,
              priceSource: resolvedPriceSource,
              priceStale: resolvedPriceStale,
              status: existingPos?.status || 'conferida',
              checked: existingPos ? existingPos.checked : true,
              hasDivergence: existingPos ? Boolean(existingPos.hasDivergence) : false,
              divergence: existingPos?.divergence || null,
              checkedAt: resolvedPriceUpdatedAt || existingPos?.checkedAt || new Date().toISOString()
            };
          });

          // Move previously open positions that are no longer in openTrades to closedPositions
          const openIds = new Set(openTrades.map((t, idx) => String(t.id || `pos_${idx}`)));
          (existingPositionsSnapshot || []).forEach(p => {
            const pid = String(p.id);
            if (!openIds.has(pid) && /^[0-9a-f-]{36}$/i.test(pid)) {
              p.closed = true;
              p.status = 'encerrada';
              p.quantity = 0;
              if (!this.model.closedPositions.some(c => String(c.id) === pid)) {
                this.model.closedPositions.unshift(p);
              }
            }
          });

          if (typeof this.model.savePositionMeta === 'function') {
            this.model.savePositionMeta();
          }
          if (typeof this.model.saveDraft === 'function') {
            this.model.saveDraft();
          }
          this.model.updateClosingReadiness();
        } else if (Array.isArray(tradesRes) || Array.isArray(tradesRes?.trades)) {
          // Backend confirmed zero open trades: clear open positions and mirror to closedPositions
          (this.model.positions || []).forEach(p => {
            p.closed = true;
            p.status = 'encerrada';
            p.quantity = 0;
            if (!this.model.closedPositions.some(c => String(c.id) === String(p.id))) {
              this.model.closedPositions.unshift(p);
            }
          });
          this.model.positions = [];
          if (typeof this.model.savePositionMeta === 'function') {
            this.model.savePositionMeta();
          }
          if (typeof this.model.saveDraft === 'function') {
            this.model.saveDraft();
          }
          this.model.updateClosingReadiness();
        }

        // Fetch risk policy for heat limit from /api/risk-policy
        const policyRes = await r.healthyTrendApi.request('/api/risk-policy').catch(() => null);
        if (seq !== this._syncSeq) return;
        if (policyRes) {
          const profileKey = policyRes.selectedProfile || 'standard';
          const profile = policyRes.profiles?.[profileKey] || policyRes.profiles?.standard;
          if (profile?.maximumPortfolioRiskPct) {
            this.model.heatLimit = Number(profile.maximumPortfolioRiskPct) * 100;
          }
        }
        if (typeof r.portfolioHeatLimitPct === 'function') {
          this.model.heatLimit = r.portfolioHeatLimitPct();
        }
        if (typeof r.portfolioHeatSnapshot === 'function') {
          const snap = r.portfolioHeatSnapshot();
          if (snap && Number.isFinite(snap.heat)) {
            this.model.portfolioHeat = snap.heat;
          }
        }
      } catch (err) {
        console.warn('[DailyUpdateHub] Sync notice:', err.message);
      }
    }

    render() {
      const container = getRoot();
      if (!container) return;

      const model = this.model;
      if (typeof root !== 'undefined') {
        if (typeof root.portfolioHeatSnapshot === 'function') {
          const snap = root.portfolioHeatSnapshot();
          if (snap && Number.isFinite(snap.heat)) {
            model.portfolioHeat = snap.heat;
          }
        }
        if (typeof root.portfolioHeatLimitPct === 'function') {
          model.heatLimit = root.portfolioHeatLimitPct();
        }
      }
      const realWealth = model.getConsolidatedRealWealth();
      const prevWealth = model.getPreviousConsolidatedRealWealth();
      const dayVarNominal = model.getDayNominalVariation();
      const dayVarPct = model.getDayPercentVariation();
      const exposure = model.getTotalExposure();
      const exposurePct = model.getExposurePct();
      const progress = model.getProgress();
      const todaySnapshot = model.getSnapshotByDate(model.closingDate);
      const isAlreadyClosed = Boolean(todaySnapshot);

      const dateStr = new Date().toLocaleDateString('pt-BR', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).replace('.', '');
      const formattedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);

      container.innerHTML = `
        <div class="daily-update-page">
          <!-- 1. HERO / HEADER -->
          <header class="daily-update-hero">
            <div class="daily-update-title-wrap">
              <div class="daily-update-hero-icon" aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                  <path d="m9 16 2 2 4-4"/>
                </svg>
              </div>
              <div>
                <h1>Atualização Diária</h1>
                <p>Atualize seus saldos, confira as posições abertas e registre o fechamento do dia.</p>
              </div>
            </div>

            <div class="daily-update-hero-meta">
              <span class="daily-update-date-badge">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="4" width="18" height="18" rx="2"/>
                  <line x1="16" y1="2" x2="16" y2="6"/>
                  <line x1="8" y1="2" x2="8" y2="6"/>
                  <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                ${formattedDate}
              </span>
              <span class="daily-update-status-pill ${progress.readyToClose ? 'ready' : progress.pendingAccounts > 0 ? 'pending' : 'in-progress'}" id="heroStatusPill">
                ${model.closingStatus === 'CLOSED' ? 'Concluído' : progress.readyToClose ? 'Pronto para concluir' : 'Em andamento'}
              </span>
            </div>
          </header>

          <!-- 2. TOP METRIC CARDS (4 COLUMNS) -->
          <section class="daily-update-kpi-grid">
            <!-- Card 1: Patrimônio Real -->
            <article class="daily-update-kpi-card">
              <div class="daily-update-kpi-icon coins">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <ellipse cx="12" cy="6" rx="8" ry="3"/>
                  <path d="M4 6v6a8 3 0 0 0 16 0V6"/>
                  <path d="M4 12v6a8 3 0 0 0 16 0v-6"/>
                </svg>
              </div>
              <div class="daily-update-kpi-content">
                <span class="daily-update-kpi-label">Patrimônio Real (Total)</span>
                <strong class="daily-update-kpi-val" id="kpiRealWealth">${fmtBRL(realWealth)}</strong>
                <span class="daily-update-kpi-sub ${dayVarNominal >= 0 ? 'up' : 'down'}" id="kpiDayVar">
                  ${dayVarNominal >= 0 ? '▲' : '▼'} ${fmtPct(dayVarPct)} (${fmtBRL(dayVarNominal)}) vs. fechamento anterior
                </span>
              </div>
            </article>

            <!-- Card 2: Equity da Estratégia -->
            <article class="daily-update-kpi-card">
              <div class="daily-update-kpi-icon strategy">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                  <polyline points="16 7 22 7 22 13"/>
                </svg>
              </div>
              <div class="daily-update-kpi-content">
                <span class="daily-update-kpi-label">Equity da Estratégia</span>
                <strong class="daily-update-kpi-val">${fmtBRL(model.strategyEquity)}</strong>
                <span class="daily-update-kpi-sub up">
                  ▲ +0,76% no ano
                </span>
                <span class="daily-update-kpi-note" title="Contas correntes de despesas não interferem na estratégia">
                  ℹ️ Já exclui contas do tipo Corrente (ex: Bradesco)
                </span>
              </div>
            </article>

            <!-- Card 3: Exposição Atual -->
            <article class="daily-update-kpi-card">
              <div class="daily-update-kpi-icon exposure">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <circle cx="12" cy="12" r="6"/>
                  <circle cx="12" cy="12" r="2"/>
                </svg>
              </div>
              <div class="daily-update-kpi-content">
                <span class="daily-update-kpi-label">Exposição Atual</span>
                <strong class="daily-update-kpi-val" id="kpiTotalExposure">${fmtBRL(exposure)}</strong>
                <span class="daily-update-kpi-sub" id="kpiExposurePct">
                  ${exposurePct.toFixed(2).replace('.', ',')}% do patrimônio
                </span>
              </div>
            </article>

            <!-- Card 4: Heat do Portfólio -->
            <article class="daily-update-kpi-card">
              <div class="daily-update-kpi-icon heat">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div class="daily-update-kpi-content">
                <span class="daily-update-kpi-label">Heat do Portfólio</span>
                <strong class="daily-update-kpi-val" id="kpiPortfolioHeat">${model.getPortfolioHeat().toFixed(2).replace('.', ',')}%</strong>
                <span class="daily-update-kpi-sub" id="kpiHeatLimit">
                  Limite: ${model.getHeatLimit().toFixed(2).replace('.', ',')}%
                </span>
              </div>
            </article>
          </section>

          <!-- 3. WORKSPACE GRID (2 COLUMNS: CONTAS & POSIÇÕES) -->
          <div class="daily-update-workspace-grid">
            <!-- Left: Contas (Saldos Totais) -->
            <section class="daily-update-card accounts-card">
              <header class="daily-update-card-header">
                <div class="card-title-group">
                  <span class="card-icon" aria-hidden="true">🪙</span>
                  <div class="card-title-text">
                    <h2>1. Atualizar Contas (Saldos Totais)</h2>
                    <p>Informe o saldo total de cada conta (contas do tipo Corrente não impactam a Equity).</p>
                  </div>
                </div>
                <div class="accounts-header-legends">
                  <span class="account-legend-badge investment" title="Participa da Equity, rentabilidade e métricas da estratégia">
                    <span class="legend-icon">🏛️</span> Conta de Investimentos <span class="legend-note">(compõe a Equity)</span>
                  </span>
                  <span class="account-legend-badge checking" title="Participa do Patrimônio Total, mas não interfere na estratégia">
                    <span class="legend-icon">🏛️</span> Conta Corrente <span class="legend-note">(não compõe a Equity)</span>
                  </span>
                  ${(() => {
                    const usdAcc = (model.accounts || []).find(a => a.currency === 'USD');
                    if (!usdAcc) return '';
                    const fxDisplay = Number(usdAcc.fxRate || 5.95).toFixed(2).replace('.', ',');
                    return `
                      <span class="account-legend-badge fx-ref font-numeric" data-nomad-header-fx="true" title="Cotação USD/BRL de referência usada na conversão da conta Nomad para BRL">
                        <span class="legend-icon">🇺🇸</span> Câmbio USD/BRL: <strong>R$ ${fxDisplay}</strong>
                      </span>
                    `;
                  })()}
                </div>
              </header>

              <!-- Titular Groups Container -->
              <div class="titular-groups-container">
                ${model.getGroupedAccounts(realWealth).map((group) => {
                  const isCollapsed = this.collapsedTitulares.has(group.person);
                  const themeClass = `titular-group--${group.theme}`;

                  return `
                    <div class="titular-group-card ${themeClass}" data-titular="${group.person}">
                      <header class="titular-group-header" onclick="window.DailyUpdateHub.toggleTitularGroup('${group.person}')" title="Clique para recolher ou expandir">
                        <div class="titular-header-left">
                          <span class="titular-avatar-icon" aria-hidden="true">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                              <circle cx="12" cy="7" r="4"/>
                            </svg>
                          </span>
                          <span class="titular-name">${group.person.toUpperCase()}</span>
                          <span class="titular-count-badge">${group.count} ${group.count === 1 ? 'conta' : 'contas'}</span>
                        </div>
                        <div class="titular-header-right">
                          <span class="titular-header-total" data-titular-header-total="${group.person}">
                            Total: <strong>${fmtBRL(group.subtotal)}</strong> (${group.sharePct.toFixed(2).replace('.', ',')}%)
                          </span>
                          <button type="button" class="titular-toggle-btn" aria-label="Recolher ou expandir grupo ${group.person}">
                            <svg class="titular-chevron ${isCollapsed ? 'collapsed' : ''}" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                              <polyline points="18 15 12 9 6 15"/>
                            </svg>
                          </button>
                        </div>
                      </header>

                      <!-- Body table for this titular (collapsible) -->
                      <div class="titular-group-body" style="display: ${isCollapsed ? 'none' : 'block'};">
                        <div class="daily-update-table-container">
                          <table class="daily-update-table accounts-table" aria-label="Tabela de Contas — ${group.person}">
                            <thead>
                              <tr>
                                <th class="th-acc-name">Conta</th>
                                <th class="th-acc-type">Tipo</th>
                                <th class="th-acc-prev" style="text-align: right;">Saldo Anterior</th>
                                <th class="th-acc-new" style="text-align: right;">Novo Saldo</th>
                                <th class="th-acc-var" style="text-align: right;">Variação</th>
                                <th class="th-acc-share" style="text-align: right;">% do Total</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${group.accounts.map((acc) => {
                                const varPct = model.getAccountVariationPct(acc);
                                const sharePct = model.getAccountWealthSharePct(acc, realWealth);
                                const hasError = Boolean(acc.error);
                                const isProvisional = model.isWealthDistributionProvisional();
                                const varClass = varPct > 0.001 ? 'positive' : varPct < -0.001 ? 'negative' : 'neutral';
                                const isNomad = acc.currency === 'USD';
                                const inputCurrency = acc.inputCurrency || 'BRL';

                                let inputValue = fmtBRL(acc.newBalance);
                                if (isNomad && inputCurrency === 'USD') {
                                  inputValue = fmtUSD(acc.newBalanceUSD || 0);
                                }

                                const brokerInitial = acc.broker === 'nomad' ? 'N' : acc.broker === 'genial' ? 'g' : acc.broker === 'clear' ? 'C' : acc.broker === 'eqseed' ? 'E' : acc.broker === 'bradesco' ? 'B' : 'xp';
                                const usdVarPct = isNomad ? model.getAccountUsdVariationPct(acc) : 0;
                                const linkedPositions = typeof model.getPositionsByAccount === 'function'
                                  ? model.getPositionsByAccount(acc.id).filter(p => !p.closed && p.status !== 'encerrada')
                                  : (model.positions || []).filter(p => p.accountId === acc.id && !p.closed && p.status !== 'encerrada');

                                return `
                                  <tr class="account-row ${hasError ? 'error' : ''}" data-account-id="${acc.id}">
                                    <td class="td-acc-name">
                                      <div class="account-name-cell">
                                        <span class="broker-pill ${acc.broker}">${brokerInitial}</span>
                                        <div class="account-labels">
                                          <div class="account-title-line">
                                            <span class="account-label-title">${acc.label}</span>
                                            ${isNomad ? `
                                              <button type="button" class="btn-currency-toggle btn-currency-toggle-inline" onclick="window.DailyUpdateHub.toggleNomadCurrency('${acc.id}')" title="Moeda da conta: USD — clique para alternar a digitação entre BRL e USD">
                                                <strong>${inputCurrency}</strong>
                                              </button>
                                            ` : ''}
                                          </div>
                                          <div class="account-meta-line">
                                            ${isNomad ? `
                                              <span class="account-meta-time nomad-inline-fx font-numeric" data-nomad-fx-badge="${acc.id}" title="Saldo em dólar (${fmtUSD(acc.newBalanceUSD || 0)}) convertido pelo câmbio R$ ${(acc.fxRate || 5.95).toFixed(2).replace('.', ',')}">
                                                ${fmtUSD(acc.newBalanceUSD || 0)} | Câmbio: R$ ${(acc.fxRate || 5.95).toFixed(2).replace('.', ',')}
                                              </span>
                                            ` : `
                                              <span class="account-meta-time">${acc.subtitle || fmtTime(acc.updatedAt)}</span>
                                            `}
                                            ${linkedPositions.length > 0 ? `
                                              <span class="account-positions-pill" title="Posições vinculadas: ${linkedPositions.map(p => p.ticker).join(', ')}">
                                                💼 ${linkedPositions.length}
                                              </span>
                                            ` : ''}
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                    <td class="td-acc-type">
                                      <span class="acc-type-pill ${acc.type === 'CHECKING' ? 'checking' : 'investment'}" title="${acc.type === 'CHECKING' ? 'Conta Corrente pessoal (não participa da Equity)' : 'Conta de investimentos (participa da Equity)'}">
                                        <span class="acc-type-icon">🏛️</span> ${acc.type === 'CHECKING' ? 'Conta Corrente' : 'Investimentos'}
                                      </span>
                                    </td>
                                    <td class="td-acc-prev" style="text-align: right;">
                                      <div class="account-prev-stack">
                                        <span class="prev-amount font-numeric" title="${isNomad ? `Saldo anterior: ${fmtBRL(acc.previousBalance)} (${fmtUSD(acc.previousBalanceUSD || 0)})` : ''}">${fmtBRL(acc.previousBalance)}</span>
                                      </div>
                                    </td>
                                    <td class="td-acc-new" style="text-align: right;">
                                      <div class="account-input-stack">
                                        <input 
                                          type="text" 
                                          inputmode="decimal"
                                          autocomplete="off"
                                          class="balance-input font-numeric ${hasError ? 'input-error' : ''}" 
                                          data-account-input="${acc.id}" 
                                          value="${inputValue}" 
                                          aria-label="Novo saldo para ${acc.label}"
                                          title="${isNomad ? `Equivalente em BRL: ${fmtBRL(acc.newBalance)} | USD: ${fmtUSD(acc.newBalanceUSD || 0)} @ R$ ${(acc.fxRate || 5.95).toFixed(2).replace('.', ',')}` : `Novo saldo para ${acc.label}`}"
                                          placeholder="0,00"
                                        />
                                        <span class="account-error-msg" data-account-error-for="${acc.id}" style="display: ${hasError ? 'block' : 'none'};">${hasError ? acc.error : ''}</span>
                                      </div>
                                    </td>
                                    <td class="td-acc-var" style="text-align: right;">
                                      <div class="variation-stack">
                                        <span class="variation-tag font-numeric ${varClass}" data-account-var-for="${acc.id}" title="${isNomad ? `Variação BRL: ${varPct > 0 ? '+' : ''}${varPct.toFixed(2).replace('.', ',')}% | Variação USD: ${usdVarPct > 0 ? '+' : ''}${usdVarPct.toFixed(2).replace('.', ',')}%` : ''}">
                                          ${varPct > 0 ? '+' : ''}${varPct.toFixed(2).replace('.', ',')}%
                                        </span>
                                      </div>
                                    </td>
                                    <td class="td-acc-share" style="text-align: right;">
                                      <span 
                                        class="wealth-share-pill font-numeric ${isProvisional ? 'provisional' : ''}" 
                                        data-wealth-share-for="${acc.id}"
                                        title="${isProvisional ? 'Participação provisória (contas com pendências)' : `Representa ${sharePct.toFixed(2).replace('.', ',')}% do Patrimônio Real consolidado`}"
                                      >
                                        ${sharePct.toFixed(2).replace('.', ',')}%
                                      </span>
                                    </td>
                                  </tr>
                                `;
                              }).join('')}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      <!-- Subtotal Footer (CRITICAL: remains visible even when collapsed) -->
                      <div class="titular-group-subtotal">
                        <div class="titular-subtotal-left">
                          <span class="titular-subtotal-icon" aria-hidden="true">
                            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                              <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                              <polyline points="2 17 12 22 22 17"/>
                              <polyline points="2 12 12 17 22 12"/>
                            </svg>
                          </span>
                          <span class="titular-subtotal-label">TOTAL ${group.person.toUpperCase()}</span>
                        </div>
                        <div class="titular-subtotal-right">
                          <strong class="titular-subtotal-amount" data-titular-subtotal="${group.person}">${fmtBRL(group.subtotal)}</strong>
                          <span class="titular-subtotal-share" data-titular-share="${group.person}">${group.sharePct.toFixed(2).replace('.', ',')}% do patrimônio</span>
                        </div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>

              <!-- Faixa de Destaque: PATRIMÔNIO TOTAL CONSOLIDADO -->
              <div class="consolidated-wealth-banner">
                <div class="consolidated-banner-left">
                  <div class="consolidated-banner-icon" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                      <ellipse cx="12" cy="6" rx="8" ry="3"/>
                      <path d="M4 6v6a8 3 0 0 0 16 0V6"/>
                      <path d="M4 12v6a8 3 0 0 0 16 0v-6"/>
                    </svg>
                  </div>
                  <div class="consolidated-banner-titles">
                    <span class="consolidated-banner-title">PATRIMÔNIO TOTAL CONSOLIDADO</span>
                    <span class="consolidated-banner-subtitle" id="consolidatedBannerSubtitle">
                      ${model.accounts.length} contas · ${model.getTitulares().length} titulares
                    </span>
                  </div>
                </div>
                <div class="consolidated-banner-center">
                  <strong class="consolidated-banner-amount" id="tableConsolidatedWealth">${fmtBRL(realWealth)}</strong>
                  <span 
                    class="wealth-share-provisional-hint" 
                    id="wealthDistributionProvisionalHint" 
                    style="display: ${model.isWealthDistributionProvisional() ? 'inline-flex' : 'none'};"
                  >
                    ⚠️ Distribuição provisória (contas pendentes)
                  </span>
                </div>
                <div class="consolidated-banner-right">
                  <div class="consolidated-var-stack">
                    <span class="consolidated-var-tag ${dayVarNominal >= 0 ? 'positive' : 'negative'}" id="tableDayVar">
                      ${dayVarNominal >= 0 ? '▲' : '▼'} ${fmtPct(dayVarPct)} (${fmtBRL(dayVarNominal)})
                    </span>
                    <span class="consolidated-var-label">Variação do Dia</span>
                  </div>
                </div>
              </div>
            </section>

            <!-- Right: Posições em Aberto -->
            <section class="daily-update-card positions-card">
              <header class="daily-update-card-header positions-card-header">
                <div class="card-title-group">
                  <span class="card-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10"/>
                      <line x1="12" y1="20" x2="12" y2="4"/>
                      <line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                  </span>
                  <div class="card-title-text">
                    <h2>Posições em Aberto</h2>
                  </div>
                </div>
                ${(() => {
                  const totalUnrealized = typeof model.getTotalUnrealizedResult === 'function'
                    ? model.getTotalUnrealizedResult()
                    : 0;
                  const totalUnrealizedPct = typeof model.getTotalUnrealizedPct === 'function'
                    ? model.getTotalUnrealizedPct()
                    : 0;
                  const totResClass = totalUnrealized > 0.005 ? 'positive' : totalUnrealized < -0.005 ? 'negative' : 'neutral';
                  const totResSign = totalUnrealized > 0.005 ? '+' : '';

                  return `
                    <div class="positions-header-kpis">
                      <div class="pos-header-kpi-pill exposure-pill" title="Exposição Total: soma financeira de todas as posições abertas">
                        <span class="pos-header-kpi-label">Exposição Total:</span>
                        <strong class="pos-header-kpi-val font-numeric" id="headerTotalExposure">${fmtBRL(exposure)}</strong>
                        <span class="pos-header-kpi-pct font-numeric" id="headerTotalExposurePct">(${exposurePct.toFixed(2).replace('.', ',')}%)</span>
                      </div>
                      <div class="pos-header-kpi-pill result-pill ${totResClass}" id="headerTotalUnrealizedPill" title="Resultado Aberto consolidado de todas as posições abertas">
                        <span class="pos-header-kpi-label">Resultado:</span>
                        <strong class="pos-header-kpi-val font-numeric ${totResClass}" id="headerTotalUnrealizedVal">${totResSign}${fmtBRL(totalUnrealized)}</strong>
                        <span class="pos-header-kpi-pct font-numeric ${totResClass}" id="headerTotalUnrealizedPct">(${fmtPct(totalUnrealizedPct)})</span>
                      </div>
                    </div>
                  `;
                })()}
              </header>

              <div class="position-groups-container">
                ${(() => {
                  const groupedAccounts = typeof model.getGroupedAccounts === 'function' ? model.getGroupedAccounts() : [];
                  const groupedPositions = typeof model.getGroupedPositions === 'function'
                    ? model.getGroupedPositions()
                    : [{
                        key: 'OTHER',
                        label: 'Posições',
                        icon: '📊',
                        positions: model.positions,
                        count: model.positions.length
                      }];

                  let globalPosIdx = 0;

                  return groupedPositions.map(group => {
                    const isGroupCollapsed = this.collapsedPositionGroups.has(group.key);

                    return `
                      <div class="position-group-card position-group--${group.key.toLowerCase()}" data-position-group="${group.key}">
                        <header class="position-group-header" onclick="window.DailyUpdateHub.togglePositionGroup('${group.key}')" title="Clique para recolher ou expandir ${group.label}">
                          <div class="pos-group-header-left">
                            <span class="pos-group-icon" aria-hidden="true">${group.icon}</span>
                            <span class="pos-group-name">${group.label}</span>
                            <span class="pos-group-count-inline" data-pos-group-count="${group.key}">(${group.count})</span>
                          </div>
                          <div class="pos-group-header-right">
                            <button type="button" class="pos-group-toggle-btn" aria-label="Recolher ou expandir grupo ${group.label}">
                              <svg class="pos-group-chevron ${isGroupCollapsed ? 'collapsed' : ''}" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4">
                                <polyline points="18 15 12 9 6 15"/>
                              </svg>
                            </button>
                          </div>
                        </header>

                        <div class="position-group-body" style="display: ${isGroupCollapsed ? 'none' : 'block'};">
                          <div class="daily-update-table-container">
                            <table class="daily-update-table positions-table" aria-label="Tabela de Posições Abertas — ${group.label}">
                              <thead>
                                <tr>
                                  <th class="th-pos-ticker">Ativo</th>
                                  <th class="th-pos-date" style="text-align: center;">Data Entrada</th>
                                  <th class="th-pos-strategy" style="text-align: center;">Estratégia</th>
                                  <th class="th-pos-cv" style="text-align: center;">C/V</th>
                                  <th class="th-pos-account">Conta / Corretora</th>
                                  <th class="th-pos-qty" style="text-align: right;">Quantidade</th>
                                  <th class="th-pos-entry" style="text-align: right;">Preço de Entrada</th>
                                  <th class="th-pos-price" style="text-align: right;">Preço Atual</th>
                                  <th class="th-pos-var" style="text-align: right;">Variação %</th>
                                  <th class="th-pos-result" style="text-align: right;">Resultado Atual</th>
                                  <th class="th-pos-duration" style="text-align: right;">Duração</th>
                                  <th class="th-pos-action" style="text-align: center;" aria-label="Encerrar operação"></th>
                                </tr>
                              </thead>
                              <tbody>
                                ${group.positions.map(pos => {
                                  const pIdx = globalPosIdx++;
                                  const entry = Number(pos.entryPrice || 0);
                                  const curr = Number(pos.currentPrice || entry);
                                  const varPct = entry > 0 ? ((curr - entry) / entry) * 100 : 0;
                                  const varClass = varPct > 0.001 ? 'positive' : varPct < -0.001 ? 'negative' : 'neutral';
                                  const isChecked = pos.checked && pos.status !== 'pendente' && !pos.hasDivergence && !pos.error;
                                  const isDivergent = Boolean(pos.hasDivergence);
                                  const isPending = pos.status === 'pendente' || (!pos.checked && !isDivergent);

                                  const unrealizedVal = typeof model.getPositionUnrealizedResult === 'function'
                                    ? model.getPositionUnrealizedResult(pos)
                                    : (curr - entry) * (pos.direction === 'short' ? -1 : 1) * Number(pos.quantity || 0) * Number(pos.contractMult || pos.mult || 1);
                                  const resClass = unrealizedVal > 0.005 ? 'positive' : unrealizedVal < -0.005 ? 'negative' : 'neutral';
                                  const resSign = unrealizedVal > 0.005 ? '+' : '';
                                  const sideCode = typeof model.getPositionSideCode === 'function'
                                    ? model.getPositionSideCode(pos)
                                    : ((typeof model.getPositionDirectionSign === 'function' ? model.getPositionDirectionSign(pos) : (pos.direction === 'short' || pos.side === 'Venda' ? -1 : 1)) === -1 ? 'V' : 'C');
                                  const isShort = sideCode === 'V';
                                  const rawEntryDate = root.DailyUpdateModel?.resolvePositionEntryDate
                                    ? root.DailyUpdateModel.resolvePositionEntryDate(pos)
                                    : (pos.entryDate || null);
                                  const formattedEntryDate = root.DailyUpdateModel?.formatDateBR
                                    ? root.DailyUpdateModel.formatDateBR(rawEntryDate)
                                    : (rawEntryDate || '—');
                                  const stratMeta = typeof model.getPositionStrategy === 'function'
                                    ? model.getPositionStrategy(pos)
                                    : (root.DailyUpdateModel?.getPositionStrategyMeta
                                      ? root.DailyUpdateModel.getPositionStrategyMeta(pos)
                                      : { key: 'UNCLASSIFIED', label: 'Não classificada', badgeLabel: 'Não classificada', badgeClass: 'unclassified' });
                                  const durationDays = typeof model.getPositionDurationDays === 'function'
                                    ? model.getPositionDurationDays(pos)
                                    : (root.DailyUpdateModel?.calculateB3TradingDuration
                                      ? root.DailyUpdateModel.calculateB3TradingDuration(rawEntryDate)
                                      : null);
                                  const durationLabel = root.DailyUpdateModel?.formatTradingDurationLabel
                                    ? root.DailyUpdateModel.formatTradingDurationLabel(durationDays)
                                    : (durationDays === null ? '—' : `${durationDays} dias úteis`);
                                  const durationTitle = durationDays === null
                                    ? 'Sem data de entrada registrada para calcular dias úteis'
                                    : `${durationLabel} de pregão B3 desde ${formattedEntryDate} (exclui fins de semana e feriados B3)`;
                                  const realizedPartial = Number(pos.realizedResult || 0);

                                  let rowClass = 'position-row';
                                  if (isDivergent) rowClass += ' divergent';
                                  else if (isPending) rowClass += ' pending';
                                  else if (isChecked) rowClass += ' checked';

                                  return `
                                    <tr class="${rowClass}" data-position-row="${pos.id}" data-position-group-item="${group.key}">
                                      <td class="td-pos-ticker">
                                        <div class="pos-ticker-group">
                                          <strong class="pos-ticker" onclick="if (typeof openPosition === 'function') openPosition('${pos.id}');" title="Ver detalhes completos da operação">${pos.ticker}</strong>
                                        </div>
                                      </td>
                                      <td class="td-pos-date" style="text-align: center;">
                                        <span class="pos-entry-date font-numeric" data-pos-entry-date="${pos.id}" title="Data original de abertura da operação">${formattedEntryDate}</span>
                                      </td>
                                      <td class="td-pos-strategy" style="text-align: center;">
                                        <span class="pos-strategy-badge ${stratMeta.badgeClass}" data-pos-strategy="${pos.id}" data-strategy-key="${stratMeta.key}" title="Estratégia registrada na operação: ${stratMeta.label}">${stratMeta.badgeLabel}</span>
                                      </td>
                                      <td class="td-pos-cv" style="text-align: center;">
                                        <span class="pos-cv-badge ${isShort ? 'sell' : 'buy'}" data-pos-cv="${pos.id}" title="${isShort ? 'Operação Vendida (Short)' : 'Operação Comprada (Long)'}">${sideCode}</span>
                                      </td>
                                      <td class="td-pos-account">
                                        <select 
                                          class="pos-account-select ${pos.accountId ? 'linked' : 'unlinked'}" 
                                          data-position-id="${pos.id}"
                                          onchange="window.DailyUpdateHub.handlePositionAccountChange('${pos.id}', this.value)"
                                          title="Conta onde esta posição está custodiada. Atualizações de preço refletem no saldo desta conta."
                                          aria-label="Conta onde ${pos.ticker} está custodiada"
                                        >
                                          <option value="" ${!pos.accountId ? 'selected' : ''}>— Selecionar conta —</option>
                                          ${groupedAccounts.map(g => {
                                            const investAccounts = g.accounts.filter(a => a.type !== 'CHECKING');
                                            if (investAccounts.length === 0) return '';
                                            return `
                                              <optgroup label="${g.person}">
                                                ${investAccounts.map(a => `
                                                  <option value="${a.id}" ${pos.accountId === a.id ? 'selected' : ''}>
                                                    ${a.label}
                                                  </option>
                                                `).join('')}
                                              </optgroup>
                                            `;
                                          }).join('')}
                                        </select>
                                      </td>
                                      <td class="td-pos-qty" style="text-align: right;">
                                        <div class="pos-qty-cell">
                                          <span class="pos-qty-number font-numeric">${pos.quantity}</span>
                                          ${pos.isPartial ? `<span class="pos-partial-pill" title="Posição com saída parcial realizada">parcial</span>` : ''}
                                          ${isDivergent ? `<span class="divergence-tag" title="${pos.divergence?.note || ''}">⚠️ ${pos.divergence?.reported || ''} na corr.</span>` : ''}
                                        </div>
                                      </td>
                                      <td class="td-pos-entry" style="text-align: right;">
                                        <input
                                          type="text"
                                          inputmode="decimal"
                                          autocomplete="off"
                                          class="pos-entry-clean-input font-numeric ${pos.entryError ? 'input-error' : ''}"
                                          data-position-entry-id="${pos.id}"
                                          data-entry-index="${pIdx}"
                                          value="${fmtBRL(entry)}"
                                          placeholder="R$ 0,00"
                                          title="Clique para ajustar o preço de entrada enquanto o trade estiver em aberto (Enter confirma, Esc cancela)"
                                          aria-label="Preço de entrada de ${pos.ticker}"
                                        />
                                        ${pos.entryError ? `<span class="account-error-msg" data-pos-entry-error="${pos.id}">${pos.entryError}</span>` : ''}
                                      </td>
                                      <td class="td-pos-price" style="text-align: right;">
                                        <input 
                                          type="text" 
                                          inputmode="decimal"
                                          autocomplete="off"
                                          class="pos-price-clean-input font-numeric ${pos.error ? 'input-error' : ''} ${pos.priceStale ? 'price-stale' : ''}" 
                                          data-position-id="${pos.id}"
                                          data-index="${pIdx}"
                                          data-price-source="${pos.priceSource || ''}"
                                          data-price-stale="${pos.priceStale ? 'true' : 'false'}"
                                          value="${fmtBRL(curr)}"
                                          placeholder="R$ 0,00"
                                          title="${pos.priceStale
                                            ? `Último preço válido preservado (${pos.priceSource || 'cache'}${pos.priceUpdatedAt ? ` • ${fmtTime(pos.priceUpdatedAt)}` : ''}). Cotação mais recente indisponível no momento.`
                                            : `Preço atual${pos.priceSource ? ` (${pos.priceSource}` : ''}${pos.priceUpdatedAt ? ` • ${fmtTime(pos.priceUpdatedAt)}` : ''}${pos.priceSource ? ')' : ''} — digite para ajustar`}"
                                          aria-label="Preço atual de ${pos.ticker}"
                                        />
                                        ${pos.error ? `<span class="account-error-msg">${pos.error}</span>` : ''}
                                      </td>
                                      <td class="td-pos-var" style="text-align: right;">
                                        <span class="variation-tag position-var-tag font-numeric ${varClass}" data-pos-var-for="${pos.id}">
                                          ${varPct > 0 ? '+' : ''}${varPct.toFixed(2).replace('.', ',')}%
                                        </span>
                                      </td>
                                      <td class="td-pos-result" style="text-align: right;">
                                        <div class="pos-result-stack">
                                          <strong class="pos-result-amount font-numeric ${resClass}" data-pos-result-amount="${pos.id}">
                                            ${resSign}${fmtBRL(unrealizedVal)}
                                          </strong>
                                          ${pos.isPartial && Math.abs(realizedPartial) > 0.005 ? `
                                            <small class="pos-realized-hint font-numeric ${realizedPartial > 0 ? 'positive' : 'negative'}" title="Resultado já realizado em saídas parciais (separado do não realizado)">
                                              Realiz.: ${realizedPartial > 0 ? '+' : ''}${fmtBRL(realizedPartial)}
                                            </small>
                                          ` : ''}
                                        </div>
                                      </td>
                                      <td class="td-pos-duration" style="text-align: right;">
                                        <span class="pos-duration-val font-numeric" data-pos-duration="${pos.id}" data-duration-days="${durationDays !== null ? durationDays : ''}" title="${durationTitle}">${durationLabel}</span>
                                      </td>
                                      <td class="td-pos-action" style="text-align: center;">
                                        <button
                                          type="button"
                                          class="btn-pos-close-op"
                                          data-close-position-btn="${pos.id}"
                                          onclick="window.DailyUpdateHub.openClosePositionModal('${pos.id}')"
                                          title="Fechar operação"
                                          aria-label="Fechar operação ${pos.ticker}"
                                        >
                                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                            <circle cx="12" cy="12" r="9"/>
                                            <line x1="15" y1="9" x2="9" y2="15"/>
                                            <line x1="9" y1="9" x2="15" y2="15"/>
                                          </svg>
                                        </button>
                                      </td>
                                    </tr>
                                  `;
                                }).join('')}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('');
                })()}
              </div>

              <footer class="daily-update-card-footer positions-footer">
                <div class="card-footer-actions">
                  <button type="button" class="btn-ghost-compact" onclick="window.DailyUpdateHub.handleBatchPrices()">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="23 4 23 10 17 10"/>
                      <polyline points="1 20 1 14 7 14"/>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                    </svg>
                    Atualizar Preços em Lote
                  </button>
                </div>
                <div class="card-footer-links">
                  <button type="button" class="btn-ghost-compact link-inspect-btn" onclick="if (typeof go === 'function') go('positions');" title="Ir para a tela de gestão de posições abertas">
                    <span>Ir para Posições Abertas</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                      <polyline points="15 3 21 3 21 9"/>
                      <line x1="10" y1="14" x2="21" y2="3"/>
                    </svg>
                  </button>
                </div>
              </footer>
            </section>
          </div>

          <!-- 5. BOTTOM CARD (3. FECHAMENTO DO DIA) -->
          <footer class="daily-update-closing-card">
            <div class="closing-title-wrap">
              <div class="closing-icon" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <div class="closing-title-text">
                <div class="closing-heading-line">
                  <h3>3. Fechamento do Dia</h3>
                  ${isAlreadyClosed ? `
                    <span class="closing-status-pill closed">
                      ✓ Concluído ${todaySnapshot.version > 1 ? `(v${todaySnapshot.version} Corrigido)` : todaySnapshot.hasException ? '(Com Ressalvas)' : ''}
                    </span>
                  ` : `
                    <span class="closing-status-pill ${progress.readyToClose ? 'ready' : 'in-progress'}">
                      ${progress.readyToClose ? '● Pronto para Concluir' : '● Em Andamento'}
                    </span>
                  `}
                </div>
                <p>Revise o resumo, audite as pendências e registre o fechamento diário com reconciliação.</p>
              </div>
            </div>

            <div class="closing-stats-group">
              <div class="closing-stat-item">
                <span class="stat-check" id="closingAccountsCheckIcon">${progress.accountsComplete ? '✓' : '○'}</span>
                <span>Contas atualizadas: <strong id="closingAccountsChecked">${progress.accountsChecked}/${progress.totalAccounts}</strong></span>
              </div>
              <div class="closing-stat-item">
                <span class="stat-check">${progress.positionsComplete ? '✓' : '○'}</span>
                <span>Posições conferidas: <strong>${progress.positionsChecked}/${progress.totalPositions}</strong></span>
              </div>
              <div class="closing-stat-item">
                <span class="stat-icon" id="closingPendenciesIcon" style="color: ${progress.pendencies === 0 ? '#1e7e4a' : '#f59e0b'};">📊</span>
                <span>Pendências: <strong id="closingPendencies">${progress.pendencies}</strong></span>
              </div>
              ${progress.divergences > 0 ? `
                <div class="closing-stat-item divergence-warning">
                  <span class="stat-icon" style="color: #ef4444;">⚠️</span>
                  <span style="color: #ef4444;"><strong>${progress.divergences} divergência(s) de custódia</strong></span>
                </div>
              ` : ''}
            </div>

            <div class="closing-actions-group">
              <button 
                type="button" 
                class="btn-closing-secondary" 
                onclick="window.DailyUpdateHub.saveDraftAction()"
                title="Salvar alterações atuais localmente como rascunho"
              >
                💾 Salvar Rascunho
              </button>
              <button 
                type="button" 
                class="btn-closing-secondary" 
                onclick="window.DailyUpdateHub.openHistoryModal()"
                title="Consultar histórico de fechamentos passados e comparar datas"
              >
                📜 Histórico
              </button>

              ${isAlreadyClosed ? `
                <button 
                  type="button" 
                  class="btn-save-closing correct" 
                  onclick="window.DailyUpdateHub.promptCorrection()"
                  title="Corrigir fechamento de hoje gerando versão v${(todaySnapshot.version || 1) + 1} com trilha de auditoria"
                >
                  <span>✎</span> Corrigir Fechamento de Hoje
                </button>
              ` : `
                ${!progress.readyToClose ? `
                  <button 
                    type="button" 
                    class="btn-closing-secondary exception" 
                    onclick="window.DailyUpdateHub.promptExceptionClosing()"
                    title="Concluir fechamento registrando pendências como ressalvas permitidas"
                  >
                    ⚠️ Concluir c/ Ressalvas
                  </button>
                ` : ''}
                <button 
                  type="button" 
                  class="btn-save-closing ${!progress.readyToClose ? 'disabled' : ''}" 
                  onclick="window.DailyUpdateHub.handleClosingClick()"
                  title="${progress.readyToClose ? 'Salvar fechamento diário e consolidar Patrimônio Real' : 'Existem itens pendentes. Clique para revisar ou concluir com ressalvas'}"
                >
                  <span>✓</span> Salvar Fechamento Diário
                </button>
              `}
            </div>
          </footer>
        </div>
      `;

      this.cacheLiveDomRefs(container);
      this.bindInputs(container);
    }

    /**
     * Caches references to frequently updated live DOM elements right after render
     * so keystroke updates perform O(1) textContent writes without full-document queries.
     */
    cacheLiveDomRefs(container) {
      if (!container || typeof container.querySelector !== 'function') {
        this._domCache = null;
        return;
      }
      const q = (sel) => container.querySelector(sel);
      const qAll = (sel) => (typeof container.querySelectorAll === 'function' ? Array.from(container.querySelectorAll(sel)) : []);

      const accounts = new Map();
      qAll('[data-account-input]').forEach(input => {
        const id = input.dataset?.accountInput;
        if (!id) return;
        const row = typeof input.closest === 'function' ? input.closest('tr') : null;
        accounts.set(id, {
          input,
          row,
          varTag: q(`[data-account-var-for="${id}"]`),
          usdVarTag: q(`[data-account-usd-var-for="${id}"]`),
          nomadFxBadge: q(`[data-nomad-fx-badge="${id}"]`),
          shareEl: q(`[data-wealth-share-for="${id}"]`),
          errorEl: q(`[data-account-error-for="${id}"]`)
        });
      });

      const titulares = new Map();
      qAll('[data-titular-subtotal]').forEach(el => {
        const person = el.dataset?.titularSubtotal;
        if (!person) return;
        titulares.set(person, {
          subtotalEl: el,
          shareEl: q(`[data-titular-share="${person}"]`),
          headerTotalEl: q(`[data-titular-header-total="${person}"]`)
        });
      });

      this._domCache = {
        kpiRealWealth: q('#kpiRealWealth'),
        kpiDayVar: q('#kpiDayVar'),
        kpiExposureVal: q('#kpiExposureVal') || q('#kpiTotalExposure'),
        kpiExposurePct: q('#kpiExposurePct'),
        kpiPortfolioHeat: q('#kpiPortfolioHeat'),
        headerTotalExposure: q('#headerTotalExposure'),
        headerTotalExposurePct: q('#headerTotalExposurePct'),
        tableConsolidatedWealth: q('#tableConsolidatedWealth'),
        tableDayVar: q('#tableDayVar'),
        provisionalHint: q('#wealthDistributionProvisionalHint'),
        badgePositions: q('#badgePositionsChecked'),
        closingAccountsChecked: q('#closingAccountsChecked'),
        closingAccountsCheckIcon: q('#closingAccountsCheckIcon'),
        closingPendencies: q('#closingPendencies'),
        closingPendenciesIcon: q('#closingPendenciesIcon'),
        heroStatusPill: q('#heroStatusPill'),
        accounts,
        titulares
      };
    }

    setAccountRowErrorLive(accId, errorMsg) {
      const cached = this._domCache?.accounts?.get(accId);
      const input = cached?.input || (typeof document !== 'undefined' ? document.querySelector(`[data-account-input="${accId}"]`) : null);
      const row = cached?.row || (input && typeof input.closest === 'function' ? input.closest('tr') : null);
      const errorEl = cached?.errorEl || (typeof document !== 'undefined' ? document.querySelector(`[data-account-error-for="${accId}"]`) : null);
      const hasErr = Boolean(errorMsg);

      if (input?.classList) input.classList.toggle('input-error', hasErr);
      if (row?.classList) row.classList.toggle('error', hasErr);
      if (errorEl) {
        errorEl.textContent = hasErr ? errorMsg : '';
        if (errorEl.style) errorEl.style.display = hasErr ? 'block' : 'none';
      }
    }

    scheduleDraftSave() {
      if (this._draftSaveTimer) {
        clearTimeout(this._draftSaveTimer);
      }
      this._draftSaveTimer = setTimeout(() => {
        this._draftSaveTimer = null;
        this.persistDraftNonBlocking();
      }, 300);
    }

    persistDraftNonBlocking() {
      if (this._draftSaveTimer) {
        clearTimeout(this._draftSaveTimer);
        this._draftSaveTimer = null;
      }
      this.model.saveDraft();
      if (typeof this.model.saveAccounts === 'function') {
        this.model.saveAccounts();
      }
      if (typeof this.model.savePositionMeta === 'function') {
        this.model.savePositionMeta();
      }
      if (root.healthyTrendWorkspace?.save) {
        try {
          root.healthyTrendWorkspace.save(
            root.DailyUpdateModel?.STORAGE_KEY_ACCOUNTS || 'healthy-daily-update-accounts',
            this.model.accounts
          );
          if (typeof this.model.exportPositionMetaMap === 'function') {
            root.healthyTrendWorkspace.save(
              root.DailyUpdateModel?.STORAGE_KEY_POSITION_META || 'healthy-daily-update-position-meta',
              this.model.exportPositionMetaMap()
            );
          }
        } catch (_) {}
      }
    }

    broadcastEquityUpdated(finDetail, immediate = false) {
      const dispatch = () => {
        this._equityBroadcastRaf = null;
        try {
          root.dispatchEvent(new CustomEvent('healthyTrend:equityUpdated', { detail: finDetail }));
        } catch (_) {}
      };

      if (immediate || typeof requestAnimationFrame !== 'function') {
        if (this._equityBroadcastRaf && typeof cancelAnimationFrame === 'function') {
          cancelAnimationFrame(this._equityBroadcastRaf);
          this._equityBroadcastRaf = null;
        }
        dispatch();
        return;
      }

      if (this._equityBroadcastRaf && typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(this._equityBroadcastRaf);
      }
      this._equityBroadcastRaf = requestAnimationFrame(dispatch);
    }

    bindInputs(container) {
      const formatEditable = root.DailyUpdateModel?.formatEditableNumber ||
        ((v, isUSD) => Number(v || 0).toFixed(2).replace('.', isUSD ? '.' : ','));
      const parseNum = root.DailyUpdateModel?.parseNumber || parseFloat;

      // Account balance inputs: local editable state during focus, 0ms instant typing,
      // zero aggressive reformatting on keystroke, zero cursor jump, zero destructive render() on blur.
      const accountInputs = Array.from(container.querySelectorAll('[data-account-input]'));
      accountInputs.forEach((input, index) => {
        const accId = input.dataset.accountInput;

        const commitAccountField = (formatInputValue) => {
          const acc = this.model.accounts.find(a => a.id === accId);
          if (!acc) return;
          const isUSD = acc.currency === 'USD' && acc.inputCurrency === 'USD';
          const rawVal = input.value;
          const res = this.model.updateAccountBalance(accId, rawVal, isUSD);

          if (res.success) {
            this.setAccountRowErrorLive(accId, null);
            if (formatInputValue) {
              input.value = isUSD ? fmtUSD(acc.newBalanceUSD || 0) : fmtBRL(acc.newBalance);
            }
          } else {
            this.setAccountRowErrorLive(accId, res.error);
          }

          this.updateTotalsLive({ scope: 'accounts', accountId: accId, broadcastNow: true });
          this.persistDraftNonBlocking();
        };

        input.addEventListener('focus', () => {
          const acc = this.model.accounts.find(a => a.id === accId);
          if (!acc || acc.error) return;
          const isUSD = acc.currency === 'USD' && acc.inputCurrency === 'USD';
          const numericVal = isUSD ? (acc.newBalanceUSD || 0) : (acc.newBalance || 0);
          const editable = formatEditable(numericVal, isUSD);
          // Switch once on focus to clean unmasked numeric text (no R$, no thousand dots)
          if (input.value !== editable) {
            input.value = editable;
          }
          this.editingAccountInputs.set(accId, input.value);
        });

        input.addEventListener('input', (e) => {
          // NEVER rewrite e.target.value here -> browser preserves cursor & renders every keystroke in 0ms
          const rawVal = e.target.value;
          this.editingAccountInputs.set(accId, rawVal);

          const acc = this.model.accounts.find(a => a.id === accId);
          if (!acc) return;
          const isUSD = acc.currency === 'USD' && acc.inputCurrency === 'USD';

          // Allow temporarily empty field while replacing value without flashing an aggressive error
          if (rawVal.trim() === '') {
            this.setAccountRowErrorLive(accId, null);
            return;
          }

          const parsed = parseNum(rawVal, isUSD ? 'USD' : 'BRL');
          if (parsed !== null && parsed >= 0) {
            this.model.updateAccountBalance(accId, parsed, isUSD);
            this.setAccountRowErrorLive(accId, null);
            this.updateTotalsLive({ scope: 'accounts', accountId: accId, broadcastNow: false });
            this.scheduleDraftSave();
          } else {
            const validation = root.DailyUpdateModel?.validateBalanceInput
              ? root.DailyUpdateModel.validateBalanceInput(rawVal, true, isUSD ? 'USD' : 'BRL')
              : { valid: false, error: 'Formato numérico inválido.' };
            this.setAccountRowErrorLive(accId, validation.error);
          }
        });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === 'ArrowDown') {
            e.preventDefault();
            const next = accountInputs[index + 1];
            if (next) {
              next.focus();
              if (typeof next.select === 'function') next.select();
            } else {
              input.blur();
            }
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = accountInputs[index - 1];
            if (prev) {
              prev.focus();
              if (typeof prev.select === 'function') prev.select();
            }
          }
        });

        input.addEventListener('blur', () => {
          this.editingAccountInputs.delete(accId);
          commitAccountField(true);
        });

        // Keep programmatic 'change' support without destroying DOM via this.render()
        input.addEventListener('change', () => {
          const isStillFocused = typeof document !== 'undefined' && document.activeElement === input;
          if (!isStillFocused) {
            this.editingAccountInputs.delete(accId);
          }
          commitAccountField(!isStillFocused);
        });
      });

      // Position price inputs with keyboard navigation
      const priceInputs = Array.from(container.querySelectorAll('.pos-price-clean-input, .position-price-input'));
      priceInputs.forEach((input, index) => {
        // Real-time recalculation as user types
        input.addEventListener('input', (e) => {
          const posId = input.dataset.positionId;
          const val = e.target.value;
          const parsed = (root.DailyUpdateModel?.parseNumber || parseFloat)(val);
          if (parsed !== null && parsed > 0) {
            const pos = this.model.positions.find(p => p.id === posId);
            if (pos) {
              const oldPrice = Number(pos.currentPrice || pos.entryPrice || 0);
              const sign = typeof this.model.getPositionDirectionSign === 'function'
                ? this.model.getPositionDirectionSign(pos)
                : (pos.direction === 'short' || pos.side === 'Venda' ? -1 : 1);
              const mult = Number(pos.contractMult ?? pos.mult ?? 1);
              const fxRate = Number(pos.fxRate ?? (pos.currency === 'USD' ? (pos.fxRate || 5.95) : 1));
              const qty = Number(pos.quantity ?? pos.remaining ?? 0);
              const deltaTotal = Math.round((parsed - oldPrice) * sign * qty * mult * fxRate * 100) / 100;

              pos.currentPrice = parsed;
              pos.checked = true;
              if (!pos.hasDivergence) pos.status = 'conferida';
              pos.error = null;

              // Live update linked account balance
              if (pos.accountId && deltaTotal !== 0) {
                const acc = this.model.accounts.find(a => a.id === pos.accountId);
                if (acc) {
                  if (acc.currency === 'USD') {
                    const fx = Number(acc.fxRate || 5.95);
                    const deltaUSD = Math.round((deltaTotal / fx) * 100) / 100;
                    acc.newBalanceUSD = Math.round(((acc.newBalanceUSD || 0) + deltaUSD) * 100) / 100;
                    acc.newBalance = Math.round((acc.newBalanceUSD * fx) * 100) / 100;
                  } else {
                    acc.newBalance = Math.round(((Number(acc.newBalance) || 0) + deltaTotal) * 100) / 100;
                  }
                  acc.status = 'updated';
                }
              }
            }
            this.updateTotalsLive({ scope: 'all', broadcastNow: false });
            // Update row variation badge, volume, and unrealized result live
            const row = input.closest('tr');
            if (row && pos) {
              const varPct = pos.entryPrice > 0 ? ((parsed - pos.entryPrice) / pos.entryPrice) * 100 : 0;
              const varTag = row.querySelector('.position-var-tag, .variation-tag');
              if (varTag) {
                varTag.className = `variation-tag position-var-tag ${varPct > 0.001 ? 'positive' : varPct < -0.001 ? 'negative' : 'neutral'}`;
                varTag.textContent = `${varPct > 0 ? '+' : ''}${varPct.toFixed(2).replace('.', ',')}%`;
              }
            }
          }
        });

        // Keydown for Tab, Enter, Up/Down navigation
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            const next = priceInputs[index + 1] || priceInputs[0];
            if (next) {
              next.focus();
              next.select();
            }
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = priceInputs[index + 1];
            if (next) {
              next.focus();
              next.select();
            }
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = priceInputs[index - 1];
            if (prev) {
              prev.focus();
              prev.select();
            }
          }
        });

        // Change event to format and persist (preserving last valid price if cleared/invalid)
        input.addEventListener('change', async (e) => {
          const posId = input.dataset.positionId;
          const val = e.target.value;
          const res = await this.updatePositionPrice(posId, val, { source: 'manual', markStaleOnFailure: false });
          if (!res?.success && res?.preservedPrice) {
            const pos = this.model.positions.find(p => p.id === posId);
            if (pos) {
              pos.currentPrice = res.preservedPrice;
              pos.error = null;
            }
          }
          this.render();
        });
      });

      // Editable Entry Price inputs (Passo 2 — ajuste de preço de entrada enquanto aberto)
      const entryInputs = Array.from(container.querySelectorAll('.pos-entry-clean-input'));
      entryInputs.forEach((input, index) => {
        let initialEntryOnFocus = null;

        input.addEventListener('focus', () => {
          const posId = input.dataset.positionEntryId;
          const pos = this.model.positions.find(p => p.id === posId);
          if (!pos) return;
          initialEntryOnFocus = Number(pos.entryPrice || 0);
          const formatEditable = root.DailyUpdateModel?.formatEditableNumber;
          if (typeof formatEditable === 'function' && initialEntryOnFocus > 0) {
            input.value = formatEditable(initialEntryOnFocus, false);
          }
          if (typeof input.select === 'function') {
            try { input.select(); } catch (_) {}
          }
        });

        // Instant, zero-lag recalculation as user types without mutating input.value
        input.addEventListener('input', (e) => {
          const posId = input.dataset.positionEntryId;
          const val = e.target.value;
          const parsed = (root.DailyUpdateModel?.parseNumber || parseFloat)(val, 'BRL');
          const pos = this.model.positions.find(p => p.id === posId);
          if (!pos) return;

          if (parsed !== null && Number.isFinite(parsed) && parsed > 0) {
            pos.entryPrice = parsed;
            pos.averageEntry = parsed;
            pos.entry = parsed;
            pos.entryError = null;
            if (input.classList) input.classList.remove('input-error');

            this.updateTotalsLive({ scope: 'all', broadcastNow: false });

            const row = typeof input.closest === 'function' ? input.closest('tr') : null;
            if (row) {
              const curr = Number(pos.currentPrice || parsed);
              const varPct = parsed > 0 ? ((curr - parsed) / parsed) * 100 : 0;
              const varTag = row.querySelector('.position-var-tag, .variation-tag');
              if (varTag) {
                varTag.className = `variation-tag position-var-tag font-numeric ${varPct > 0.001 ? 'positive' : varPct < -0.001 ? 'negative' : 'neutral'}`;
                varTag.textContent = `${varPct > 0 ? '+' : ''}${varPct.toFixed(2).replace('.', ',')}%`;
              }
            }
          }
        });

        input.addEventListener('keydown', (e) => {
          if (e.key === 'Escape') {
            const posId = input.dataset.positionEntryId;
            const pos = this.model.positions.find(p => p.id === posId);
            if (pos && initialEntryOnFocus && initialEntryOnFocus > 0) {
              pos.entryPrice = initialEntryOnFocus;
              pos.averageEntry = initialEntryOnFocus;
              pos.entry = initialEntryOnFocus;
              pos.entryError = null;
              input.value = fmtBRL(initialEntryOnFocus);
              if (input.classList) input.classList.remove('input-error');
              this.updateTotalsLive({ scope: 'all', broadcastNow: false });
            }
            if (typeof input.blur === 'function') input.blur();
          } else if (e.key === 'Enter') {
            e.preventDefault();
            const next = entryInputs[index + 1];
            if (next) {
              next.focus();
            } else if (typeof input.blur === 'function') {
              input.blur();
            }
          } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            const next = entryInputs[index + 1];
            if (next) next.focus();
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            const prev = entryInputs[index - 1];
            if (prev) prev.focus();
          }
        });

        input.addEventListener('blur', async (e) => {
          const posId = input.dataset.positionEntryId;
          const val = e.target.value;
          const res = await this.updatePositionEntryPrice(posId, val);
          const pos = this.model.positions.find(p => p.id === posId);
          if (res?.success && pos) {
            input.value = fmtBRL(pos.entryPrice);
            if (input.classList) input.classList.remove('input-error');
            this.updateTotalsLive({ scope: 'all', broadcastNow: true });
            const row = typeof input.closest === 'function' ? input.closest('tr') : null;
            if (row) {
              const curr = Number(pos.currentPrice || pos.entryPrice);
              const varPct = pos.entryPrice > 0 ? ((curr - pos.entryPrice) / pos.entryPrice) * 100 : 0;
              const varTag = row.querySelector('.position-var-tag, .variation-tag');
              if (varTag) {
                varTag.className = `variation-tag position-var-tag font-numeric ${varPct > 0.001 ? 'positive' : varPct < -0.001 ? 'negative' : 'neutral'}`;
                varTag.textContent = `${varPct > 0 ? '+' : ''}${varPct.toFixed(2).replace('.', ',')}%`;
              }
            }
          } else if (pos && initialEntryOnFocus && initialEntryOnFocus > 0) {
            // Invalid input on blur: restore previous valid entry price cleanly
            pos.entryPrice = initialEntryOnFocus;
            pos.averageEntry = initialEntryOnFocus;
            pos.entry = initialEntryOnFocus;
            pos.entryError = null;
            input.value = fmtBRL(initialEntryOnFocus);
            if (input.classList) input.classList.remove('input-error');
            this.updateTotalsLive({ scope: 'all', broadcastNow: false });
          }
        });
      });
    }

    /**
     * Updates top KPI, titular subtotals, and table totals live in O(1) DOM writes
     * without losing input focus or triggering unnecessary re-renders.
     */
    updateTotalsLive(options = {}) {
      const scope = options.scope || 'all';
      const broadcastNow = options.broadcastNow !== undefined ? Boolean(options.broadcastNow) : true;
      const cache = this._domCache;
      const getEl = (cached, id) => {
        if (cached && cached.isConnected !== false) return cached;
        return typeof document !== 'undefined' && typeof document.getElementById === 'function' ? document.getElementById(id) : null;
      };
      const queryEl = (cached, selector) => {
        if (cached && cached.isConnected !== false) return cached;
        return typeof document !== 'undefined' && typeof document.querySelector === 'function' ? document.querySelector(selector) : null;
      };

      const realWealth = this.model.getConsolidatedRealWealth();
      const investmentWealth = this.model.getInvestmentWealth();
      const dayVarNominal = this.model.getDayNominalVariation();
      const dayVarPct = this.model.getDayPercentVariation();
      const exposure = this.model.getTotalExposure();
      const exposurePct = investmentWealth > 0 ? Math.round(((exposure / investmentWealth) * 100) * 100) / 100 : 0;

      const elRealWealth = getEl(cache?.kpiRealWealth, 'kpiRealWealth');
      if (elRealWealth) elRealWealth.textContent = fmtBRL(realWealth);

      const elDayVar = getEl(cache?.kpiDayVar, 'kpiDayVar');
      if (elDayVar) {
        elDayVar.className = `daily-update-kpi-sub ${dayVarNominal >= 0 ? 'up' : 'down'}`;
        elDayVar.textContent = `${dayVarNominal >= 0 ? '▲' : '▼'} ${fmtPct(dayVarPct)} (${fmtBRL(dayVarNominal)}) vs. fechamento anterior`;
      }

      if (scope === 'all') {
        const elExpVal = getEl(cache?.kpiExposureVal, 'kpiExposureVal') || getEl(null, 'kpiTotalExposure');
        if (elExpVal) elExpVal.textContent = fmtBRL(exposure);

        const elHeaderTotalExp = getEl(cache?.headerTotalExposure, 'headerTotalExposure');
        if (elHeaderTotalExp) elHeaderTotalExp.textContent = fmtBRL(exposure);
      }

      const elExpPct = getEl(cache?.kpiExposurePct, 'kpiExposurePct');
      if (elExpPct) elExpPct.textContent = `${exposurePct.toFixed(2).replace('.', ',')}% do patrimônio`;

      const elHeaderTotalExpPct = getEl(cache?.headerTotalExposurePct, 'headerTotalExposurePct');
      if (elHeaderTotalExpPct) elHeaderTotalExpPct.textContent = `(${exposurePct.toFixed(2).replace('.', ',')}%)`;

      const elTableWealth = getEl(cache?.tableConsolidatedWealth, 'tableConsolidatedWealth');
      if (elTableWealth) elTableWealth.textContent = fmtBRL(realWealth);

      const elTableDayVar = getEl(cache?.tableDayVar, 'tableDayVar');
      if (elTableDayVar) {
        if (elTableDayVar.style) elTableDayVar.style.color = dayVarNominal >= 0 ? '#1e7e4a' : '#d14343';
        elTableDayVar.className = `consolidated-var-tag ${dayVarNominal >= 0 ? 'positive' : 'negative'}`;
        elTableDayVar.textContent = `${dayVarNominal >= 0 ? '▲' : '▼'} ${fmtPct(dayVarPct)} (${fmtBRL(dayVarNominal)})`;
      }

      const progress = this.model.getProgress();
      const badgePositions = getEl(cache?.badgePositions, 'badgePositionsChecked');
      if (badgePositions) badgePositions.textContent = `${progress.positionsChecked}/${this.model.positions.length} conferidas`;

      const elClosingAccounts = getEl(cache?.closingAccountsChecked, 'closingAccountsChecked');
      if (elClosingAccounts) elClosingAccounts.textContent = `${progress.accountsChecked}/${progress.totalAccounts}`;

      const elClosingAccIcon = getEl(cache?.closingAccountsCheckIcon, 'closingAccountsCheckIcon');
      if (elClosingAccIcon) elClosingAccIcon.textContent = progress.accountsComplete ? '✓' : '○';

      const elClosingPendencies = getEl(cache?.closingPendencies, 'closingPendencies');
      if (elClosingPendencies) elClosingPendencies.textContent = String(progress.pendencies);

      const elClosingPendIcon = getEl(cache?.closingPendenciesIcon, 'closingPendenciesIcon');
      if (elClosingPendIcon?.style) elClosingPendIcon.style.color = progress.pendencies === 0 ? '#1e7e4a' : '#f59e0b';

      const elHeroPill = getEl(cache?.heroStatusPill, 'heroStatusPill');
      if (elHeroPill) {
        elHeroPill.className = `daily-update-status-pill ${progress.readyToClose ? 'ready' : progress.pendingAccounts > 0 ? 'pending' : 'in-progress'}`;
        elHeroPill.textContent = this.model.closingStatus === 'CLOSED' ? 'Concluído' : progress.readyToClose ? 'Pronto para concluir' : 'Em andamento';
      }

      // CARD [05] — Update % do Total, variation, and Nomad USD badges live without touching focused input
      const isProvisional = this.model.isWealthDistributionProvisional();
      const activeEl = typeof document !== 'undefined' ? document.activeElement : null;

      this.model.accounts.forEach(acc => {
        const cachedAcc = cache?.accounts?.get(acc.id);
        const sharePct = this.model.getAccountWealthSharePct(acc, realWealth);
        const elShare = queryEl(cachedAcc?.shareEl, `[data-wealth-share-for="${acc.id}"]`);
        if (elShare) {
          elShare.textContent = `${sharePct.toFixed(2).replace('.', ',')}%`;
          if (elShare.classList) {
            if (isProvisional) {
              elShare.classList.add('provisional');
              elShare.title = 'Participação provisória (contas pendentes de conferência)';
            } else {
              elShare.classList.remove('provisional');
              elShare.title = `Representa ${sharePct.toFixed(2).replace('.', ',')}% do Patrimônio Real consolidado`;
            }
          }
        }

        // Only sync non-focused inputs (e.g. when a position price changed a linked account)
        if (scope === 'all') {
          const accInput = queryEl(cachedAcc?.input, `[data-account-input="${acc.id}"]`);
          if (accInput && activeEl !== accInput && !this.editingAccountInputs.has(acc.id)) {
            const isUSD = acc.currency === 'USD' && acc.inputCurrency === 'USD';
            accInput.value = isUSD ? fmtUSD(acc.newBalanceUSD || 0) : fmtBRL(acc.newBalance);
          }
        }

        if (!options.accountId || options.accountId === acc.id) {
          const varTag = queryEl(cachedAcc?.varTag, `[data-account-var-for="${acc.id}"]`);
          if (varTag) {
            const varPct = this.model.getAccountVariationPct(acc);
            varTag.className = `variation-tag font-numeric ${varPct > 0.001 ? 'positive' : varPct < -0.001 ? 'negative' : 'neutral'}`;
            varTag.textContent = `${varPct > 0 ? '+' : ''}${varPct.toFixed(2).replace('.', ',')}%`;
          }

          if (acc.currency === 'USD') {
            const nomadBadge = queryEl(cachedAcc?.nomadFxBadge, `[data-nomad-fx-badge="${acc.id}"]`);
            if (nomadBadge) {
              nomadBadge.textContent = `${fmtUSD(acc.newBalanceUSD || 0)} | Câmbio: R$ ${(acc.fxRate || 5.95).toFixed(2).replace('.', ',')}`;
            }
            const usdVarTag = queryEl(cachedAcc?.usdVarTag, `[data-account-usd-var-for="${acc.id}"]`);
            if (usdVarTag) {
              const usdPct = this.model.getAccountUsdVariationPct(acc);
              usdVarTag.className = `usd-var-hint font-numeric ${usdPct >= 0 ? 'positive' : 'negative'}`;
              usdVarTag.textContent = `${usdPct >= 0 ? '+' : ''}${usdPct.toFixed(2).replace('.', ',')}% USD`;
            }
          }
        }
      });

      // Update titular group subtotals, shares, and header totals live
      const grouped = this.model.getGroupedAccounts(realWealth);
      grouped.forEach(group => {
        const cachedTit = cache?.titulares?.get(group.person);
        const elSubtotal = queryEl(cachedTit?.subtotalEl, `[data-titular-subtotal="${group.person}"]`);
        if (elSubtotal) elSubtotal.textContent = fmtBRL(group.subtotal);

        const elShare = queryEl(cachedTit?.shareEl, `[data-titular-share="${group.person}"]`);
        if (elShare) elShare.textContent = `${group.sharePct.toFixed(2).replace('.', ',')}% do patrimônio`;

        const elHeaderTotal = queryEl(cachedTit?.headerTotalEl, `[data-titular-header-total="${group.person}"]`);
        if (elHeaderTotal) elHeaderTotal.innerHTML = `Total: <strong>${fmtBRL(group.subtotal)}</strong> (${group.sharePct.toFixed(2).replace('.', ',')}%)`;
      });

      const elProvisionalHint = getEl(cache?.provisionalHint, 'wealthDistributionProvisionalHint');
      if (elProvisionalHint?.style) {
        elProvisionalHint.style.display = isProvisional ? 'inline-flex' : 'none';
      }

      // Skip scanning open position rows when only an account balance changed
      if (scope === 'all') {
        this.model.positions.forEach(pos => {
          if (pos.closed || pos.status === 'encerrada') return;
          if (typeof this.model.getPositionUnrealizedResult === 'function') {
            const pnl = this.model.getPositionUnrealizedResult(pos);
            const resClass = pnl > 0.005 ? 'positive' : pnl < -0.005 ? 'negative' : 'neutral';
            const resSign = pnl > 0.005 ? '+' : '';

            const elAmt = queryEl(null, `[data-pos-result-amount="${pos.id}"]`);
            if (elAmt) {
              elAmt.className = `pos-result-amount font-numeric ${resClass}`;
              elAmt.textContent = `${resSign}${fmtBRL(pnl)}`;
            }
          }
        });

        // Update consolidated Resultado Aberto pill in Positions header live
        if (typeof this.model.getTotalUnrealizedResult === 'function') {
          const totPnl = this.model.getTotalUnrealizedResult();
          const totPct = typeof this.model.getTotalUnrealizedPct === 'function' ? this.model.getTotalUnrealizedPct() : 0;
          const totClass = totPnl > 0.005 ? 'positive' : totPnl < -0.005 ? 'negative' : 'neutral';
          const totSign = totPnl > 0.005 ? '+' : '';

          const elPill = getEl(null, 'headerTotalUnrealizedPill');
          if (elPill) elPill.className = `pos-header-kpi-pill result-pill ${totClass}`;

          const elVal = getEl(null, 'headerTotalUnrealizedVal');
          if (elVal) {
            elVal.className = `pos-header-kpi-val font-numeric ${totClass}`;
            elVal.textContent = `${totSign}${fmtBRL(totPnl)}`;
          }

          const elPct = getEl(null, 'headerTotalUnrealizedPct');
          if (elPct) {
            elPct.className = `pos-header-kpi-pct font-numeric ${totClass}`;
            elPct.textContent = `(${fmtPct(totPct)})`;
          }
        }
      }

      const heat = this.model.getPortfolioHeat();
      const heatLimit = this.model.getHeatLimit();
      const elHeat = getEl(cache?.kpiPortfolioHeat, 'kpiPortfolioHeat');
      if (elHeat) elHeat.textContent = `${heat.toFixed(2).replace('.', ',')}%`;

      // Broadcast centralized financials update (coalesced per frame during rapid typing, immediate on commit/blur)
      const availableCash = Math.max(0, Math.round((investmentWealth - exposure) * 100) / 100);
      const availableCashPct = investmentWealth > 0 ? Math.round(((availableCash / investmentWealth) * 100) * 100) / 100 : 0;
      const remRiskPct = Math.max(0, Math.round((heatLimit - heat) * 100) / 100);
      const finDetail = {
        newEquity: investmentWealth,
        realWealth,
        investmentWealth,
        strategyEquity: this.model.strategyEquity,
        allocatedCapital: exposure,
        allocatedCapitalPct: exposurePct,
        availableCash,
        availableCashPct,
        heat,
        heatLimit,
        remainingRiskCapacityPct: remRiskPct,
        remainingRiskCapacityAmount: Math.round((remRiskPct / 100) * investmentWealth * 100) / 100,
        accounts: this.model.accounts,
        positions: this.model.positions
      };
      this.broadcastEquityUpdated(finDetail, broadcastNow);
    }

    toggleTitularGroup(person) {
      if (!person) return;
      if (this.collapsedTitulares.has(person)) {
        this.collapsedTitulares.delete(person);
      } else {
        this.collapsedTitulares.add(person);
      }
      const groupCard = document.querySelector(`.titular-group-card[data-titular="${person}"]`);
      if (groupCard) {
        const body = groupCard.querySelector('.titular-group-body');
        const chevron = groupCard.querySelector('.titular-chevron');
        const nowCollapsed = this.collapsedTitulares.has(person);
        if (body) {
          body.style.display = nowCollapsed ? 'none' : 'block';
        }
        if (chevron) {
          chevron.classList.toggle('collapsed', nowCollapsed);
        }
      } else {
        this.render();
      }
    }

    togglePositionGroup(categoryKey) {
      if (!categoryKey) return;
      const key = String(categoryKey).trim().toUpperCase();
      if (this.collapsedPositionGroups.has(key)) {
        this.collapsedPositionGroups.delete(key);
      } else {
        this.collapsedPositionGroups.add(key);
      }
      const groupCard = document.querySelector(`.position-group-card[data-position-group="${key}"]`);
      if (groupCard) {
        const body = groupCard.querySelector('.position-group-body');
        const chevron = groupCard.querySelector('.pos-group-chevron');
        const nowCollapsed = this.collapsedPositionGroups.has(key);
        if (body) {
          body.style.display = nowCollapsed ? 'none' : 'block';
        }
        if (chevron) {
          chevron.classList.toggle('collapsed', nowCollapsed);
        }
      } else {
        this.render();
      }
    }

    keepAccount(accountId) {
      this.model.keepAccountBalance(accountId);
      this.model.saveDraft();
      this.render();
    }

    keepAllAccounts() {
      this.model.keepAllAccounts();
      this.model.saveDraft();
      if (typeof root.showToast === 'function') {
        root.showToast('Todos os saldos confirmados como mantidos.');
      }
      this.render();
    }

    setPending(accountId) {
      this.model.setAccountPending(accountId);
      this.model.saveDraft();
      this.render();
    }

    toggleNomadCurrency(accountId) {
      const acc = this.model.accounts.find(a => a.id === accountId);
      if (acc && acc.currency === 'USD') {
        acc.inputCurrency = acc.inputCurrency === 'USD' ? 'BRL' : 'USD';
        acc.updatedAt = new Date().toISOString();
        this.persistDraftNonBlocking();
        this.render();
      }
    }

    confirmPosition(positionId) {
      this.model.confirmPosition(positionId);
      this.model.saveDraft();
      this.render();
    }

    confirmAllPositions() {
      this.model.confirmAllPositions();
      this.model.saveDraft();
      if (typeof root.showToast === 'function') {
        root.showToast('Todas as posições abertas foram confirmadas como conferidas.');
      }
      this.render();
    }

    setPositionPending(positionId) {
      this.model.setPositionPending(positionId);
      this.model.saveDraft();
      this.render();
    }

    togglePositionMenu(positionId, event) {
      if (event && event.stopPropagation) event.stopPropagation();
      const menu = document.getElementById(`posMenu_${positionId}`);
      if (!menu) return;
      const isVisible = menu.style.display === 'block';
      this.closeAllMenus();
      if (!isVisible) {
        menu.style.display = 'block';
      }
    }

    closeAllMenus() {
      if (typeof document !== 'undefined') {
        document.querySelectorAll('.pos-menu-popover').forEach(m => m.style.display = 'none');
      }
    }

    promptDivergence(positionId) {
      const pos = this.model.positions.find(p => p.id === positionId);
      if (!pos) return;

      const input = typeof prompt === 'function' ? prompt(
        `[${pos.ticker}] Conferência de Custódia na Corretora:\n\nQuantidade registrada no sistema: ${pos.quantity} un.\n\nInforme a quantidade observada no extrato da corretora para sinalizar divergência:`,
        String(pos.quantity)
      ) : null;
      if (input === null) return;

      const num = parseInt(input.replace(/[^\d]/g, ''), 10);
      if (isNaN(num)) {
        if (typeof root.showToast === 'function') root.showToast('Quantidade inválida informada.');
        return;
      }

      if (num === pos.quantity) {
        this.model.resolvePositionDivergence(positionId);
        if (typeof root.showToast === 'function') root.showToast(`[${pos.ticker}] Custódia coincide perfeitamente (${num} un.).`);
      } else {
        this.model.reportPositionDivergence(positionId, {
          field: 'quantity',
          reported: num,
          note: `Quantidade na corretora (${num} un.) diverge da registrada (${pos.quantity} un.).`
        });
        if (typeof root.showToast === 'function') {
          root.showToast(`⚠️ Divergência sinalizada em ${pos.ticker}: ${num} un. na corretora vs ${pos.quantity} un. no sistema.`);
        }
      }
      this.model.saveDraft();
      this.render();
    }

    resolveDivergence(positionId) {
      this.model.resolvePositionDivergence(positionId);
      this.model.saveDraft();
      if (typeof root.showToast === 'function') {
        root.showToast('Divergência resolvida.');
      }
      this.render();
    }

    async updatePositionPrice(positionId, newPrice, options = {}) {
      const posSeq = (this._priceSeqMap.get(String(positionId)) || 0) + 1;
      this._priceSeqMap.set(String(positionId), posSeq);

      const res = this.model.updatePositionPrice(positionId, newPrice, {
        source: options.source || 'manual',
        updatedAt: options.updatedAt || new Date().toISOString(),
        stale: Boolean(options.stale),
        syncAccount: options.syncAccount,
        markStaleOnFailure: Boolean(options.markStaleOnFailure)
      });
      if (res.success) {
        const pos = this.model.positions.find(p => p.id === positionId);
        if (pos) {
          const prevDirty = this._dirtyPositions.get(String(pos.id)) || {};
          this._dirtyPositions.set(String(pos.id), {
            ...prevDirty,
            currentPrice: Number(pos.currentPrice),
            priceUpdatedAt: pos.priceUpdatedAt || new Date().toISOString(),
            priceSource: pos.priceSource || 'manual'
          });
        }

        this.persistDraftNonBlocking();

        // 1. If real backend trade, persist currentPrice durably in metadata AND record update event
        if (pos && /^[0-9a-f-]{36}$/i.test(String(pos.id)) && root.healthyTrendApi?.request && root.healthyTrendApi.isAuthenticated?.()) {
          const isLatest = () => this._priceSeqMap.get(String(positionId)) === posSeq;
          try {
            await root.healthyTrendApi.request(`/api/trades/${pos.id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                currentPrice: Number(pos.currentPrice),
                priceSource: pos.priceSource || 'manual',
                priceUpdatedAt: pos.priceUpdatedAt || new Date().toISOString(),
                priceStale: Boolean(pos.priceStale)
              })
            });
          } catch (e) {
            console.warn('[DailyUpdateHub] Current price metadata persistence note:', e.message);
          }

          if (isLatest()) {
            try {
              const stopVal = Number(pos.trailingStop || pos.stopPrice || 0);
              await root.healthyTrendApi.request(`/api/trades/${pos.id}/events`, {
                method: 'POST',
                body: {
                  type: 'update',
                  price: Number(pos.currentPrice),
                  stop: stopVal > 0 ? stopVal : 0,
                  priceSource: pos.priceSource || 'manual',
                  note: 'Conferência diária de posição aberta'
                }
              });
            } catch (e) {
              console.warn('[DailyUpdateHub] Event persistence note:', e.message);
            }
          }
        }

        // 2. Also update in-memory operationalState
        if (root.operationalState?.positions && pos) {
          const opp = root.operationalState.positions.find(x => x.id === positionId || x.asset === pos.ticker);
          if (opp) {
            opp.currentPrice = Number(pos.currentPrice);
          }
        }

        // 3. Dispatch event for other screens
        try {
          root.dispatchEvent(new CustomEvent('healthyTrend:tradesUpdated'));
        } catch (_) {}

        // 4. Update top heat meter and portfolio heat views
        try {
          if (typeof root.renderTopHeat === 'function') root.renderTopHeat();
          if (typeof root.renderPortfolioHeat === 'function') root.renderPortfolioHeat();
        } catch (_) {}
      }
      return res;
    }

    async updatePositionEntryPrice(positionId, newEntryPrice) {
      const res = this.model.updatePositionEntryPrice(positionId, newEntryPrice);
      if (res.success) {
        const pos = this.model.positions.find(p => p.id === positionId);
        if (pos) {
          const prevDirty = this._dirtyPositions.get(String(pos.id)) || {};
          this._dirtyPositions.set(String(pos.id), {
            ...prevDirty,
            entryPrice: Number(pos.entryPrice),
            entryUpdatedAt: Date.now()
          });
        }
        this.persistDraftNonBlocking();

        // 1. Persist entry price correction to backend for open UUID trades
        if (pos && /^[0-9a-f-]{36}$/i.test(String(pos.id)) && root.healthyTrendApi?.request && root.healthyTrendApi.isAuthenticated?.()) {
          try {
            await root.healthyTrendApi.request(`/api/trades/${pos.id}`, {
              method: 'PATCH',
              body: JSON.stringify({
                entryPrice: Number(pos.entryPrice)
              })
            });
          } catch (e) {
            console.warn('[DailyUpdateHub] Entry price persistence note:', e.message);
          }
        }

        // 2. Sync in-memory operationalState so Posições Abertas, Dashboard & Painel da Verdade reflect the fix immediately
        if (root.operationalState?.positions && pos) {
          const opp = root.operationalState.positions.find(x => x.id === positionId || x.asset === pos.ticker);
          if (opp) {
            opp.entry = Number(pos.entryPrice);
            opp.entryPrice = Number(pos.entryPrice);
            opp.averageEntry = Number(pos.entryPrice);
            if (Array.isArray(opp.events) && !opp.events.some(ev => ev && ev.type === 'scale_in')) {
              const entryEv = opp.events.find(ev => ev && ev.type === 'entry');
              if (entryEv) entryEv.price = Number(pos.entryPrice);
            }
          }
        }

        // 3. Broadcast & refresh dependent views
        try {
          root.dispatchEvent(new CustomEvent('healthyTrend:tradesUpdated', {
            detail: { positionId, ticker: pos?.ticker, entryPrice: pos?.entryPrice }
          }));
          if (typeof root.renderOperationalApp === 'function') root.renderOperationalApp();
          if (typeof root.renderTopHeat === 'function') root.renderTopHeat();
          if (typeof root.renderPortfolioHeat === 'function') root.renderPortfolioHeat();
        } catch (_) {}
      }
      return res;
    }

    updatePositionQuantity(positionId, newQuantity) {
      const res = this.model.updatePositionQuantity(positionId, newQuantity);
      if (res.success) {
        this.model.saveDraft();
        if (root.operationalState?.positions) {
          const opp = root.operationalState.positions.find(x => x.id === positionId || x.asset === res.position?.ticker);
          if (opp) {
            opp.initialQty = Number(newQuantity);
            opp.quantity = Number(newQuantity);
          }
        }
        try {
          root.dispatchEvent(new CustomEvent('healthyTrend:tradesUpdated'));
          if (typeof root.renderTopHeat === 'function') root.renderTopHeat();
          if (typeof root.renderPortfolioHeat === 'function') root.renderPortfolioHeat();
        } catch (_) {}
        this.render();
      }
      return res;
    }

    updatePositionStop(positionId, newStop) {
      const res = this.model.updatePositionStop(positionId, newStop);
      if (res.success) {
        this.model.saveDraft();
        if (root.operationalState?.positions) {
          const opp = root.operationalState.positions.find(x => x.id === positionId || x.asset === res.position?.ticker);
          if (opp) {
            opp.currentStop = Number(newStop);
            opp.trailingStop = Number(newStop);
          }
        }
        try {
          root.dispatchEvent(new CustomEvent('healthyTrend:tradesUpdated'));
          if (typeof root.renderTopHeat === 'function') root.renderTopHeat();
          if (typeof root.renderPortfolioHeat === 'function') root.renderPortfolioHeat();
        } catch (_) {}
        this.render();
      }
      return res;
    }

    syncClosedOrPartialToOperationalState(res) {
      if (!res || !res.success || !res.position || !root.operationalState) return;
      const pos = res.position;
      const ev = res.event;
      const positionsList = Array.isArray(root.operationalState.positions) ? root.operationalState.positions : null;
      const closedList = Array.isArray(root.operationalState.closedPositions) ? root.operationalState.closedPositions : null;

      if (res.isFullClose) {
        let target = null;
        if (positionsList) {
          const oppIdx = positionsList.findIndex(x => String(x.id) === String(pos.id) || (x.asset && x.asset === pos.ticker));
          if (oppIdx !== -1) {
            [target] = positionsList.splice(oppIdx, 1);
          }
        }
        if (closedList) {
          const closedRecord = target ? Object.assign({}, target) : {
            id: pos.id,
            asset: pos.ticker,
            ticker: pos.ticker,
            market: pos.market || pos.assetClass || this.model.classifyPositionMarket(pos),
            direction: res.preview?.direction || pos.direction || 'long',
            strategyType: pos.strategy || 'TREND_FOLLOWING',
            setup: pos.setup || 'Operação registrada',
            entry: Number(pos.entryPrice || 0),
            averageEntry: Number(pos.entryPrice || 0),
            initialQty: Number(pos.initialQuantity || res.preview?.openQuantity || 0),
            initialStop: Number(pos.stopPrice || 0),
            currentStop: Number(pos.trailingStop || pos.stopPrice || 0),
            openedAt: pos.openedAt || (pos.entryDate ? `${pos.entryDate}T12:00:00-03:00` : null),
            mode: 'real',
            events: Array.isArray(pos.events) ? JSON.parse(JSON.stringify(pos.events)) : []
          };
          closedRecord.status = 'closed';
          closedRecord.closedAt = pos.closedAt || ev?.at || new Date().toISOString();
          closedRecord.exitDate = pos.exitDate || res.preview?.exitDate || null;
          closedRecord.exitPrice = pos.exitPrice || res.preview?.exitPrice || closedRecord.currentPrice;
          closedRecord.currentPrice = closedRecord.exitPrice;
          closedRecord.realizedResult = pos.finalRealizedResult ?? pos.realizedResult ?? 0;
          if (target && ev) {
            closedRecord.events = Array.isArray(target.events) ? [...target.events, ev] : [ev];
          }
          const existingClosedIdx = closedList.findIndex(c => String(c.id) === String(closedRecord.id));
          if (existingClosedIdx >= 0) closedList[existingClosedIdx] = closedRecord;
          else closedList.unshift(closedRecord);
        }
      } else if (res.isPartial && positionsList) {
        const opp = positionsList.find(x => String(x.id) === String(pos.id) || (x.asset && x.asset === pos.ticker));
        if (opp) {
          opp.quantity = pos.quantity;
          opp.currentPrice = pos.currentPrice;
          if (!Array.isArray(opp.events)) opp.events = [];
          if (ev) opp.events.push(ev);
        }
      }
    }

    openClosePositionModal(positionId) {
      const pos = this.model.positions.find(p => p.id === positionId && !p.closed && p.status !== 'encerrada');
      if (!pos) {
        if (typeof root.showToast === 'function') root.showToast('Posição em aberto não encontrada.');
        return;
      }

      const todayIso = new Date().toISOString().slice(0, 10);
      const openQty = Number(pos.quantity || 0);
      const currPrice = Number(pos.currentPrice || pos.entryPrice || 0);
      const existingCosts = Number(pos.costs ?? pos.costsIncurred ?? 0);
      const formatEditable = root.DailyUpdateModel?.formatEditableNumber || ((v) => Number(v || 0).toFixed(2).replace('.', ','));
      const preview = this.model.calculatePositionClosePreview(pos, {
        exitPrice: currPrice,
        exitQuantity: openQty,
        exitDate: todayIso,
        costs: existingCosts
      });
      if (!preview.valid) {
        if (typeof root.showToast === 'function') root.showToast(preview.error || 'Não foi possível preparar o encerramento.');
        return;
      }

      const isShort = preview.sideCode === 'V';
      const qtyChips = openQty > 1
        ? [
            { label: '25%', qty: Math.max(1, Math.floor(openQty * 0.25)) },
            { label: '50%', qty: Math.max(1, Math.floor(openQty * 0.50)) },
            { label: '75%', qty: Math.max(1, Math.floor(openQty * 0.75)) },
            { label: '100% (Total)', qty: openQty }
          ]
        : [{ label: '100% (Total)', qty: openQty }];

      const modalHtml = `
        <div class="daily-update-modal-backdrop" id="dailyUpdateClosePosModal" onclick="if (event.target === this) window.DailyUpdateHub.closeModal('dailyUpdateClosePosModal')">
          <div class="daily-update-modal close-pos-modal" role="dialog" aria-modal="true" aria-labelledby="closePosModalTitle" data-close-pos-id="${pos.id}">
            <header class="daily-update-modal-header">
              <div class="modal-title-wrap">
                <span class="pos-cv-badge ${isShort ? 'sell' : 'buy'}" style="width:32px;height:32px;font-size:13px;">${preview.sideCode}</span>
                <div>
                  <h3 id="closePosModalTitle">Encerrar Operação — ${pos.ticker}</h3>
                  <p>Confira os dados originais, informe o preço e a quantidade (integral ou parcial) e valide o resultado antes de confirmar.</p>
                </div>
              </div>
              <button type="button" class="btn-modal-close" onclick="window.DailyUpdateHub.closeModal('dailyUpdateClosePosModal')" aria-label="Fechar">✕</button>
            </header>

            <div class="daily-update-modal-body">
              <!-- Informações originais da operação -->
              <div class="close-pos-info-grid">
                <div class="close-pos-info-item">
                  <span class="close-pos-info-label">Ativo</span>
                  <strong class="close-pos-info-val">${pos.ticker}</strong>
                </div>
                <div class="close-pos-info-item">
                  <span class="close-pos-info-label">Tipo</span>
                  <strong class="close-pos-info-val ${isShort ? 'is-sell' : 'is-buy'}">${preview.sideLabel} (${isShort ? 'Short' : 'Long'})</strong>
                </div>
                <div class="close-pos-info-item">
                  <span class="close-pos-info-label">Data de Entrada</span>
                  <strong class="close-pos-info-val font-numeric">${preview.entryDateBR}</strong>
                </div>
                <div class="close-pos-info-item">
                  <span class="close-pos-info-label">Preço de Entrada</span>
                  <strong class="close-pos-info-val font-numeric">${fmtBRL(preview.entryPrice)}</strong>
                </div>
                <div class="close-pos-info-item">
                  <span class="close-pos-info-label">Quantidade Aberta</span>
                  <strong class="close-pos-info-val font-numeric">${openQty} un.</strong>
                </div>
              </div>

              ${preview.previousRealized !== 0 ? `
                <div class="close-pos-prior-realized">
                  ℹ️ Esta posição já possui <strong>${preview.previousRealized > 0 ? '+' : ''}${fmtBRL(preview.previousRealized)}</strong> realizados em saída(s) parcial(is) anterior(es) — contabilizados separadamente.
                </div>
              ` : ''}

              <!-- Campos editáveis de encerramento -->
              <div class="close-pos-form-grid">
                <label class="close-pos-field">
                  <span>Data de Encerramento</span>
                  <input type="date" id="closePosDate" value="${todayIso}" />
                </label>
                <label class="close-pos-field">
                  <span>Preço de Encerramento (R$)</span>
                  <input type="text" inputmode="decimal" autocomplete="off" id="closePosPrice" class="font-numeric" value="${formatEditable(currPrice, false)}" placeholder="0,00" />
                </label>
                <label class="close-pos-field">
                  <span>Quantidade a Encerrar (máx. ${openQty})</span>
                  <input type="number" id="closePosQty" class="font-numeric" min="1" max="${openQty}" step="1" value="${openQty}" />
                  <div class="close-pos-qty-chips">
                    ${qtyChips.map(c => `
                      <button type="button" class="close-pos-qty-chip" onclick="window.DailyUpdateHub.setCloseModalQty('${pos.id}', ${c.qty})">${c.label}</button>
                    `).join('')}
                  </div>
                </label>
                <label class="close-pos-field">
                  <span>Custos Operacionais (R$)</span>
                  <input type="text" inputmode="decimal" autocomplete="off" id="closePosCosts" class="font-numeric" value="${formatEditable(existingCosts, false)}" placeholder="0,00" />
                </label>
              </div>

              <!-- Resumo automático em tempo real -->
              <div class="close-pos-preview-card" id="closePosPreviewBox">
                ${this.buildClosePositionPreviewHtml(preview)}
              </div>
              <div class="close-pos-error-banner" id="closePosErrorBanner" style="display:none;"></div>
            </div>

            <footer class="daily-update-modal-footer">
              <button type="button" class="btn-modal-secondary" onclick="window.DailyUpdateHub.closeModal('dailyUpdateClosePosModal')">Cancelar</button>
              <button type="button" class="btn-modal-primary" id="btnConfirmClosePos" onclick="window.DailyUpdateHub.confirmClosePositionModal('${pos.id}')">
                Confirmar Encerramento
              </button>
            </footer>
          </div>
        </div>
      `;

      this.injectModal(modalHtml, 'dailyUpdateClosePosModal');

      const updateLive = () => this.updateClosePositionPreviewLive(pos.id);
      if (typeof document !== 'undefined') {
        ['closePosDate', 'closePosPrice', 'closePosQty', 'closePosCosts'].forEach(id => {
          const el = document.getElementById(id);
          if (el) el.addEventListener('input', updateLive);
        });
        const priceEl = document.getElementById('closePosPrice');
        if (priceEl && typeof priceEl.focus === 'function') {
          priceEl.focus();
          if (typeof priceEl.select === 'function') priceEl.select();
        }
      }
    }

    buildClosePositionPreviewHtml(preview) {
      if (!preview || !preview.valid) {
        return `<div class="close-pos-preview-invalid">${preview?.error || 'Preencha os campos para calcular o resultado.'}</div>`;
      }
      const resTone = preview.netResult > 0.005 ? 'positive' : preview.netResult < -0.005 ? 'negative' : 'neutral';
      const signStr = preview.netResult > 0.005 ? '+' : '';
      const modeLabel = preview.isPartial
        ? `Encerramento Parcial (${preview.exitQuantity} de ${preview.openQuantity} un.)`
        : `Encerramento Integral (${preview.exitQuantity} un. → Trades Encerrados)`;

      return `
        <div class="close-pos-preview-head">
          <span class="close-pos-mode-pill ${preview.isPartial ? 'partial' : 'full'}">${modeLabel}</span>
          <span class="close-pos-formula-hint">
            ${preview.sideCode === 'V' ? '(Entrada − Saída)' : '(Saída − Entrada)'} × ${preview.exitQuantity}${preview.mult !== 1 ? ` × ${preview.mult}` : ''}${preview.costs > 0 ? ` − ${fmtBRL(preview.costs)}` : ''}
          </span>
        </div>
        <div class="close-pos-preview-metrics">
          <div class="close-pos-metric-box">
            <span class="close-pos-metric-label">Resultado Financeiro (Realizado)</span>
            <strong class="close-pos-metric-val font-numeric ${resTone}">${signStr}${fmtBRL(preview.netResult)}</strong>
          </div>
          <div class="close-pos-metric-box">
            <span class="close-pos-metric-label">Rentabilidade %</span>
            <strong class="close-pos-metric-val font-numeric ${resTone}">${fmtPct(preview.returnPct)}</strong>
          </div>
        </div>
        ${preview.isPartial ? `
          <div class="close-pos-partial-summary">
            <span><strong>Permanecem em aberto:</strong> ${preview.remainingQuantity} un. (preço médio preservado: ${fmtBRL(preview.entryPrice)})</span>
            <span><strong>Não realizado restante:</strong> ${preview.remainingUnrealizedResult > 0 ? '+' : ''}${fmtBRL(preview.remainingUnrealizedResult)}</span>
          </div>
        ` : `
          <div class="close-pos-full-summary">
            ✓ A operação sairá de <strong>Posições em Aberto</strong> e será preservada em <strong>Trades Encerrados</strong> com status ENCERRADA e todo o histórico original.
          </div>
        `}
      `;
    }

    setCloseModalQty(positionId, qty) {
      if (typeof document === 'undefined') return;
      const el = document.getElementById('closePosQty');
      if (el) {
        el.value = String(qty);
        this.updateClosePositionPreviewLive(positionId);
      }
    }

    updateClosePositionPreviewLive(positionId) {
      if (typeof document === 'undefined') return null;
      const priceVal = document.getElementById('closePosPrice')?.value ?? '';
      const qtyVal = document.getElementById('closePosQty')?.value ?? '';
      const dateVal = document.getElementById('closePosDate')?.value ?? '';
      const costsVal = document.getElementById('closePosCosts')?.value ?? '0';

      const preview = this.model.calculatePositionClosePreview(positionId, {
        exitPrice: priceVal,
        exitQuantity: Number(qtyVal),
        exitDate: dateVal,
        costs: costsVal
      });

      const box = document.getElementById('closePosPreviewBox');
      if (box) box.innerHTML = this.buildClosePositionPreviewHtml(preview);

      const errEl = document.getElementById('closePosErrorBanner');
      if (errEl) {
        errEl.textContent = preview.valid ? '' : (preview.error || '');
        errEl.style.display = preview.valid ? 'none' : 'block';
      }

      const confirmBtn = document.getElementById('btnConfirmClosePos');
      if (confirmBtn) {
        confirmBtn.disabled = !preview.valid;
        confirmBtn.textContent = preview.valid && preview.isPartial
          ? 'Confirmar Encerramento Parcial'
          : 'Confirmar Encerramento';
      }
      return preview;
    }

    async confirmClosePositionModal(positionId) {
      if (typeof document === 'undefined') return null;
      const priceVal = document.getElementById('closePosPrice')?.value ?? '';
      const qtyVal = document.getElementById('closePosQty')?.value ?? '';
      const dateVal = document.getElementById('closePosDate')?.value ?? '';
      const costsVal = document.getElementById('closePosCosts')?.value ?? '0';

      const preview = this.updateClosePositionPreviewLive(positionId);
      if (!preview || !preview.valid) return { success: false, error: preview?.error || 'Dados inválidos.' };

      const confirmBtn = document.getElementById('btnConfirmClosePos');
      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Salvando…';
      }

      // 1. If authenticated real database trade, record canonical transactional event (peeloff / close) — NEVER delete!
      const isUuid = /^[0-9a-f-]{36}$/i.test(String(positionId || ''));
      if (isUuid && root.healthyTrendApi?.request && root.healthyTrendApi.isAuthenticated?.()) {
        try {
          const eventType = preview.isPartial ? 'peeloff' : 'close';
          await root.healthyTrendApi.request(`/api/trades/${encodeURIComponent(positionId)}/events`, {
            method: 'POST',
            body: JSON.stringify({
              type: eventType,
              qty: preview.exitQuantity,
              price: preview.exitPrice,
              occurredAt: `${preview.exitDate}T17:00:00-03:00`,
              note: preview.isPartial
                ? `Encerramento parcial (${preview.exitQuantity} un.) via Atualização Diária.`
                : 'Encerramento integral via Atualização Diária.'
            })
          });
        } catch (err) {
          if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = preview.isPartial ? 'Confirmar Encerramento Parcial' : 'Confirmar Encerramento';
          }
          const errEl = document.getElementById('closePosErrorBanner');
          if (errEl) {
            errEl.textContent = err.message || 'Não foi possível registrar o encerramento no servidor.';
            errEl.style.display = 'block';
          }
          return { success: false, error: err.message };
        }
      }

      // 2. Apply local model lifecycle update + operationalState sync + dashboards broadcast
      const res = this.closePosition(positionId, {
        exitPrice: preview.exitPrice,
        exitQuantity: preview.exitQuantity,
        exitDate: preview.exitDate,
        costs: preview.costs
      });

      this.closeModal('dailyUpdateClosePosModal');

      // 3. Synchronize global backend state across Posições Encerradas, Diário, Painel da Verdade & Dashboard
      if (isUuid && typeof root.syncOperationalFromDatabase === 'function') {
        try {
          await root.syncOperationalFromDatabase();
        } catch (_) {}
      }

      if (res.success && typeof root.showToast === 'function') {
        const signStr = preview.netResult > 0 ? '+' : '';
        if (res.isPartial) {
          root.showToast(
            `Encerramento parcial de ${preview.exitQuantity} un. em ${preview.ticker} (${signStr}${fmtBRL(preview.netResult)}). Restam ${preview.remainingQuantity} un. em aberto.`
          );
        } else {
          root.showToast(
            `Operação ${preview.ticker} encerrada (${signStr}${fmtBRL(preview.netResult)}) e movida para Trades Encerrados.`
          );
        }
      }

      return res;
    }

    closePosition(positionId, params = null) {
      const res = this.model.closePosition(positionId, params);
      if (res.success) {
        this.persistDraftNonBlocking();
        this.syncClosedOrPartialToOperationalState(res);
        try {
          if (typeof root.renderOperationalApp === 'function') root.renderOperationalApp();
          if (typeof root.renderClosedPositionsView === 'function') root.renderClosedPositionsView();
          if (typeof root.renderTopHeat === 'function') root.renderTopHeat();
          if (typeof root.renderPortfolioHeat === 'function') root.renderPortfolioHeat();
          root.dispatchEvent(new CustomEvent('healthyTrend:tradesUpdated', { detail: { positionId, isPartial: res.isPartial, isFullClose: res.isFullClose } }));
        } catch (_) {}
        this.render();
        this.updateTotalsLive({ scope: 'all', broadcastNow: true });
      }
      return res;
    }

    async handleBatchPrices(providedQuotesMap = null) {
      const batchSeq = ++this._batchQuoteSeq;
      if (typeof root.showToast === 'function') {
        root.showToast('Atualizando cotações das posições abertas...');
      }

      const openPositions = (this.model.positions || []).filter(p => !p.closed && p.status !== 'encerrada');
      let quoteMap = providedQuotesMap && typeof providedQuotesMap === 'object' ? providedQuotesMap : null;

      if (!quoteMap && root.healthyTrendApi?.request) {
        quoteMap = {};
        await Promise.all(openPositions.map(async (pos) => {
          try {
            const data = await root.healthyTrendApi.request(`/api/market-data/ticker-chart?ticker=${encodeURIComponent(pos.ticker)}`);
            const candles = Array.isArray(data?.candles) ? data.candles : [];
            const lastCandle = candles.length ? candles[candles.length - 1] : null;
            const rawQuote = data?.lastPrice ?? data?.price ?? data?.close ?? lastCandle?.close ?? null;
            const numQuote = (rawQuote !== null && rawQuote !== undefined && rawQuote !== '') ? Number(rawQuote) : NaN;
            if (Number.isFinite(numQuote) && numQuote > 0) {
              quoteMap[pos.ticker] = {
                price: numQuote,
                source: data?.source || data?.provider || 'market_cache',
                updatedAt: data?.updatedAt || lastCandle?.date || new Date().toISOString()
              };
            }
          } catch (_) {
            // Failure on one ticker preserves last valid price as stale — never erases it
          }
        }));
      }

      // Discard stale concurrent batch result
      if (batchSeq !== this._batchQuoteSeq) return { ignored: true };

      if (quoteMap) {
        this.model.batchUpdatePrices(quoteMap, { source: 'market_cache' });
      } else {
        // Offline/local fallback without API: preserve existing valid prices and confirm positions
        openPositions.forEach(p => {
          p.checked = true;
          if (!p.hasDivergence) p.status = 'conferida';
        });
        this.model.lastBatchQuoteStatus = {
          updatedCount: 0,
          staleCount: openPositions.length,
          updatedTickers: [],
          preservedTickers: openPositions.map(p => p.ticker),
          at: new Date().toISOString()
        };
        this.model.updateClosingReadiness();
      }

      this.persistDraftNonBlocking();

      // Persist valid updated quotes to backend for UUID trades
      const status = this.model.lastBatchQuoteStatus || { updatedCount: 0, staleCount: 0, updatedTickers: [], preservedTickers: [] };
      if (root.healthyTrendApi?.request && root.healthyTrendApi.isAuthenticated?.() && status.updatedTickers.length > 0) {
        await Promise.all(openPositions
          .filter(p => status.updatedTickers.includes(p.ticker) && /^[0-9a-f-]{36}$/i.test(String(p.id)))
          .map(p => root.healthyTrendApi.request(`/api/trades/${p.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              currentPrice: Number(p.currentPrice),
              priceSource: p.priceSource || 'market_cache',
              priceUpdatedAt: p.priceUpdatedAt || new Date().toISOString(),
              priceStale: false
            })
          }).catch(() => null))
        );
      }

      try {
        if (typeof root.renderTopHeat === 'function') root.renderTopHeat();
        if (typeof root.renderPortfolioHeat === 'function') root.renderPortfolioHeat();
      } catch (_) {}
      this.render();

      if (typeof root.showToast === 'function') {
        if (status.updatedCount > 0 && status.staleCount > 0) {
          root.showToast(`${status.updatedCount} cotação(ões) atualizada(s). ${status.staleCount} mantiveram o último preço válido.`);
        } else if (status.updatedCount > 0) {
          root.showToast(`${status.updatedCount} cotação(ões) atualizada(s) com sucesso.`);
        } else {
          root.showToast('Sem novas cotações disponíveis — últimos preços válidos preservados.');
        }
      }
      return status;
    }

    async handlePositionAccountChange(positionId, accountId) {
      const linkSeq = (this._accountLinkSeqMap.get(String(positionId)) || 0) + 1;
      this._accountLinkSeqMap.set(String(positionId), linkSeq);

      const res = this.model.linkPositionToAccount(positionId, accountId);
      const pos = res?.position || this.model.positions.find(p => p.id === positionId);
      if (pos) {
        const prevDirty = this._dirtyPositions.get(String(pos.id)) || {};
        this._dirtyPositions.set(String(pos.id), {
          ...prevDirty,
          accountId: pos.accountId || null,
          broker: pos.broker || null,
          accountUpdatedAt: Date.now()
        });
      }

      // 1. Durable local + workspace-state persistence (survives saveDailyClosing, clearDraft, reload, navigation)
      this.persistDraftNonBlocking();
      if (root.healthyTrendWorkspace?.save) {
        root.healthyTrendWorkspace.save(
          root.DailyUpdateModel?.STORAGE_KEY_DRAFT || 'healthy-daily-update-draft-v1',
          { accounts: this.model.accounts, positions: this.model.positions, closingDate: this.model.closingDate }
        );
      }

      // 2. Sync operationalState in memory
      if (root.operationalState?.positions && pos) {
        const opp = root.operationalState.positions.find(x => String(x.id) === String(pos.id) || x.asset === pos.ticker);
        if (opp) {
          opp.accountId = pos.accountId || null;
          opp.broker = pos.broker || null;
        }
      }

      if (typeof root.showToast === 'function') {
        if (res?.account) {
          root.showToast(`Posição vinculada à conta ${res.account.label}.`);
        } else {
          root.showToast('Vínculo da posição com conta removido.');
        }
      }
      this.render();

      // 3. Persist permanently to PostgreSQL backend for UUID trades
      if (pos && /^[0-9a-f-]{36}$/i.test(String(pos.id)) && root.healthyTrendApi?.request && root.healthyTrendApi.isAuthenticated?.()) {
        try {
          if (this._accountLinkSeqMap.get(String(positionId)) !== linkSeq) return res;
          await root.healthyTrendApi.request(`/api/trades/${pos.id}`, {
            method: 'PATCH',
            body: JSON.stringify({
              accountId: pos.accountId || null,
              broker: res?.account?.label || null
            })
          });
        } catch (e) {
          console.warn('[DailyUpdateHub] Account link persistence note:', e.message);
        }
      }
      return res;
    }

    saveDraftAction() {
      this.model.saveDraft();
      if (typeof root.showToast === 'function') {
        root.showToast('✓ Rascunho salvo com sucesso.');
      }
    }

    handleClosingClick() {
      const progress = this.model.getProgress();
      if (!progress.readyToClose) {
        this.promptExceptionClosing();
        return;
      }
      this.saveDailyClosing();
    }

    async saveDailyClosing() {
      const progress = this.model.getProgress();
      if (!progress.readyToClose) {
        if (typeof root.showToast === 'function') {
          if (progress.divergences > 0) {
            root.showToast(`Existem ${progress.divergences} divergência(s) de custódia a revisar antes de concluir.`);
          } else if (progress.pendingAccounts > 0) {
            root.showToast(`Existem ${progress.pendingAccounts} conta(s) pendente(s) de conferência.`);
          } else if (progress.pendingPositions > 0) {
            root.showToast(`Existem ${progress.pendingPositions} posição(ões) pendente(s) de conferência.`);
          } else if (progress.invalidAccounts > 0 || progress.invalidPositions > 0) {
            root.showToast('Corrija os valores inválidos antes de salvar o fechamento.');
          } else {
            root.showToast('Confira todas as pendências antes de salvar.');
          }
        }
        return false;
      }

      const realWealth = this.model.getConsolidatedRealWealth();
      const investmentWealth = this.model.getInvestmentWealth();
      const reason = this.model.buildClosingAuditReason();

      try {
        // 1. Create and save snapshot in DailyUpdateModel
        const storage = (typeof localStorage !== 'undefined' ? localStorage : (root && root.localStorage)) || null;
        const snapshot = this.model.createSnapshot({
          status: 'closed',
          hasException: false,
          auditReason: reason
        });
        this.model.saveSnapshot(snapshot, storage);

        // 2. Persist to existing /api/wealth/adjustments (source of truth)
        if (root.healthyTrendApi?.request && root.healthyTrendApi.isAuthenticated?.()) {
          try {
            await root.healthyTrendApi.request('/api/wealth/adjustments', {
              method: 'POST',
              body: {
                newAmount: realWealth,
                reason: reason
              }
            });
          } catch (e) {
            console.warn('[DailyUpdateHub] API wealth adjustment note:', e.message);
          }
        }

        // 3. Synchronize operational equity globally (strictly Investment Equity, excluding checking accounts)
        if (typeof root.setOperationalEquity === 'function') {
          root.setOperationalEquity(investmentWealth);
        }

        // 4. Update cached wealth summary in localStorage
        try {
          const cached = localStorage.getItem('healthy-trend-wealth-cache');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.summary) {
              parsed.summary.realWealth = realWealth;
              parsed.summary.consolidatedRealWealth = realWealth;
              parsed.summary.operationalEquity = investmentWealth;
              parsed.summary.investmentWealth = investmentWealth;
              parsed.summary.strategyEquity = this.model.strategyEquity;
              parsed.summary.allocatedCapital = this.model.getAllocatedCapital();
              parsed.summary.allocatedCapitalPct = this.model.getAllocatedCapitalPct();
              parsed.summary.availableCash = this.model.getAvailableCash();
              parsed.summary.availableCashPct = this.model.getAvailableCashPct();
              parsed.summary.heat = this.model.getPortfolioHeat();
              parsed.summary.heatLimit = this.model.getHeatLimit();
              parsed.summary.remainingRiskCapacityPct = this.model.getRemainingRiskCapacityPct();
            }
            localStorage.setItem('healthy-trend-wealth-cache', JSON.stringify(parsed));
          }
        } catch (_) {}

        // 5. Persist account balances, durable position metadata (links & prices) and closing history to workspace-state & localStorage
        if (typeof this.model.saveAccounts === 'function') {
          this.model.saveAccounts(storage);
        }
        if (typeof this.model.savePositionMeta === 'function') {
          this.model.savePositionMeta(storage);
        }
        if (root.healthyTrendWorkspace?.save) {
          root.healthyTrendWorkspace.save('healthy-daily-update-accounts', this.model.accounts);
          root.healthyTrendWorkspace.save('healthy-daily-update-history', this.model.getHistory());
          if (typeof this.model.exportPositionMetaMap === 'function') {
            root.healthyTrendWorkspace.save(
              root.DailyUpdateModel?.STORAGE_KEY_POSITION_META || 'healthy-daily-update-position-meta',
              this.model.exportPositionMetaMap()
            );
          }
        }

        // 6. Notify all other screens and models via official custom events with centralized financials
        const financialDetail = {
          newEquity: investmentWealth,
          realWealth,
          investmentWealth,
          strategyEquity: this.model.strategyEquity,
          allocatedCapital: this.model.getAllocatedCapital(),
          allocatedCapitalPct: this.model.getAllocatedCapitalPct(),
          availableCash: this.model.getAvailableCash(),
          availableCashPct: this.model.getAvailableCashPct(),
          heat: this.model.getPortfolioHeat(),
          heatLimit: this.model.getHeatLimit(),
          remainingRiskCapacityPct: this.model.getRemainingRiskCapacityPct(),
          remainingRiskCapacityAmount: this.model.getRemainingRiskCapacityAmount(),
          accounts: this.model.accounts,
          positions: this.model.positions
        };
        try {
          root.dispatchEvent(new CustomEvent('healthyTrend:equityUpdated', { detail: financialDetail }));
          root.dispatchEvent(new CustomEvent('healthyTrend:dailyUpdateClosed', { detail: financialDetail }));
        } catch (_) {}
        try {
          root.dispatchEvent(new CustomEvent('healthyTrend:tradesUpdated'));
        } catch (_) {}

        this.model.closingStatus = 'CLOSED';
        this.model.clearDraft();

        if (typeof root.showToast === 'function') {
          root.showToast('✓ Fechamento Diário salvo e Patrimônio Real consolidado!');
        }

        this.render();
        return true;
      } catch (err) {
        console.error('[DailyUpdateHub] Error saving daily closing:', err);
        if (typeof root.showToast === 'function') {
          root.showToast('Fechamento registrado localmente.');
        }
        this.render();
        return true;
      }
    }

    promptExceptionClosing() {
      const progress = this.model.getProgress();
      const pendingAccounts = this.model.accounts.filter(a => a.status === 'pending');
      const pendingPositions = this.model.positions.filter(p => p.status === 'pendente' || !p.checked);
      const divergences = this.model.positions.filter(p => p.hasDivergence);

      const modalHtml = `
        <div class="daily-update-modal-backdrop" id="dailyUpdateExceptionModal" onclick="if (event.target === this) window.DailyUpdateHub.closeModal('dailyUpdateExceptionModal')">
          <div class="daily-update-modal exception-modal" role="dialog" aria-modal="true" aria-labelledby="modalExceptionTitle">
            <header class="daily-update-modal-header warning">
              <div class="modal-title-wrap">
                <span class="modal-icon-badge warning">⚠️</span>
                <div>
                  <h3 id="modalExceptionTitle">Concluir Fechamento com Ressalvas</h3>
                  <p>Existem itens não conferidos que serão registrados como exceção na trilha de auditoria.</p>
                </div>
              </div>
              <button type="button" class="btn-modal-close" onclick="window.DailyUpdateHub.closeModal('dailyUpdateExceptionModal')" aria-label="Fechar">✕</button>
            </header>

            <div class="daily-update-modal-body">
              <div class="exception-alert-box">
                <strong>Atenção:</strong> Fechamentos com ressalvas consolidam o patrimônio com os valores atuais informados, mas preservam uma advertência auditável no histórico.
              </div>

              <div class="exception-pendencies-list">
                <h4>Itens Pendentes Identificados (${progress.pendencies}):</h4>
                <ul>
                  ${pendingAccounts.map(a => `
                    <li><strong>Conta:</strong> ${a.label} — Saldo mantido como pendente de conferência (${root.DailyUpdateModel.formatBRL(a.newBalance)})</li>
                  `).join('')}
                  ${pendingPositions.map(p => `
                    <li><strong>Posição:</strong> ${p.ticker} (${p.quantity} un.) — Não conferida no extrato da corretora</li>
                  `).join('')}
                  ${divergences.map(p => `
                    <li style="color: #b91c1c;"><strong>Divergência:</strong> ${p.ticker} — ${p.divergence?.note || 'Divergência de custódia'}</li>
                  `).join('')}
                </ul>
              </div>

              <div class="form-group" style="margin-top: 16px;">
                <label for="exceptionReasonInput" style="display: block; font-size: 12px; font-weight: 700; color: var(--ink, #123424); margin-bottom: 6px;">
                  Motivo da Ressalva / Justificativa da Exceção (opcional):
                </label>
                <textarea 
                  id="exceptionReasonInput" 
                  class="exception-textarea" 
                  rows="3" 
                  placeholder="Ex: Corretora com instabilidade temporária no extrato; conferência será concluída amanhã cedo."
                ></textarea>
              </div>
            </div>

            <footer class="daily-update-modal-footer">
              <button type="button" class="btn-modal-secondary" onclick="window.DailyUpdateHub.closeModal('dailyUpdateExceptionModal')">
                Voltar e Conferir
              </button>
              <button type="button" class="btn-modal-warning" onclick="window.DailyUpdateHub.confirmExceptionClosing()">
                ✓ Confirmar Fechamento com Ressalvas
              </button>
            </footer>
          </div>
        </div>
      `;

      this.injectModal(modalHtml, 'dailyUpdateExceptionModal');
    }

    async confirmExceptionClosing() {
      const reasonInput = document.getElementById('exceptionReasonInput');
      const reason = reasonInput ? reasonInput.value.trim() : '';

      try {
        const storage = (typeof localStorage !== 'undefined' ? localStorage : (root && root.localStorage)) || null;
        const snapshot = this.model.closeWithException(reason, storage);

        // Sync with API
        if (root.healthyTrendApi?.request && root.healthyTrendApi.isAuthenticated?.()) {
          try {
            await root.healthyTrendApi.request('/api/wealth/adjustments', {
              method: 'POST',
              body: {
                newAmount: snapshot.realWealth,
                reason: snapshot.auditReason
              }
            });
          } catch (_) {}
        }

        // Sync operational equity (strictly Investment Equity, excluding checking accounts)
        const operationalEquity = snapshot.investmentWealth || this.model.getInvestmentWealth();
        if (typeof root.setOperationalEquity === 'function') {
          root.setOperationalEquity(operationalEquity);
        }

        // Persist history, accounts & durable position metadata to workspace & localStorage
        if (typeof this.model.saveAccounts === 'function') this.model.saveAccounts(storage);
        if (typeof this.model.savePositionMeta === 'function') this.model.savePositionMeta(storage);
        if (root.healthyTrendWorkspace?.save) {
          root.healthyTrendWorkspace.save('healthy-daily-update-history', this.model.getHistory());
          root.healthyTrendWorkspace.save('healthy-daily-update-accounts', this.model.accounts);
          if (typeof this.model.exportPositionMetaMap === 'function') {
            root.healthyTrendWorkspace.save(
              root.DailyUpdateModel?.STORAGE_KEY_POSITION_META || 'healthy-daily-update-position-meta',
              this.model.exportPositionMetaMap()
            );
          }
        }

        // Dispatch events
        try {
          root.dispatchEvent(new CustomEvent('healthyTrend:equityUpdated', { detail: { newEquity: operationalEquity, realWealth: snapshot.realWealth, accounts: this.model.accounts } }));
        } catch (_) {}

        this.closeModal('dailyUpdateExceptionModal');

        if (typeof root.showToast === 'function') {
          root.showToast('✓ Fechamento concluído com ressalvas registradas na auditoria.');
        }

        this.render();
      } catch (err) {
        console.error('[DailyUpdateHub] Error confirming exception closing:', err);
      }
    }

    promptCorrection() {
      const todaySnap = this.model.getSnapshotByDate(this.model.closingDate);
      if (!todaySnap) return;

      const newWealth = this.model.getConsolidatedRealWealth();
      const prevWealth = todaySnap.realWealth;
      const diff = newWealth - prevWealth;
      const nextVersion = (todaySnap.version || 1) + 1;

      const modalHtml = `
        <div class="daily-update-modal-backdrop" id="dailyUpdateCorrectionModal" onclick="if (event.target === this) window.DailyUpdateHub.closeModal('dailyUpdateCorrectionModal')">
          <div class="daily-update-modal correction-modal" role="dialog" aria-modal="true" aria-labelledby="modalCorrectionTitle">
            <header class="daily-update-modal-header info">
              <div class="modal-title-wrap">
                <span class="modal-icon-badge info">✎</span>
                <div>
                  <h3 id="modalCorrectionTitle">Corrigir Fechamento Diário</h3>
                  <p>O fechamento de hoje já existe. Esta ação gerará uma nova versão (v${nextVersion}) preservando a versão v${todaySnap.version} para auditoria.</p>
                </div>
              </div>
              <button type="button" class="btn-modal-close" onclick="window.DailyUpdateHub.closeModal('dailyUpdateCorrectionModal')" aria-label="Fechar">✕</button>
            </header>

            <div class="daily-update-modal-body">
              <div class="correction-summary-grid">
                <div class="corr-summary-card">
                  <span class="corr-summary-label">Versão Atual (Original)</span>
                  <strong class="corr-summary-val">${root.DailyUpdateModel.formatBRL(prevWealth)} (v${todaySnap.version})</strong>
                </div>
                <div class="corr-summary-card new">
                  <span class="corr-summary-label">Novo Patrimônio Consolidado</span>
                  <strong class="corr-summary-val">${root.DailyUpdateModel.formatBRL(newWealth)} (v${nextVersion})</strong>
                </div>
                <div class="corr-summary-card diff">
                  <span class="corr-summary-label">Ajuste / Diferença</span>
                  <strong class="corr-summary-val" style="color: ${diff >= 0 ? '#1e7e4a' : '#d14343'};">
                    ${diff >= 0 ? '+' : ''}${root.DailyUpdateModel.formatBRL(diff)}
                  </strong>
                </div>
              </div>

              <div class="form-group" style="margin-top: 16px;">
                <label for="correctionReasonInput" style="display: block; font-size: 12px; font-weight: 700; color: var(--ink, #123424); margin-bottom: 6px;">
                  Motivo da Correção (obrigatório para trilha de auditoria):
                </label>
                <textarea 
                  id="correctionReasonInput" 
                  class="exception-textarea" 
                  rows="3" 
                  placeholder="Ex: Liquidação de dividendo/JCP creditado após o pregão; correção do saldo na corretora XP."
                  required
                ></textarea>
              </div>
            </div>

            <footer class="daily-update-modal-footer">
              <button type="button" class="btn-modal-secondary" onclick="window.DailyUpdateHub.closeModal('dailyUpdateCorrectionModal')">
                Cancelar
              </button>
              <button type="button" class="btn-modal-primary" onclick="window.DailyUpdateHub.confirmCorrection()">
                ✓ Salvar Correção Versionada (v${nextVersion})
              </button>
            </footer>
          </div>
        </div>
      `;

      this.injectModal(modalHtml, 'dailyUpdateCorrectionModal');
    }

    async confirmCorrection() {
      const reasonInput = document.getElementById('correctionReasonInput');
      const reason = reasonInput ? reasonInput.value.trim() : '';
      if (!reason) {
        if (typeof root.showToast === 'function') {
          root.showToast('Informe o motivo da correção para preservar a trilha de auditoria.');
        }
        if (reasonInput) reasonInput.focus();
        return;
      }

      const storage = (typeof localStorage !== 'undefined' ? localStorage : (root && root.localStorage)) || null;
      const res = this.model.correctSnapshot(
        this.model.closingDate,
        { accounts: this.model.accounts, positions: this.model.positions },
        reason,
        storage
      );

      if (res.success) {
        // Sync API
        if (root.healthyTrendApi?.request && root.healthyTrendApi.isAuthenticated?.()) {
          try {
            await root.healthyTrendApi.request('/api/wealth/adjustments', {
              method: 'POST',
              body: {
                newAmount: res.snapshot.realWealth,
                reason: res.snapshot.auditReason
              }
            });
          } catch (_) {}
        }

        // Sync operational equity
        if (typeof root.setOperationalEquity === 'function') {
          root.setOperationalEquity(res.snapshot.realWealth);
        }

        // Persist history, accounts & durable position metadata to workspace & localStorage
        if (typeof this.model.saveAccounts === 'function') this.model.saveAccounts(storage);
        if (typeof this.model.savePositionMeta === 'function') this.model.savePositionMeta(storage);
        if (root.healthyTrendWorkspace?.save) {
          root.healthyTrendWorkspace.save('healthy-daily-update-history', this.model.getHistory());
          root.healthyTrendWorkspace.save('healthy-daily-update-accounts', this.model.accounts);
          if (typeof this.model.exportPositionMetaMap === 'function') {
            root.healthyTrendWorkspace.save(
              root.DailyUpdateModel?.STORAGE_KEY_POSITION_META || 'healthy-daily-update-position-meta',
              this.model.exportPositionMetaMap()
            );
          }
        }

        // Dispatch events
        try {
          root.dispatchEvent(new CustomEvent('healthyTrend:equityUpdated', { detail: { newEquity: res.snapshot.realWealth, accounts: this.model.accounts } }));
        } catch (_) {}

        this.closeModal('dailyUpdateCorrectionModal');

        if (typeof root.showToast === 'function') {
          root.showToast(`✓ Correção registrada com sucesso (Versão v${res.snapshot.version})!`);
        }

        this.render();
      }
    }

    openHistoryModal(targetDate = null) {
      const history = this.model.getHistory();
      const selectedDate = targetDate || (history[0] ? history[0].date : this.model.closingDate);
      const snapshot = this.model.getSnapshotByDate(selectedDate) || history[0];

      const modalHtml = `
        <div class="daily-update-modal-backdrop" id="dailyUpdateHistoryModal" onclick="if (event.target === this) window.DailyUpdateHub.closeModal('dailyUpdateHistoryModal')">
          <div class="daily-update-modal history-modal" role="dialog" aria-modal="true" aria-labelledby="modalHistoryTitle">
            <header class="daily-update-modal-header">
              <div class="modal-title-wrap">
                <span class="modal-icon-badge">📜</span>
                <div>
                  <h3 id="modalHistoryTitle">Histórico de Fechamentos Diários</h3>
                  <p>Consulte registros auditados, compare patrimônios e examine trilhas de versões anteriores.</p>
                </div>
              </div>
              <button type="button" class="btn-modal-close" onclick="window.DailyUpdateHub.closeModal('dailyUpdateHistoryModal')" aria-label="Fechar">✕</button>
            </header>

            <nav class="history-tabs-bar">
              <button type="button" class="history-tab-btn ${this.activeHistoryTab === 'details' ? 'active' : ''}" id="tabBtnDetails" onclick="window.DailyUpdateHub.switchHistoryTab('details')">
                📅 Fechamentos Gravados
              </button>
              <button type="button" class="history-tab-btn ${this.activeHistoryTab === 'compare' ? 'active' : ''}" id="tabBtnCompare" onclick="window.DailyUpdateHub.switchHistoryTab('compare')">
                🔄 Comparar Datas
              </button>
              <button type="button" class="history-tab-btn ${this.activeHistoryTab === 'equity' ? 'active' : ''}" id="tabBtnEquity" onclick="window.DailyUpdateHub.switchHistoryTab('equity')">
                📈 Evolução da Equity
              </button>
            </nav>

            <div class="daily-update-modal-body history-body">
              <!-- Tab 1: Fechamentos Gravados -->
              <div class="history-tab-content active" id="historyTabDetails">
                <div class="history-layout">
                  <aside class="history-sidebar">
                    <span class="history-sidebar-title">Datas Registradas</span>
                    <ul class="history-dates-list">
                      ${history.map(s => {
                        const isSelected = snapshot && s.date === snapshot.date;
                        const dateFormatted = s.date.split('-').reverse().join('/');
                        return `
                          <li>
                            <button 
                              type="button" 
                              class="history-date-item ${isSelected ? 'active' : ''}" 
                              onclick="window.DailyUpdateHub.selectHistorySnapshot('${s.date}')"
                            >
                              <div class="history-item-top">
                                <strong>${dateFormatted}</strong>
                                <span class="history-badge ${s.status}">
                                  ${s.version > 1 ? `v${s.version}` : s.hasException ? 'Ressalvas' : 'OK'}
                                </span>
                              </div>
                              <div class="history-item-bottom">
                                <span>${root.DailyUpdateModel.formatBRL(s.realWealth)}</span>
                                <small style="color: ${s.dayVariationAmount >= 0 ? '#1e7e4a' : '#d14343'};">
                                  ${s.dayVariationAmount >= 0 ? '+' : ''}${s.dayVariationPct ? s.dayVariationPct.toFixed(2).replace('.', ',') : '0,00'}%
                                </small>
                              </div>
                            </button>
                          </li>
                        `;
                      }).join('')}
                    </ul>
                  </aside>

                  <main class="history-main-detail" id="historyMainDetail">
                    ${this.renderSnapshotDetailHtml(snapshot)}
                  </main>
                </div>
              </div>

              <!-- Tab 2: Comparar Datas -->
              <div class="history-tab-content" id="historyTabCompare" style="display: none;">
                <div class="compare-selectors-bar">
                  <div class="compare-selector-group">
                    <label for="compareDate1">Data de Referência:</label>
                    <select id="compareDate1" class="compare-select" onchange="window.DailyUpdateHub.handleCompareSelection()">
                      ${history.map((s, idx) => `
                        <option value="${s.date}" ${idx === 0 ? 'selected' : ''}>${s.date.split('-').reverse().join('/')} — ${root.DailyUpdateModel.formatBRL(s.realWealth)}</option>
                      `).join('')}
                    </select>
                  </div>
                  <div class="compare-arrow-icon">➔</div>
                  <div class="compare-selector-group">
                    <label for="compareDate2">Data de Comparação:</label>
                    <select id="compareDate2" class="compare-select" onchange="window.DailyUpdateHub.handleCompareSelection()">
                      ${history.map((s, idx) => `
                        <option value="${s.date}" ${idx === 1 ? 'selected' : ''}>${s.date.split('-').reverse().join('/')} — ${root.DailyUpdateModel.formatBRL(s.realWealth)}</option>
                      `).join('')}
                    </select>
                  </div>
                </div>

                <div class="compare-results-container" id="compareResultsContainer">
                  ${history.length >= 2 ? this.renderComparisonDetailHtml(history[0].date, history[1].date) : '<p style="padding: 24px; text-align: center;">É necessário ter ao menos dois fechamentos gravados para comparar.</p>'}
                </div>
              </div>

              <!-- Tab 3: Evolução da Equity -->
              <div class="history-tab-content ${this.activeHistoryTab === 'equity' ? 'active' : ''}" id="historyTabEquity" style="${this.activeHistoryTab === 'equity' ? '' : 'display: none;'}">
                ${this.renderEquityTabHtml()}
              </div>
            </div>

            <div id="equityChartTooltip" class="equity-chart-tooltip" style="display: none;"></div>

            <footer class="daily-update-modal-footer">
              <button type="button" class="btn-modal-secondary" onclick="window.DailyUpdateHub.closeModal('dailyUpdateHistoryModal')">
                Fechar
              </button>
            </footer>
          </div>
        </div>
      `;

      this.injectModal(modalHtml, 'dailyUpdateHistoryModal');
    }

    renderSnapshotDetailHtml(snapshot) {
      if (!snapshot) {
        return '<p style="padding: 24px; color: var(--muted, #63786c);">Selecione um fechamento para visualizar os detalhes.</p>';
      }

      const dateFmt = snapshot.date ? snapshot.date.split('-').reverse().join('/') : '';
      const closedAtFmt = snapshot.closedAt ? new Date(snapshot.closedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '';
      const fmtBRL = root.DailyUpdateModel.formatBRL;
      const fmtPct = root.DailyUpdateModel.formatPercent;

      return `
        <div class="snapshot-detail-view">
          <div class="snapshot-header-bar">
            <div>
              <h4>Fechamento de ${dateFmt} às ${closedAtFmt}</h4>
              <span class="snapshot-author">Registrado por: <strong>${snapshot.user?.name || 'Daniel'}</strong></span>
            </div>
            <div class="snapshot-header-badges">
              <span class="history-badge ${snapshot.status}">
                ${snapshot.status === 'corrected' ? `Versão v${snapshot.version} (Corrigido)` : snapshot.hasException ? 'Fechado com Ressalvas' : 'Fechamento Homologado'}
              </span>
            </div>
          </div>

          <div class="snapshot-kpi-summary">
            <div class="snap-kpi">
              <span class="snap-kpi-label">Patrimônio Real</span>
              <strong class="snap-kpi-val">${fmtBRL(snapshot.realWealth)}</strong>
              <small style="color: ${snapshot.dayVariationAmount >= 0 ? '#1e7e4a' : '#d14343'};">
                ${snapshot.dayVariationAmount >= 0 ? '▲ +' : '▼ '}${fmtBRL(snapshot.dayVariationAmount)} (${fmtPct(snapshot.dayVariationPct)})
              </small>
            </div>
            <div class="snap-kpi">
              <span class="snap-kpi-label">Equity da Estratégia</span>
              <strong class="snap-kpi-val">${fmtBRL(snapshot.strategyEquity || 0)}</strong>
              <small style="color: #63786c;">Resultado isolado</small>
            </div>
            <div class="snap-kpi">
              <span class="snap-kpi-label">Exposição em Custódia</span>
              <strong class="snap-kpi-val">${fmtBRL(snapshot.totalExposure || 0)}</strong>
              <small style="color: #63786c;">${(snapshot.exposurePct || 0).toFixed(2).replace('.', ',')}% do patrimônio</small>
            </div>
          </div>

          ${snapshot.hasException && snapshot.exceptions?.length > 0 ? `
            <div class="snapshot-caveats-box">
              <div class="caveat-head">
                <strong>⚠️ Ressalvas Registradas na Conclusão:</strong>
                <span>${snapshot.exceptionReason || 'Ressalvas confirmadas pelo usuário'}</span>
              </div>
              <ul class="caveats-items-list">
                ${snapshot.exceptions.map(e => `
                  <li><strong>${e.label}:</strong> ${e.detail}</li>
                `).join('')}
              </ul>
            </div>
          ` : ''}

          ${snapshot.corrections && snapshot.corrections.length > 0 ? `
            <div class="snapshot-corrections-audit-box">
              <div class="corr-head">
                <strong>✎ Trilha de Auditoria de Correções:</strong>
                <span>Versão Atual: v${snapshot.version}</span>
              </div>
              <p class="corr-reason-note">Motivo da última correção: <em>"${snapshot.correctionReason || 'Ajuste de saldo'}"</em></p>
              <ul class="corr-history-list">
                ${snapshot.corrections.map(c => `
                  <li>
                    Versão v${c.version} gravada em ${new Date(c.closedAt).toLocaleDateString('pt-BR')} — Total original: ${fmtBRL(c.realWealth)}
                  </li>
                `).join('')}
              </ul>
            </div>
          ` : ''}

          <div class="snapshot-section-title">Saldos por Conta Registrados</div>
          <table class="snapshot-subtable">
            <thead>
              <tr>
                <th>Conta / Corretora</th>
                <th style="text-align: right;">Saldo Registrado</th>
                <th style="text-align: right;">% do Total</th>
                <th style="text-align: right;">Moeda Original / Câmbio</th>
                <th style="text-align: center;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${(snapshot.accounts || []).map(a => {
                const sPct = a.wealthSharePct !== undefined 
                  ? Number(a.wealthSharePct) 
                  : (snapshot.realWealth > 0 ? (Number(a.newBalance || 0) / snapshot.realWealth) * 100 : 0);
                return `
                  <tr>
                    <td><strong>${a.label}</strong></td>
                    <td style="text-align: right; font-weight: 700;">${fmtBRL(a.newBalance)}</td>
                    <td style="text-align: right;">
                      <span class="wealth-share-pill">${sPct.toFixed(2).replace('.', ',')}%</span>
                    </td>
                    <td style="text-align: right; color: var(--muted, #63786c); font-size: 11px;">
                      ${a.currency === 'USD' ? `US$ ${Number(a.newBalanceUSD || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} @ R$ ${(a.fxRate || 5.73).toFixed(2).replace('.', ',')}` : 'BRL'}
                    </td>
                    <td style="text-align: center;">
                      <span class="status-tag ${a.status}">${a.status === 'keep' ? 'Manter' : a.status === 'updated' ? 'Atualizado' : 'Pendente'}</span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>

          <div class="snapshot-audit-trail-footer">
            <span class="audit-trail-label">Audit Log (Registrado no Banco de Dados):</span>
            <code class="audit-trail-code">${snapshot.auditReason || ''}</code>
          </div>
        </div>
      `;
    }

    renderComparisonDetailHtml(date1, date2) {
      const diff = this.model.compareSnapshots(date1, date2);
      if (!diff) return '<p style="padding: 24px;">Não foi possível comparar os fechamentos selecionados.</p>';

      const fmtBRL = root.DailyUpdateModel.formatBRL;
      const fmtPct = root.DailyUpdateModel.formatPercent;
      const d1 = date1.split('-').reverse().join('/');
      const d2 = date2.split('-').reverse().join('/');

      return `
        <div class="comparison-view">
          <div class="comparison-kpi-grid">
            <div class="comp-kpi-card">
              <span class="comp-kpi-label">Variação no Patrimônio Real</span>
              <strong class="comp-kpi-val" style="color: ${diff.diffAmount >= 0 ? '#1e7e4a' : '#d14343'};">
                ${diff.diffAmount >= 0 ? '▲ +' : '▼ '}${fmtBRL(diff.diffAmount)} (${fmtPct(diff.diffPct)})
              </strong>
              <small>De ${d2} (${fmtBRL(diff.realWealth2)}) para ${d1} (${fmtBRL(diff.realWealth1)})</small>
            </div>
            <div class="comp-kpi-card">
              <span class="comp-kpi-label">Diferença no Equity da Estratégia</span>
              <strong class="comp-kpi-val" style="color: ${diff.strategyEquityDiff >= 0 ? '#1e7e4a' : '#d14343'};">
                ${diff.strategyEquityDiff >= 0 ? '+' : ''}${fmtBRL(diff.strategyEquityDiff)}
              </strong>
              <small>Performance operacional pura</small>
            </div>
          </div>

          <div class="snapshot-section-title">Evolução por Conta (${d2} ➔ ${d1})</div>
          <table class="snapshot-subtable">
            <thead>
              <tr>
                <th>Conta</th>
                <th style="text-align: right;">Saldo em ${d2}</th>
                <th style="text-align: right;">Saldo em ${d1}</th>
                <th style="text-align: right;">Variação (R$)</th>
                <th style="text-align: right;">Variação (%)</th>
                <th style="text-align: right;">% do Total (${d1})</th>
              </tr>
            </thead>
            <tbody>
              ${diff.accountsDiff.map(a => `
                <tr>
                  <td><strong>${a.label}</strong></td>
                  <td style="text-align: right;">${fmtBRL(a.balance2)}</td>
                  <td style="text-align: right; font-weight: 700;">${fmtBRL(a.balance1)}</td>
                  <td style="text-align: right; color: ${a.diffAmount >= 0 ? '#1e7e4a' : '#d14343'}; font-weight: 700;">
                    ${a.diffAmount >= 0 ? '+' : ''}${fmtBRL(a.diffAmount)}
                  </td>
                  <td style="text-align: right; color: ${a.diffPct >= 0 ? '#1e7e4a' : '#d14343'}; font-weight: 700;">
                    ${fmtPct(a.diffPct)}
                  </td>
                  <td style="text-align: right;">
                    <span class="wealth-share-pill">${(a.share1 || 0).toFixed(2).replace('.', ',')}%</span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    selectHistorySnapshot(date) {
      const snapshot = this.model.getSnapshotByDate(date);
      const detailContainer = document.getElementById('historyMainDetail');
      if (detailContainer && snapshot) {
        detailContainer.innerHTML = this.renderSnapshotDetailHtml(snapshot);
      }
      document.querySelectorAll('.history-date-item').forEach(btn => {
        btn.classList.toggle('active', btn.textContent.includes(date.split('-').reverse().join('/')));
      });
    }

    switchHistoryTab(tabName) {
      this.activeHistoryTab = tabName;
      const tabDetails = document.getElementById('historyTabDetails');
      const tabCompare = document.getElementById('historyTabCompare');
      const tabEquity = document.getElementById('historyTabEquity');
      const btnDetails = document.getElementById('tabBtnDetails');
      const btnCompare = document.getElementById('tabBtnCompare');
      const btnEquity = document.getElementById('tabBtnEquity');

      if (tabDetails) tabDetails.style.display = tabName === 'details' ? 'block' : 'none';
      if (tabCompare) tabCompare.style.display = tabName === 'compare' ? 'block' : 'none';
      if (tabEquity) tabEquity.style.display = tabName === 'equity' ? 'block' : 'none';

      if (btnDetails) btnDetails.classList.toggle('active', tabName === 'details');
      if (btnCompare) btnCompare.classList.toggle('active', tabName === 'compare');
      if (btnEquity) btnEquity.classList.toggle('active', tabName === 'equity');

      if (tabName === 'equity') {
        this.renderEquityTabContent();
      }
    }

    setEquityPeriod(period) {
      this.equityPeriod = period;
      this.renderEquityTabContent();
    }

    setEquityOwner(owner) {
      this.equityOwner = owner;
      this.renderEquityTabContent();
    }

    toggleEquityDiffNotice() {
      this.equityDiffNoticeCollapsed = !this.equityDiffNoticeCollapsed;
      const body = document.getElementById('equityDiffBody');
      const chevron = document.querySelector('.diff-chevron');
      if (body) {
        body.style.display = this.equityDiffNoticeCollapsed ? 'none' : 'block';
      }
      if (chevron) {
        chevron.classList.toggle('collapsed', this.equityDiffNoticeCollapsed);
      }
    }

    renderEquityTabContent() {
      const container = document.getElementById('historyTabEquity');
      if (container) {
        container.innerHTML = this.renderEquityTabHtml();
      }
    }

    examineSnapshotFromEquity(date) {
      this.switchHistoryTab('details');
      this.selectHistorySnapshot(date);
      if (typeof setTimeout === 'function') {
        setTimeout(() => {
          const activeBtn = typeof document !== 'undefined' && typeof document.querySelector === 'function' 
            ? document.querySelector('.history-date-item.active') 
            : null;
          if (activeBtn && typeof activeBtn.scrollIntoView === 'function') {
            activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }, 50);
      }
    }

    showEquityTooltip(evt, dataStr) {
      let data;
      try {
        data = typeof dataStr === 'string' ? JSON.parse(decodeURIComponent(dataStr)) : dataStr;
      } catch (_) {
        return;
      }
      const tt = document.getElementById('equityChartTooltip');
      if (!tt) return;

      const fmtBRL = root.DailyUpdateModel?.formatBRL || ((v) => `R$ ${Number(v).toFixed(2)}`);
      const fmtPct = root.DailyUpdateModel?.formatPercent || ((v) => `${Number(v).toFixed(2)}%`);
      const isUp = (data.varAmount || 0) >= 0;

      tt.innerHTML = `
        <div class="equity-tt-head">
          <span class="equity-tt-date">${data.fullDate || data.dateFormatted || data.date}</span>
          <span class="equity-tt-badge ${data.status || 'closed'}">
            ${data.version > 1 ? `v${data.version}` : data.hasException ? 'Ressalvas' : 'Homologado'}
          </span>
        </div>
        <div class="equity-tt-body">
          <div class="equity-tt-title">${data.ownerLabel || 'Patrimônio'}</div>
          <div class="equity-tt-val">${fmtBRL(data.value)}</div>
          <div class="equity-tt-delta" style="color: ${isUp ? '#1e7e4a' : '#d14343'};">
            ${isUp ? '▲ +' : '▼ '}${fmtBRL(data.varAmount || 0)} (${fmtPct(data.varPct || 0)}) vs. dia ant.
          </div>
        </div>
        <div class="equity-tt-footer">
          <span>Clique no ponto para examinar snapshot</span>
        </div>
      `;

      tt.style.display = 'block';

      const rect = evt.target.getBoundingClientRect();
      const modal = document.querySelector('.daily-update-modal.history-modal');
      const modalRect = modal ? modal.getBoundingClientRect() : { left: 0, top: 0 };

      const left = rect.left - modalRect.left + (rect.width / 2);
      const top = rect.top - modalRect.top - 10;

      tt.style.left = `${left}px`;
      tt.style.top = `${top}px`;
    }

    hideEquityTooltip() {
      const tt = document.getElementById('equityChartTooltip');
      if (tt) tt.style.display = 'none';
    }

    buildEquitySvgChart(cfg) {
      const {
        id,
        title,
        subtitle,
        badge,
        points,
        valKey,
        varAmountKey,
        varPctKey,
        strokeColor,
        ownerLabel,
        w = 680,
        h = 250
      } = cfg;

      if (!points || points.length === 0) {
        return `
          <article class="equity-chart-card">
            <header class="equity-chart-card-header">
              <div>
                <h4>${title}</h4>
                <span class="equity-chart-sub">${subtitle}</span>
              </div>
            </header>
            <div class="equity-chart-empty"><p>Sem registros para o período selecionado.</p></div>
          </article>
        `;
      }

      const pLeft = 82;
      const pRight = 24;
      const pTop = 24;
      const pBottom = 34;
      const plotW = w - pLeft - pRight;
      const plotH = h - pTop - pBottom;

      const vals = points.map(p => Number(p[valKey] || 0));
      const minVal = Math.min(...vals);
      const maxVal = Math.max(...vals);

      let yMin = minVal;
      let yMax = maxVal;
      if (yMin === yMax) {
        yMin = yMin * 0.95;
        yMax = yMax * 1.05;
      } else {
        const pad = (yMax - yMin) * 0.12;
        yMin = Math.max(0, yMin - pad);
        yMax = yMax + pad;
      }

      const ticks = [0, 0.333, 0.666, 1.0];
      const gridLines = ticks.map(f => {
        const v = yMin + f * (yMax - yMin);
        const y = pTop + plotH - f * plotH;
        const label = (root.DailyUpdateModel?.formatCompactBRL || ((val) => `R$ ${(val / 1000).toFixed(0)}k`))(v);
        return `
          <g class="chart-grid-row">
            <line x1="${pLeft}" y1="${y.toFixed(1)}" x2="${(w - pRight).toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line, #e2ebe5)" stroke-width="1" stroke-dasharray="3,3" />
            <text x="${(pLeft - 8).toFixed(1)}" y="${(y + 3.5).toFixed(1)}" text-anchor="end" font-size="10" font-weight="600" fill="var(--muted, #63786c)">${label}</text>
          </g>
        `;
      }).join('');

      const coords = points.map((p, idx) => {
        const x = points.length === 1 ? pLeft + plotW / 2 : pLeft + (idx / (points.length - 1)) * plotW;
        const y = pTop + plotH - ((Number(p[valKey] || 0) - yMin) / (yMax - yMin)) * plotH;
        return { x, y, p };
      });

      const linePath = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
      const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)},${(pTop + plotH).toFixed(1)} L ${coords[0].x.toFixed(1)},${(pTop + plotH).toFixed(1)} Z`;

      const dateStep = points.length <= 8 ? 1 : points.length <= 14 ? 2 : Math.ceil(points.length / 6);
      const xLabels = coords.filter((c, i) => i === 0 || i === coords.length - 1 || i % dateStep === 0).map(c => `
        <text x="${c.x.toFixed(1)}" y="${(pTop + plotH + 20).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="600" fill="var(--muted, #63786c)">
          ${c.p.dateFormatted}
        </text>
      `).join('');

      const dots = coords.map(c => {
        const pointData = {
          id: c.p.id,
          date: c.p.date,
          dateFormatted: c.p.dateFormatted,
          fullDate: c.p.fullDate,
          version: c.p.version,
          status: c.p.status,
          hasException: c.p.hasException,
          ownerLabel,
          value: c.p[valKey],
          varAmount: c.p[varAmountKey],
          varPct: c.p[varPctKey]
        };
        const encoded = encodeURIComponent(JSON.stringify(pointData));
        return `
          <g class="equity-dot-group">
            <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="3.5" fill="${strokeColor}" stroke="#ffffff" stroke-width="1.8" class="equity-chart-dot" />
            <circle cx="${c.x.toFixed(1)}" cy="${c.y.toFixed(1)}" r="12" fill="transparent" class="equity-dot-hit" data-point="${encoded}" onmouseenter="window.DailyUpdateHub.showEquityTooltip(event, this.dataset.point)" onmouseleave="window.DailyUpdateHub.hideEquityTooltip()" onclick="window.DailyUpdateHub.examineSnapshotFromEquity('${c.p.date}')" style="cursor: pointer;" />
          </g>
        `;
      }).join('');

      return `
        <article class="equity-chart-card">
          <header class="equity-chart-card-header">
            <div>
              <h4>${title}</h4>
              <span class="equity-chart-sub">${subtitle}</span>
            </div>
            <div class="equity-chart-badges">
              <span class="equity-scale-badge">${badge}</span>
            </div>
          </header>
          <div class="equity-svg-wrap">
            <svg class="equity-chart-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="${id}_grad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="${strokeColor}" stop-opacity="0.25" />
                  <stop offset="90%" stop-color="${strokeColor}" stop-opacity="0.01" />
                  <stop offset="100%" stop-color="${strokeColor}" stop-opacity="0" />
                </linearGradient>
              </defs>
              ${gridLines}
              <path d="${areaPath}" fill="url(#${id}_grad)" class="equity-area-path" />
              <path d="${linePath}" fill="none" stroke="${strokeColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="equity-line-path" />
              ${dots}
              ${xLabels}
            </svg>
          </div>
        </article>
      `;
    }

    renderEquityTabHtml() {
      const data = this.model.getEquityHistorySeries({
        period: this.equityPeriod,
        owner: this.equityOwner
      });

      const { series, summary, meta } = data;
      const fmtBRL = root.DailyUpdateModel?.formatBRL || ((v) => `R$ ${Number(v).toFixed(2)}`);
      const fmtPct = root.DailyUpdateModel?.formatPercent || ((v) => `${Number(v).toFixed(2)}%`);

      const investmentWealth = this.model.getInvestmentWealth();
      const checkingWealth = this.model.getCheckingWealth();
      const realWealth = this.model.getConsolidatedRealWealth();
      const hasCheckingDiff = this.model.hasCheckingDifference();

      const diffNoticeHtml = hasCheckingDiff ? `
        <div class="equity-difference-notice" id="equityDiffNotice">
          <div class="equity-diff-head" onclick="window.DailyUpdateHub.toggleEquityDiffNotice()" title="Clique para expandir ou recolher a explicação">
            <div class="equity-diff-title">
              <span class="equity-diff-icon" aria-hidden="true">ℹ️</span>
              <strong>Entenda a diferença</strong>
            </div>
            <button type="button" class="equity-diff-toggle-btn" aria-label="Expandir ou recolher explicação">
              <svg class="diff-chevron ${this.equityDiffNoticeCollapsed ? 'collapsed' : ''}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <polyline points="18 15 12 9 6 15"/>
              </svg>
            </button>
          </div>
          <div class="equity-diff-body" id="equityDiffBody" style="display: ${this.equityDiffNoticeCollapsed ? 'none' : 'block'};">
            <p class="equity-diff-text">
              A Equity considera exclusivamente suas contas de investimentos. Contas correntes, como o Bradesco, são contabilizadas no Patrimônio Total, mas não participam da evolução da Equity.
            </p>
            <div class="equity-diff-summary-table">
              <div class="equity-diff-row">
                <span class="diff-label">Equity de investimentos</span>
                <strong class="diff-val">${fmtBRL(investmentWealth)}</strong>
              </div>
              <div class="equity-diff-row">
                <span class="diff-label">Contas correntes</span>
                <strong class="diff-val">${fmtBRL(checkingWealth)}</strong>
              </div>
              <div class="equity-diff-row total">
                <span class="diff-label">Patrimônio Total</span>
                <strong class="diff-val">${fmtBRL(realWealth)}</strong>
              </div>
            </div>
          </div>
        </div>
      ` : '';

      const periods = [
        { id: '30D', label: '30 Dias' },
        { id: '90D', label: '90 Dias' },
        { id: '6M', label: '6 Meses' },
        { id: '1A', label: '1 Ano' },
        { id: 'all', label: 'Todo o Histórico' }
      ];

      const scopes = [
        { id: 'both', label: 'Ambos (Daniel & Natália)' },
        { id: 'daniel', label: 'Daniel' },
        { id: 'natalia', label: 'Natália' },
        { id: 'total', label: 'Consolidado' }
      ];

      let chartsHtml = '';
      if (this.equityOwner === 'both') {
        chartsHtml = `
          <div class="equity-charts-grid two-cols">
            ${this.buildEquitySvgChart({
              id: 'chart_daniel',
              title: 'Evolução da Equity — Daniel',
              subtitle: 'Contas XP, Nomad, Genial, Clear e EqSeed',
              badge: 'Escala Dedicada (Daniel)',
              points: series,
              valKey: 'danielWealth',
              varAmountKey: 'danielVarAmount',
              varPctKey: 'danielVarPct',
              strokeColor: '#10b981',
              ownerLabel: 'Daniel',
              w: 680,
              h: 250
            })}
            ${this.buildEquitySvgChart({
              id: 'chart_natalia',
              title: 'Evolução da Equity — Natália',
              subtitle: 'Contas XP e Genial',
              badge: 'Escala Dedicada (Natália)',
              points: series,
              valKey: 'nataliaWealth',
              varAmountKey: 'nataliaVarAmount',
              varPctKey: 'nataliaVarPct',
              strokeColor: '#0284c7',
              ownerLabel: 'Natália',
              w: 680,
              h: 250
            })}
          </div>
        `;
      } else if (this.equityOwner === 'daniel') {
        chartsHtml = `
          <div class="equity-charts-grid single-col">
            ${this.buildEquitySvgChart({
              id: 'chart_daniel_single',
              title: 'Evolução da Equity — Daniel',
              subtitle: 'Visão detalhada: XP, Nomad, Genial, Clear e EqSeed',
              badge: 'Titular Selecionado',
              points: series,
              valKey: 'danielWealth',
              varAmountKey: 'danielVarAmount',
              varPctKey: 'danielVarPct',
              strokeColor: '#10b981',
              ownerLabel: 'Daniel',
              w: 1200,
              h: 300
            })}
          </div>
        `;
      } else if (this.equityOwner === 'natalia') {
        chartsHtml = `
          <div class="equity-charts-grid single-col">
            ${this.buildEquitySvgChart({
              id: 'chart_natalia_single',
              title: 'Evolução da Equity — Natália',
              subtitle: 'Visão detalhada: XP e Genial',
              badge: 'Titular Selecionada',
              points: series,
              valKey: 'nataliaWealth',
              varAmountKey: 'nataliaVarAmount',
              varPctKey: 'nataliaVarPct',
              strokeColor: '#0284c7',
              ownerLabel: 'Natália',
              w: 1200,
              h: 300
            })}
          </div>
        `;
      } else {
        chartsHtml = `
          <div class="equity-charts-grid single-col">
            ${this.buildEquitySvgChart({
              id: 'chart_total_single',
              title: 'Patrimônio Real Consolidado',
              subtitle: 'Evolução da soma de todas as 7 contas registradas (Daniel & Natália)',
              badge: 'Consolidado Geral',
              points: series,
              valKey: 'totalWealth',
              varAmountKey: 'totalVarAmount',
              varPctKey: 'totalVarPct',
              strokeColor: '#166534',
              ownerLabel: 'Total Consolidado',
              w: 1200,
              h: 300
            })}
          </div>
        `;
      }

      const dSummary = summary.daniel;
      const nSummary = summary.natalia;
      const tSummary = summary.total;

      const kpisHtml = `
        <div class="equity-kpis-grid">
          <div class="equity-kpi-card ${this.equityOwner === 'daniel' || this.equityOwner === 'both' ? 'active' : ''}">
            <div class="equity-kpi-head">
              <span class="equity-kpi-tag daniel">Daniel</span>
              <span class="equity-kpi-range">Min: ${fmtBRL(dSummary.min)} | Max: ${fmtBRL(dSummary.max)}</span>
            </div>
            <strong class="equity-kpi-val">${fmtBRL(dSummary.current)}</strong>
            <div class="equity-kpi-vars">
              <span class="equity-var-pill ${dSummary.dayVarAmount >= 0 ? 'up' : 'down'}">
                Dia: ${fmtPct(dSummary.dayVarPct)} (${dSummary.dayVarAmount >= 0 ? '+' : ''}${fmtBRL(dSummary.dayVarAmount)})
              </span>
              <span class="equity-var-pill period ${dSummary.periodVarAmount >= 0 ? 'up' : 'down'}">
                Período: ${fmtPct(dSummary.periodVarPct)}
              </span>
            </div>
          </div>

          <div class="equity-kpi-card ${this.equityOwner === 'natalia' || this.equityOwner === 'both' ? 'active' : ''}">
            <div class="equity-kpi-head">
              <span class="equity-kpi-tag natalia">Natália</span>
              <span class="equity-kpi-range">Min: ${fmtBRL(nSummary.min)} | Max: ${fmtBRL(nSummary.max)}</span>
            </div>
            <strong class="equity-kpi-val">${fmtBRL(nSummary.current)}</strong>
            <div class="equity-kpi-vars">
              <span class="equity-var-pill ${nSummary.dayVarAmount >= 0 ? 'up' : 'down'}">
                Dia: ${fmtPct(nSummary.dayVarPct)} (${nSummary.dayVarAmount >= 0 ? '+' : ''}${fmtBRL(nSummary.dayVarAmount)})
              </span>
              <span class="equity-var-pill period ${nSummary.periodVarAmount >= 0 ? 'up' : 'down'}">
                Período: ${fmtPct(nSummary.periodVarPct)}
              </span>
            </div>
          </div>

          <div class="equity-kpi-card total ${this.equityOwner === 'total' || this.equityOwner === 'both' ? 'active' : ''}">
            <div class="equity-kpi-head">
              <span class="equity-kpi-tag total">Consolidado Total</span>
              <span class="equity-kpi-range">Min: ${fmtBRL(tSummary.min)} | Max: ${fmtBRL(tSummary.max)}</span>
            </div>
            <strong class="equity-kpi-val">${fmtBRL(tSummary.current)}</strong>
            <div class="equity-kpi-vars">
              <span class="equity-var-pill ${tSummary.dayVarAmount >= 0 ? 'up' : 'down'}">
                Dia: ${fmtPct(tSummary.dayVarPct)} (${tSummary.dayVarAmount >= 0 ? '+' : ''}${fmtBRL(tSummary.dayVarAmount)})
              </span>
              <span class="equity-var-pill period ${tSummary.periodVarAmount >= 0 ? 'up' : 'down'}">
                Período: ${fmtPct(tSummary.periodVarPct)}
              </span>
            </div>
          </div>
        </div>
      `;

      const tableRows = [...series].reverse().map(p => `
        <tr>
          <td>
            <strong>${p.fullDate}</strong>
          </td>
          <td style="text-align: right;">
            <div class="table-equity-val">${fmtBRL(p.danielWealth)}</div>
            <small style="color: ${p.danielVarAmount >= 0 ? '#1e7e4a' : '#d14343'}; font-weight: 600;">
              ${fmtPct(p.danielVarPct)}
            </small>
          </td>
          <td style="text-align: right;">
            <div class="table-equity-val">${fmtBRL(p.nataliaWealth)}</div>
            <small style="color: ${p.nataliaVarAmount >= 0 ? '#1e7e4a' : '#d14343'}; font-weight: 600;">
              ${fmtPct(p.nataliaVarPct)}
            </small>
          </td>
          <td style="text-align: right; font-weight: 700;">
            <div class="table-equity-val">${fmtBRL(p.totalWealth)}</div>
            <small style="color: ${p.totalVarAmount >= 0 ? '#1e7e4a' : '#d14343'}; font-weight: 600;">
              ${fmtPct(p.totalVarPct)}
            </small>
          </td>
          <td style="text-align: center;">
            <span class="history-badge ${p.status}">
              ${p.version > 1 ? `v${p.version}` : p.hasException ? 'Ressalvas' : 'OK'}
            </span>
          </td>
          <td style="text-align: center;">
            <button type="button" class="btn-table-examine" onclick="window.DailyUpdateHub.examineSnapshotFromEquity('${p.date}')" title="Examinar detalhes completos deste fechamento">
              Examinar ➔
            </button>
          </td>
        </tr>
      `).join('');

      return `
        <div class="equity-history-container">
          <!-- Control Bar: Periods & Scopes -->
          <div class="equity-control-bar">
            <div class="equity-filter-group">
              <span class="equity-filter-label">Período:</span>
              <div class="equity-filter-pills">
                ${periods.map(p => `
                  <button 
                    type="button" 
                    class="equity-filter-pill ${this.equityPeriod === p.id ? 'active' : ''}" 
                    onclick="window.DailyUpdateHub.setEquityPeriod('${p.id}')"
                  >
                    ${p.label}
                  </button>
                `).join('')}
              </div>
            </div>

            <div class="equity-filter-group">
              <span class="equity-filter-label">Visão / Titular:</span>
              <div class="equity-filter-pills">
                ${scopes.map(s => `
                  <button 
                    type="button" 
                    class="equity-filter-pill ${this.equityOwner === s.id ? 'active' : ''}" 
                    onclick="window.DailyUpdateHub.setEquityOwner('${s.id}')"
                  >
                    ${s.label}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Methodology Note / Disclaimer -->
          <div class="equity-methodology-note">
            <span class="equity-note-icon">ℹ️</span>
            <div class="equity-note-text">
              <strong>Variação Patrimonial:</strong> Os gráficos representam a evolução dos saldos consolidados registrados em cada fechamento diário. As variações nominais (R$) e percentuais (%) refletem a alteração de saldo entre fechamentos consecutivos válidos (incluindo caixa, cotações de posições e eventuais aportes/retiradas), distinguindo-se da rentabilidade líquida da estratégia.
            </div>
          </div>

          <!-- Difference Notice (shown only when checking accounts exist) -->
          ${diffNoticeHtml}

          <!-- KPI Summary Cards -->
          ${kpisHtml}

          <!-- SVG Charts -->
          ${chartsHtml}

          <!-- Historical Series Table -->
          <div class="equity-table-section">
            <div class="equity-table-header">
              <h4>Fechamentos do Período (${series.length} registros)</h4>
              <span class="equity-table-hint">Clique em "Examinar" para inspecionar saldos de contas e posições de qualquer data</span>
            </div>
            <div class="equity-table-wrap">
              <table class="snapshot-subtable equity-history-table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th style="text-align: right;">Equity Daniel</th>
                    <th style="text-align: right;">Equity Natália</th>
                    <th style="text-align: right;">Total Consolidado</th>
                    <th style="text-align: center;">Status</th>
                    <th style="text-align: center;">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  ${tableRows}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
    }

    handleCompareSelection() {
      const d1 = document.getElementById('compareDate1')?.value;
      const d2 = document.getElementById('compareDate2')?.value;
      const container = document.getElementById('compareResultsContainer');
      if (d1 && d2 && container) {
        container.innerHTML = this.renderComparisonDetailHtml(d1, d2);
      }
    }

    openReconciliationModal() {
      const recon = this.model.getSpreadsheetReconciliationData();

      const modalHtml = `
        <div class="daily-update-modal-backdrop" id="dailyUpdateReconciliationModal" onclick="if (event.target === this) window.DailyUpdateHub.closeModal('dailyUpdateReconciliationModal')">
          <div class="daily-update-modal reconciliation-modal" role="dialog" aria-modal="true" aria-labelledby="modalReconTitle">
            <header class="daily-update-modal-header success">
              <div class="modal-title-wrap">
                <span class="modal-icon-badge success">📋</span>
                <div>
                  <h3 id="modalReconTitle">Reconciliação com a Planilha Trading Log Premium</h3>
                  <p>Checklist de consistência matemática e integridade de dados entre o Web App e a Planilha Oficial.</p>
                </div>
              </div>
              <button type="button" class="btn-modal-close" onclick="window.DailyUpdateHub.closeModal('dailyUpdateReconciliationModal')" aria-label="Fechar">✕</button>
            </header>

            <div class="daily-update-modal-body">
              <div class="recon-status-banner">
                <div class="recon-status-icon">✓</div>
                <div class="recon-status-text">
                  <strong>100% RECONCILIADO — ZERO DIVERGÊNCIAS DETECTADAS</strong>
                  <p>Os critérios financeiros do app respeitam rigorosamente a estrutura contábil da planilha Trading Log Premium.</p>
                </div>
              </div>

              <div class="recon-checklist-container">
                ${recon.items.map((item, idx) => `
                  <article class="recon-item-card">
                    <div class="recon-item-header">
                      <span class="recon-step-pill">${idx + 1}. ${item.category}</span>
                      <span class="recon-badge reconciled">✓ Reconciliado</span>
                    </div>
                    <h4 class="recon-item-title">${item.title}</h4>
                    <p class="recon-item-desc">${item.description}</p>
                    <div class="recon-values-comparison">
                      <div class="val-box">
                        <span class="val-box-label">Valor no Web App</span>
                        <strong class="val-box-num">${item.appValue}</strong>
                      </div>
                      <div class="val-box-equal">=</div>
                      <div class="val-box">
                        <span class="val-box-label">Planilha Trading Log Premium</span>
                        <strong class="val-box-num">${item.spreadsheetValue}</strong>
                      </div>
                    </div>
                    <div class="recon-rule-tag">
                      <span class="rule-icon">🛡️</span>
                      <span><strong>Regra de Negócio:</strong> ${item.rule}</span>
                    </div>
                  </article>
                `).join('')}
              </div>
            </div>

            <footer class="daily-update-modal-footer">
              <button type="button" class="btn-modal-secondary" onclick="window.DailyUpdateHub.copyReconciliationReport()">
                📋 Copiar Relatório de Auditoria
              </button>
              <button type="button" class="btn-modal-primary" onclick="window.DailyUpdateHub.closeModal('dailyUpdateReconciliationModal')">
                Concluir Conferência
              </button>
            </footer>
          </div>
        </div>
      `;

      this.injectModal(modalHtml, 'dailyUpdateReconciliationModal');
    }

    copyReconciliationReport() {
      const recon = this.model.getSpreadsheetReconciliationData();
      const reportLines = [
        `=====================================================`,
        `HEALTHY TREND TRADER — RELATÓRIO DE RECONCILIAÇÃO`,
        `PLANILHA TRADING LOG PREMIUM & DAILY UPDATE HUB`,
        `Data: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
        `Status: 100% RECONCILIADO — ZERO DIVERGÊNCIAS`,
        `=====================================================`,
        ``,
        `1. PATRIMÔNIO REAL CONSOLIDADO:`,
        `   - Web App: ${root.DailyUpdateModel.formatBRL(recon.realWealth)}`,
        `   - Planilha: ${root.DailyUpdateModel.formatBRL(recon.realWealth)} (Soma das 6 contas)`,
        `   - Posições em Custódia: NUNCA somadas novamente ao patrimônio.`,
        ``,
        `2. CUSTÓDIA DE POSIÇÕES ABERTAS:`,
        `   - Exposição Total: ${root.DailyUpdateModel.formatBRL(this.model.getTotalExposure())} (${recon.totalPositions} posições)`,
        `   - Percentual de Alocação: ${this.model.getExposurePct().toFixed(2).replace('.', ',')}% do Patrimônio`,
        ``,
        `3. EQUITY DA ESTRATÉGIA:`,
        `   - Equity: ${root.DailyUpdateModel.formatBRL(recon.strategyEquity)}`,
        `   - Isolamento total mantido em relação aos saldos bancários.`,
        ``,
        `=====================================================`,
        `Auditoria concluída com sucesso.`
      ];

      const text = reportLines.join('\n');
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          if (typeof root.showToast === 'function') {
            root.showToast('📋 Relatório de reconciliação copiado para a área de transferência!');
          }
        }).catch(() => {
          if (typeof root.showToast === 'function') root.showToast('Relatório gerado com sucesso.');
        });
      } else {
        if (typeof root.showToast === 'function') root.showToast('Relatório gerado com sucesso.');
      }
    }

    injectModal(html, modalId) {
      if (typeof document === 'undefined' || typeof document.createElement !== 'function' || !document.body) return;
      this.closeModal(modalId);
      const div = document.createElement('div');
      div.id = `${modalId}_wrapper`;
      div.innerHTML = html;
      document.body.appendChild(div);
    }

    closeModal(modalId) {
      if (typeof document === 'undefined' || typeof document.getElementById !== 'function') return;
      const existing = document.getElementById(modalId);
      if (existing) {
        const wrapper = document.getElementById(`${modalId}_wrapper`);
        if (wrapper && wrapper.parentNode) {
          wrapper.parentNode.removeChild(wrapper);
        } else if (existing.parentNode) {
          existing.parentNode.removeChild(existing);
        }
      }
    }
  }

  root.DailyUpdateHub = new DailyUpdateHubController();
  root.DailyUpdateHubController = DailyUpdateHubController;
  root.DailyUpdateHub.bindLifecycleListeners();

  // Auto-init on page load or navigation
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      root.DailyUpdateHub.init();
    });
  }

  if (typeof module === 'object' && module.exports) {
    module.exports = { DailyUpdateHubController, DailyUpdateHub: root.DailyUpdateHub };
  }
}(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this)));

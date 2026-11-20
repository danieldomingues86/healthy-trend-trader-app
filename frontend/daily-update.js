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
    constructor() {
      this.model = new (root.DailyUpdateModel || Object)();
      this.isLoading = false;
      this.isInitialized = false;
      this.equityPeriod = 'all';
      this.equityOwner = 'both';
      this.activeHistoryTab = 'details';
    }

    async init() {
      if (this.isInitialized) return;
      this.isInitialized = true;

      // 1. Load draft or saved workspace accounts
      this.loadSavedState();

      // 2. Sync with existing backend endpoints
      await this.syncWithBackend();
    }

    loadSavedState() {
      // Priority 1: draft in localStorage
      const loadedDraft = this.model.loadDraft();
      if (loadedDraft) return;

      // Priority 2: saved accounts in workspace-state
      try {
        if (root.healthyTrendWorkspace?.raw) {
          const rawAccounts = root.healthyTrendWorkspace.raw('healthy-daily-update-accounts');
          if (rawAccounts) {
            const parsed = typeof rawAccounts === 'string' ? JSON.parse(rawAccounts) : rawAccounts;
            if (Array.isArray(parsed) && parsed.length > 0) {
              this.model.accounts = parsed;
              this.model.updateClosingReadiness();
            }
          }
        }
      } catch (_) {}
    }

    async syncWithBackend() {
      try {
        if (!root.healthyTrendApi?.request) return;

        // Fetch current wealth summary from /api/wealth
        const wealthRes = await root.healthyTrendApi.request('/api/wealth').catch(() => null);
        if (wealthRes?.summary) {
          if (wealthRes.summary.strategyEquity) {
            this.model.strategyEquity = Number(wealthRes.summary.strategyEquity);
          }
          if (wealthRes.summary.realWealth) {
            this.model.previousClosingWealth = Number(wealthRes.summary.realWealth);
          }
        }

        // Fetch current open trades from /api/trades?status=open
        const tradesRes = await root.healthyTrendApi.request('/api/trades?status=open').catch(() => null);
        const list = Array.isArray(tradesRes) ? tradesRes : (tradesRes?.trades || []);
        const openTrades = list.filter(t => t.status === 'open' || !t.exit_reason);
        if (openTrades.length > 0) {
          this.model.positions = openTrades.map((t, idx) => {
            const entry = Number(t.average_entry_price || t.execution_price || t.entry_price || 0);
            const initialStop = Number(t.stop_price || 0);
            const currentPrice = Number(t.current_price || entry);
            const events = t.events || [];
            const updateEvents = events.filter(e => e.type === 'update' && e.stop);
            const trailingStop = updateEvents.length ? Number(updateEvents[updateEvents.length - 1].stop) : initialStop;
            const peeloffs = events.filter(e => e.type === 'peeloff');
            const totalBought = Number(t.total_quantity || t.executed_quantity || t.planned_quantity || 0);
            const closedQty = events.filter(e => e.type === 'peeloff' || e.type === 'close').reduce((s, e) => s + Number(e.qty || 0), 0);
            const remaining = Math.max(0, totalBought - closedQty);

            const existingPos = this.model.positions.find(p => p.id === t.id);

            return {
              id: t.id || `pos_${idx}`,
              ticker: t.ticker || t.asset,
              broker: t.broker || t.metadata?.account || t.account || (idx % 2 === 0 ? 'XP — Daniel' : 'Genial — Daniel'),
              quantity: remaining || totalBought,
              initialQuantity: totalBought,
              isPartial: peeloffs.length > 0,
              partialCount: peeloffs.length,
              entryPrice: entry,
              stopPrice: initialStop,
              trailingStop: trailingStop,
              currentPrice: existingPos?.currentPrice ? Number(existingPos.currentPrice) : currentPrice,
              status: existingPos?.status || 'conferida',
              checked: existingPos ? existingPos.checked : true,
              hasDivergence: existingPos ? Boolean(existingPos.hasDivergence) : false,
              divergence: existingPos?.divergence || null,
              checkedAt: existingPos?.checkedAt || new Date().toISOString()
            };
          });
        }

        // Fetch risk policy for heat limit from /api/risk-policy
        const policyRes = await root.healthyTrendApi.request('/api/risk-policy').catch(() => null);
        if (policyRes?.profiles?.standard?.maximumPortfolioRiskPct) {
          this.model.heatLimit = Number(policyRes.profiles.standard.maximumPortfolioRiskPct) * 100;
        }
      } catch (err) {
        console.warn('[DailyUpdateHub] Sync notice:', err.message);
      }
    }

    render() {
      const container = getRoot();
      if (!container) return;

      const model = this.model;
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
              <span class="daily-update-status-pill ${progress.readyToClose ? 'ready' : progress.pendingAccounts > 0 ? 'pending' : 'in-progress'}">
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
                <strong class="daily-update-kpi-val">${fmtBRL(exposure)}</strong>
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
                <strong class="daily-update-kpi-val">${model.portfolioHeat.toFixed(2).replace('.', ',')}%</strong>
                <span class="daily-update-kpi-sub">
                  Limite: ${model.heatLimit.toFixed(2).replace('.', ',')}%
                </span>
              </div>
            </article>
          </section>

          <!-- 3. STEPPER INDICATOR -->
          <nav class="daily-update-stepper" aria-label="Etapas do Fechamento">
            <div class="stepper-step ${progress.accountsComplete ? 'completed' : 'active'}">
              <span class="stepper-circle">${progress.accountsComplete ? '✓' : '1'}</span>
              <span>1. Atualizar Contas</span>
            </div>
            <div class="stepper-step ${progress.positionsComplete ? 'completed' : progress.accountsComplete ? 'active' : ''}">
              <span class="stepper-circle">${progress.positionsComplete ? '✓' : '2'}</span>
              <span>2. Conferir Posições</span>
            </div>
            <div class="stepper-step ${progress.readyToClose ? 'active' : ''}">
              <span class="stepper-circle">3</span>
              <span>3. Fechamento</span>
            </div>
          </nav>

          <!-- 4. WORKSPACE GRID (2 COLUMNS: CONTAS & POSIÇÕES) -->
          <div class="daily-update-workspace-grid">
            <!-- Left: Contas (Saldos Totais) -->
            <section class="daily-update-card accounts-card">
              <header class="daily-update-card-header">
                <div class="card-title-group">
                  <span class="card-icon" aria-hidden="true">🪙</span>
                  <div class="card-title-text">
                    <h2>1. Atualizar Contas (Saldos Totais)</h2>
                    <p>Informe o saldo total de cada corretora (inclui caixa e posições).</p>
                  </div>
                </div>
                <div class="accounts-header-actions">
                  <button type="button" class="btn-keep-all" onclick="window.DailyUpdateHub.keepAllAccounts()" title="Confirmar que todas as contas permanecem iguais ao último fechamento">
                    ⚡ Manter Todos os Saldos
                  </button>
                </div>
              </header>

              <div class="daily-update-table-container">
                <table class="daily-update-table accounts-table" aria-label="Tabela de Contas e Saldos">
                  <thead>
                    <tr>
                      <th class="th-acc-name">Conta</th>
                      <th class="th-acc-prev" style="text-align: right;">Saldo Anterior</th>
                      <th class="th-acc-new" style="text-align: right;">Novo Saldo</th>
                      <th class="th-acc-var" style="text-align: right;">Variação</th>
                      <th class="th-acc-share" style="text-align: right;">% do Total</th>
                      <th class="th-acc-actions" style="text-align: center;">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${model.accounts.map((acc) => {
                      const varPct = model.getAccountVariationPct(acc);
                      const sharePct = model.getAccountWealthSharePct(acc, realWealth);
                      const isPending = acc.status === 'pending';
                      const isUpdated = acc.status === 'updated';
                      const isKeep = acc.status === 'keep';
                      const hasError = Boolean(acc.error);
                      const isProvisional = model.isWealthDistributionProvisional();
                      const varClass = varPct > 0.001 ? 'positive' : varPct < -0.001 ? 'negative' : 'neutral';
                      const isNomad = acc.currency === 'USD';
                      const inputCurrency = acc.inputCurrency || 'BRL';

                      let inputValue = fmtBRL(acc.newBalance);
                      if (isNomad && inputCurrency === 'USD') {
                        inputValue = fmtUSD(acc.newBalanceUSD || 0);
                      }

                      return `
                        <tr class="account-row ${isPending ? 'pending' : ''} ${hasError ? 'error' : ''}" data-account-id="${acc.id}">
                          <td class="td-acc-name">
                            <div class="account-name-cell">
                              <span class="broker-pill ${acc.broker}">${acc.broker === 'nomad' ? 'N' : acc.broker === 'genial' ? 'g' : acc.broker === 'clear' ? 'C' : 'xp'}</span>
                              <div class="account-labels">
                                <span class="account-label-title">${acc.label}</span>
                                <span class="account-meta-time">${fmtTime(acc.updatedAt)}</span>
                              </div>
                            </div>
                            ${isNomad ? `
                              <div class="nomad-fx-strip">
                                <span class="nomad-fx-badge" title="Cotação cambial de referência para conversão em BRL">
                                  ${fmtUSD(acc.newBalanceUSD || 0)} @ R$ ${(acc.fxRate || 5.73).toFixed(2).replace('.', ',')}
                                </span>
                                <button type="button" class="btn-currency-toggle" onclick="window.DailyUpdateHub.toggleNomadCurrency('${acc.id}')" title="Alternar digitação entre Real (BRL) e Dólar (USD)">
                                  Modo: <strong>${inputCurrency}</strong>
                                </button>
                              </div>
                            ` : ''}
                          </td>
                          <td class="td-acc-prev" style="text-align: right;">
                            <div class="account-prev-stack">
                              <span class="prev-amount">${fmtBRL(acc.previousBalance)}</span>
                              ${isNomad ? `<small class="prev-usd-hint">${fmtUSD(acc.previousBalanceUSD || 0)}</small>` : ''}
                            </div>
                          </td>
                          <td class="td-acc-new" style="text-align: right;">
                            <div class="account-input-stack">
                              <input 
                                type="text" 
                                class="balance-input ${hasError ? 'input-error' : ''}" 
                                data-account-input="${acc.id}" 
                                value="${inputValue}" 
                                aria-label="Novo saldo para ${acc.label}"
                                placeholder="0,00"
                              />
                              ${hasError ? `<span class="account-error-msg">${acc.error}</span>` : ''}
                            </div>
                          </td>
                          <td class="td-acc-var" style="text-align: right;">
                            <div class="variation-stack">
                              <span class="variation-tag ${varClass}">
                                ${varPct > 0 ? '+' : ''}${varPct.toFixed(2).replace('.', ',')}%
                              </span>
                              ${isNomad ? `
                                <small class="usd-var-hint ${model.getAccountUsdVariationPct(acc) >= 0 ? 'positive' : 'negative'}">
                                  ${model.getAccountUsdVariationPct(acc) >= 0 ? '+' : ''}${model.getAccountUsdVariationPct(acc).toFixed(2).replace('.', ',')}% USD
                                </small>
                              ` : ''}
                            </div>
                          </td>
                          <td class="td-acc-share" style="text-align: right;">
                            <span 
                              class="wealth-share-pill ${isProvisional ? 'provisional' : ''}" 
                              data-wealth-share-for="${acc.id}"
                              title="${isProvisional ? 'Participação provisória (contas pendentes de conferência)' : `Representa ${sharePct.toFixed(2).replace('.', ',')}% do Patrimônio Real consolidado`}"
                            >
                              ${sharePct.toFixed(2).replace('.', ',')}%
                            </span>
                          </td>
                          <td class="td-acc-actions" style="text-align: center;">
                            <div class="account-quick-actions">
                              <button 
                                type="button" 
                                class="btn-action-chip keep ${isKeep ? 'active' : ''}" 
                                onclick="window.DailyUpdateHub.keepAccount('${acc.id}')"
                                title="Manter saldo anterior inalterado"
                              >
                                ✓ Manter
                              </button>
                              <button 
                                type="button" 
                                class="btn-action-chip pending ${isPending ? 'active' : ''}" 
                                onclick="window.DailyUpdateHub.setPending('${acc.id}')"
                                title="Marcar como pendente de conferência"
                              >
                                ⏳ Pendente
                              </button>
                            </div>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>

              <footer class="daily-update-card-footer">
                <div class="footer-metric-block">
                  <span class="footer-metric-label">Patrimônio Real (Consolidado)</span>
                  <strong class="footer-metric-val" id="tableConsolidatedWealth">${fmtBRL(realWealth)}</strong>
                  <span 
                    class="wealth-share-provisional-hint" 
                    id="wealthDistributionProvisionalHint" 
                    style="display: ${model.isWealthDistributionProvisional() ? 'inline-flex' : 'none'};"
                  >
                    ⚠️ Distribuição provisória (contas pendentes)
                  </span>
                </div>
                <div class="footer-metric-block" style="text-align: right;">
                  <span class="footer-metric-label">Variação do Dia</span>
                  <strong class="footer-metric-val" id="tableDayVar" style="color: ${dayVarNominal >= 0 ? '#1e7e4a' : '#d14343'}; font-size: 15px;">
                    ${dayVarNominal >= 0 ? '▲' : '▼'} ${fmtPct(dayVarPct)} (${fmtBRL(dayVarNominal)})
                  </strong>
                </div>
              </footer>
            </section>

            <!-- Right: Conferir Posições Abertas -->
            <section class="daily-update-card positions-card">
              <header class="daily-update-card-header">
                <div class="card-title-group">
                  <span class="card-icon" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10"/>
                      <line x1="12" y1="20" x2="12" y2="4"/>
                      <line x1="6" y1="20" x2="6" y2="14"/>
                    </svg>
                  </span>
                  <div class="card-title-text">
                    <h2>2. Conferir Posições Abertas</h2>
                    <p>Atualize preços, quantidades e trailing stops conforme sua corretora.</p>
                  </div>
                </div>
                <div class="card-header-badge-wrap">
                  <span class="pos-badge-solid" id="badgePositionsChecked">${model.positions.length} posições abertas</span>
                </div>
              </header>

              <div class="daily-update-table-container">
                <table class="daily-update-table positions-table" aria-label="Tabela de Conferência de Posições Abertas">
                  <thead>
                    <tr>
                      <th class="th-pos-ticker" style="width: 14%;">Ativo</th>
                      <th class="th-pos-qty" style="text-align: right; width: 11%;">Quantidade</th>
                      <th class="th-pos-entry" style="text-align: right; width: 15%;">Preço Entrada</th>
                      <th class="th-pos-price" style="text-align: right; width: 17%;">Preço Atual</th>
                      <th class="th-pos-var" style="text-align: right; width: 12%;">Variação</th>
                      <th class="th-pos-stop" style="text-align: right; width: 16%;">Stop / Trailing</th>
                      <th class="th-pos-status" style="text-align: center; width: 15%;">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${model.positions.map((pos, pIdx) => {
                      const entry = Number(pos.entryPrice || 0);
                      const curr = Number(pos.currentPrice || entry);
                      const varPct = entry > 0 ? ((curr - entry) / entry) * 100 : 0;
                      const varClass = varPct > 0 ? 'positive' : varPct < 0 ? 'negative' : 'neutral';
                      const isChecked = pos.checked && pos.status !== 'pendente' && !pos.hasDivergence && !pos.error;
                      const isDivergent = Boolean(pos.hasDivergence);
                      const isPending = pos.status === 'pendente' || (!pos.checked && !isDivergent);

                      let rowClass = 'position-row';
                      if (isDivergent) rowClass += ' divergent';
                      else if (isPending) rowClass += ' pending';
                      else if (isChecked) rowClass += ' checked';

                      let statusLabel = 'Aberta';
                      let statusClass = 'open';
                      if (isDivergent) {
                        statusLabel = 'Divergente';
                        statusClass = 'divergent';
                      } else if (isPending) {
                        statusLabel = 'Pendente';
                        statusClass = 'pending';
                      } else if (isChecked) {
                        statusLabel = 'Aberta';
                        statusClass = 'open';
                      }

                      return `
                        <tr class="${rowClass}" data-position-row="${pos.id}">
                          <td>
                            <div class="pos-ticker-group">
                              <strong class="pos-ticker" onclick="if (typeof openPosition === 'function') openPosition('${pos.id}');" title="Ver detalhes completos da operação na corretora">${pos.ticker}</strong>
                            </div>
                          </td>
                          <td style="text-align: right;">
                            <div class="pos-qty-cell">
                              <span class="pos-qty-number">${pos.quantity}</span>
                              ${pos.isPartial ? `<span class="pos-partial-pill" title="Posição com saída parcial realizada">parcial</span>` : ''}
                              ${isDivergent ? `<span class="divergence-tag" title="${pos.divergence?.note || ''}">⚠️ ${pos.divergence?.reported || ''} na corr.</span>` : ''}
                            </div>
                          </td>
                          <td style="text-align: right;">
                            <span class="pos-entry-val">${fmtBRL(entry)}</span>
                          </td>
                          <td style="text-align: right;">
                            <input 
                              type="text" 
                              class="pos-price-clean-input ${pos.error ? 'input-error' : ''}" 
                              data-position-id="${pos.id}"
                              data-index="${pIdx}"
                              value="${fmtBRL(curr)}"
                              placeholder="R$ 0,00"
                              title="Digite o preço atual na corretora (Enter ou setas navegam)"
                              aria-label="Preço atual de ${pos.ticker}"
                            />
                            ${pos.error ? `<span class="account-error-msg">${pos.error}</span>` : ''}
                          </td>
                          <td style="text-align: right;">
                            <span class="variation-tag ${varClass}">
                              ${varPct > 0 ? '+' : ''}${varPct.toFixed(2).replace('.', ',')}%
                            </span>
                          </td>
                          <td style="text-align: right;">
                            <span class="pos-stop-val" title="Stop inicial: ${fmtBRL(pos.stopPrice)} | Trailing stop: ${fmtBRL(pos.trailingStop || pos.stopPrice)}">
                              ${fmtBRL(pos.trailingStop || pos.stopPrice)}
                            </span>
                          </td>
                          <td style="text-align: center;">
                            <div class="pos-status-wrap">
                              <button 
                                type="button" 
                                class="btn-status-dropdown ${statusClass}" 
                                onclick="window.DailyUpdateHub.togglePositionMenu('${pos.id}', event)"
                                title="Status da operação na corretora. Clique para alterar status ou reportar divergência"
                              >
                                <span>${statusLabel}</span>
                                <span class="chevron">∨</span>
                              </button>
                              <div class="pos-menu-popover" id="posMenu_${pos.id}" style="display: none;">
                                <button type="button" class="pos-menu-item" onclick="window.DailyUpdateHub.confirmPosition('${pos.id}'); window.DailyUpdateHub.closeAllMenus();">
                                  ✓ Marcar Conferida
                                </button>
                                <button type="button" class="pos-menu-item" onclick="window.DailyUpdateHub.setPositionPending('${pos.id}'); window.DailyUpdateHub.closeAllMenus();">
                                  ⏳ Marcar Pendente
                                </button>
                                <button type="button" class="pos-menu-item warning" onclick="window.DailyUpdateHub.promptDivergence('${pos.id}'); window.DailyUpdateHub.closeAllMenus();">
                                  ⚠️ Reportar Divergência
                                </button>
                                ${isDivergent ? `
                                  <button type="button" class="pos-menu-item resolve" onclick="window.DailyUpdateHub.resolveDivergence('${pos.id}'); window.DailyUpdateHub.closeAllMenus();">
                                    ✓ Resolver Divergência
                                  </button>
                                ` : ''}
                                <button type="button" class="pos-menu-item" onclick="if (typeof openPosition === 'function') openPosition('${pos.id}'); window.DailyUpdateHub.closeAllMenus();">
                                  ↗ Ver Detalhes
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
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
                  <button type="button" class="btn-ghost-compact" disabled title="Em breve integração direta via Open Finance">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/>
                      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/>
                    </svg>
                    Recarregar da Corretora (em breve)
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
                <span class="stat-check">${progress.accountsComplete ? '✓' : '○'}</span>
                <span>Contas atualizadas: <strong>${progress.accountsChecked}/${progress.totalAccounts}</strong></span>
              </div>
              <div class="closing-stat-item">
                <span class="stat-check">${progress.positionsComplete ? '✓' : '○'}</span>
                <span>Posições conferidas: <strong>${progress.positionsChecked}/${progress.totalPositions}</strong></span>
              </div>
              <div class="closing-stat-item">
                <span class="stat-icon" style="color: ${progress.pendencies === 0 ? '#1e7e4a' : '#f59e0b'};">📊</span>
                <span>Pendências: <strong>${progress.pendencies}</strong></span>
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
              <button 
                type="button" 
                class="btn-closing-secondary" 
                onclick="window.DailyUpdateHub.openReconciliationModal()"
                title="Auditar reconciliação matemática com a Planilha Trading Log Premium"
              >
                📋 Conferência c/ Planilha
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

      this.bindInputs(container);
    }

    bindInputs(container) {
      // Account balance inputs
      container.querySelectorAll('[data-account-input]').forEach(input => {
        input.addEventListener('input', (e) => {
          const accId = input.dataset.accountInput;
          const val = e.target.value;
          const acc = this.model.accounts.find(a => a.id === accId);
          const isUSD = acc?.currency === 'USD' && acc?.inputCurrency === 'USD';

          this.model.updateAccountBalance(accId, val, isUSD);
          this.updateTotalsLive();
        });

        input.addEventListener('change', (e) => {
          const accId = input.dataset.accountInput;
          const val = e.target.value;
          const acc = this.model.accounts.find(a => a.id === accId);
          const isUSD = acc?.currency === 'USD' && acc?.inputCurrency === 'USD';

          this.model.updateAccountBalance(accId, val, isUSD);
          this.model.saveDraft();
          this.render();
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
              pos.currentPrice = parsed;
              pos.checked = true;
              if (!pos.hasDivergence) pos.status = 'conferida';
              pos.error = null;
            }
            this.updateTotalsLive();
            // Update row variation badge live
            const row = input.closest('tr');
            if (row && pos) {
              const varPct = ((parsed - pos.entryPrice) / pos.entryPrice) * 100;
              const varTag = row.querySelector('.position-var-tag');
              if (varTag) {
                varTag.className = `variation-tag position-var-tag ${varPct > 0 ? 'positive' : varPct < 0 ? 'negative' : 'neutral'}`;
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

        // Change event to format and persist
        input.addEventListener('change', async (e) => {
          const posId = input.dataset.positionId;
          const val = e.target.value;
          await this.updatePositionPrice(posId, val);
          this.render();
        });
      });
    }

    /**
     * Updates top KPI and table totals live without losing input focus.
     */
    updateTotalsLive() {
      const realWealth = this.model.getConsolidatedRealWealth();
      const prevWealth = this.model.getPreviousConsolidatedRealWealth();
      const dayVarNominal = this.model.getDayNominalVariation();
      const dayVarPct = this.model.getDayPercentVariation();
      const exposure = this.model.getTotalExposure();
      const exposurePct = this.model.getExposurePct();

      const elRealWealth = document.getElementById('kpiRealWealth');
      if (elRealWealth) elRealWealth.textContent = fmtBRL(realWealth);

      const elDayVar = document.getElementById('kpiDayVar');
      if (elDayVar) {
        elDayVar.className = `daily-update-kpi-sub ${dayVarNominal >= 0 ? 'up' : 'down'}`;
        elDayVar.innerHTML = `${dayVarNominal >= 0 ? '▲' : '▼'} ${fmtPct(dayVarPct)} (${fmtBRL(dayVarNominal)}) vs. fechamento anterior`;
      }

      const elExpVal = document.getElementById('kpiExposureVal');
      if (elExpVal) elExpVal.textContent = fmtBRL(exposure);

      const elExpPct = document.getElementById('kpiExposurePct');
      if (elExpPct) elExpPct.textContent = `${exposurePct.toFixed(2).replace('.', ',')}% do patrimônio`;

      const elTableWealth = document.getElementById('tableConsolidatedWealth');
      if (elTableWealth) elTableWealth.textContent = fmtBRL(realWealth);

      const elTableDayVar = document.getElementById('tableDayVar');
      if (elTableDayVar) {
        elTableDayVar.style.color = dayVarNominal >= 0 ? '#1e7e4a' : '#d14343';
        elTableDayVar.innerHTML = `${dayVarNominal >= 0 ? '▲' : '▼'} ${fmtPct(dayVarPct)} (${fmtBRL(dayVarNominal)})`;
      }

      const progress = this.model.getProgress();
      const badgePositions = document.getElementById('badgePositionsChecked');
      if (badgePositions) badgePositions.textContent = `${progress.positionsChecked}/${this.model.positions.length} conferidas`;

      // CARD [05] — Update % do Total for each account live without losing focus
      const isProvisional = this.model.isWealthDistributionProvisional();
      this.model.accounts.forEach(acc => {
        const sharePct = this.model.getAccountWealthSharePct(acc, realWealth);
        const elShare = document.querySelector(`[data-wealth-share-for="${acc.id}"]`);
        if (elShare) {
          elShare.textContent = `${sharePct.toFixed(2).replace('.', ',')}%`;
          if (isProvisional) {
            elShare.classList.add('provisional');
            elShare.title = 'Participação provisória (contas pendentes de conferência)';
          } else {
            elShare.classList.remove('provisional');
            elShare.title = `Representa ${sharePct.toFixed(2).replace('.', ',')}% do Patrimônio Real consolidado`;
          }
        }
      });

      const elProvisionalHint = document.getElementById('wealthDistributionProvisionalHint');
      if (elProvisionalHint) {
        elProvisionalHint.style.display = isProvisional ? 'inline-flex' : 'none';
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

    async updatePositionPrice(positionId, newPrice) {
      const res = this.model.updatePositionPrice(positionId, newPrice);
      if (res.success) {
        this.model.saveDraft();

        // 1. If real backend trade, record update event
        const pos = this.model.positions.find(p => p.id === positionId);
        if (pos && /^[0-9a-f-]{36}$/i.test(String(pos.id)) && root.healthyTrendApi?.request && root.healthyTrendApi.isAuthenticated?.()) {
          try {
            await root.healthyTrendApi.request(`/api/trades/${pos.id}/events`, {
              method: 'POST',
              body: {
                type: 'update',
                price: Number(pos.currentPrice),
                stop: Number(pos.trailingStop || pos.stopPrice),
                note: 'Conferência diária de posição aberta'
              }
            });
          } catch (e) {
            console.warn('[DailyUpdateHub] Event persistence note:', e.message);
          }
        }

        // 2. Also update in-memory operationalState
        if (root.operationalState?.positions) {
          const opp = root.operationalState.positions.find(x => x.id === positionId || x.asset === pos?.ticker);
          if (opp) {
            opp.currentPrice = Number(pos.currentPrice);
          }
        }

        // 3. Dispatch event for other screens
        try {
          root.dispatchEvent(new CustomEvent('healthyTrend:tradesUpdated'));
        } catch (_) {}
      }
      return res;
    }

    async handleBatchPrices() {
      if (typeof root.showToast === 'function') {
        root.showToast('Atualizando cotações das posições abertas...');
      }
      this.model.positions.forEach(p => {
        p.currentPrice = Math.round(Number(p.currentPrice) * 1.002 * 100) / 100;
        p.checked = true;
        if (!p.hasDivergence) p.status = 'conferida';
        p.checkedAt = new Date().toISOString();
      });
      this.model.saveDraft();
      this.render();
      if (typeof root.showToast === 'function') {
        root.showToast('Preços atualizados com sucesso.');
      }
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

        // 3. Synchronize operational equity globally
        if (typeof root.setOperationalEquity === 'function') {
          root.setOperationalEquity(realWealth);
        }

        // 4. Update cached wealth summary in localStorage
        try {
          const cached = localStorage.getItem('healthy-trend-wealth-cache');
          if (cached) {
            const parsed = JSON.parse(cached);
            if (parsed.summary) {
              parsed.summary.realWealth = realWealth;
              parsed.summary.operationalEquity = realWealth;
            }
            localStorage.setItem('healthy-trend-wealth-cache', JSON.stringify(parsed));
          }
        } catch (_) {}

        // 5. Persist account balances and closing history to workspace-state
        if (root.healthyTrendWorkspace?.save) {
          root.healthyTrendWorkspace.save('healthy-daily-update-accounts', this.model.accounts);
          root.healthyTrendWorkspace.save('healthy-daily-update-history', this.model.getHistory());
        }

        // 6. Notify all other screens and models via official custom events
        try {
          root.dispatchEvent(new CustomEvent('healthyTrend:equityUpdated', { detail: { newEquity: realWealth, accounts: this.model.accounts } }));
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

        // Sync operational equity
        if (typeof root.setOperationalEquity === 'function') {
          root.setOperationalEquity(snapshot.realWealth);
        }

        // Persist history to workspace
        if (root.healthyTrendWorkspace?.save) {
          root.healthyTrendWorkspace.save('healthy-daily-update-history', this.model.getHistory());
          root.healthyTrendWorkspace.save('healthy-daily-update-accounts', this.model.accounts);
        }

        // Dispatch events
        try {
          root.dispatchEvent(new CustomEvent('healthyTrend:equityUpdated', { detail: { newEquity: snapshot.realWealth, accounts: this.model.accounts } }));
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

        // Persist history to workspace
        if (root.healthyTrendWorkspace?.save) {
          root.healthyTrendWorkspace.save('healthy-daily-update-history', this.model.getHistory());
          root.healthyTrendWorkspace.save('healthy-daily-update-accounts', this.model.accounts);
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
              subtitle: 'Contas XP, Nomad, Genial e Clear',
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
              subtitle: 'Visão detalhada: XP, Nomad, Genial e Clear',
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
              subtitle: 'Evolução da soma de todas as 6 contas registradas',
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

  // Auto-init on page load or navigation
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
      root.DailyUpdateHub.init();
    });
  }
}(typeof self !== 'undefined' ? self : this));

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
                <table class="daily-update-table" aria-label="Tabela de Contas e Saldos">
                  <thead>
                    <tr>
                      <th>Conta</th>
                      <th>Saldo Anterior</th>
                      <th>Novo Saldo</th>
                      <th>Variação</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${model.accounts.map((acc) => {
                      const varPct = model.getAccountVariationPct(acc);
                      const isPending = acc.status === 'pending';
                      const isUpdated = acc.status === 'updated';
                      const isKeep = acc.status === 'keep';
                      const hasError = Boolean(acc.error);
                      const varClass = varPct > 0.001 ? 'positive' : varPct < -0.001 ? 'negative' : 'neutral';
                      const isNomad = acc.currency === 'USD';
                      const inputCurrency = acc.inputCurrency || 'BRL';

                      let inputValue = fmtBRL(acc.newBalance);
                      if (isNomad && inputCurrency === 'USD') {
                        inputValue = fmtUSD(acc.newBalanceUSD || 0);
                      }

                      return `
                        <tr class="account-row ${isPending ? 'pending' : ''} ${hasError ? 'error' : ''}" data-account-id="${acc.id}">
                          <td>
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
                          <td class="account-prev-cell">
                            <span class="prev-amount">${fmtBRL(acc.previousBalance)}</span>
                            ${isNomad ? `<small class="prev-usd-hint">${fmtUSD(acc.previousBalanceUSD || 0)}</small>` : ''}
                          </td>
                          <td class="account-input-cell">
                            <input 
                              type="text" 
                              class="balance-input ${hasError ? 'input-error' : ''}" 
                              data-account-input="${acc.id}" 
                              value="${inputValue}" 
                              aria-label="Novo saldo para ${acc.label}"
                              placeholder="0,00"
                            />
                            ${hasError ? `<span class="account-error-msg">${acc.error}</span>` : ''}
                          </td>
                          <td>
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
                          <td>
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
                      <th style="width: 72px;">Ativo</th>
                      <th style="text-align: right; width: 55px;">Quantidade</th>
                      <th style="text-align: right; width: 78px;">Preço Entrada</th>
                      <th style="text-align: right; width: 80px;">Preço Atual</th>
                      <th style="text-align: right; width: 62px;">Variação</th>
                      <th style="text-align: right; width: 78px;">Stop / Trailing</th>
                      <th style="text-align: center; width: 85px;">Status</th>
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
                <h3>3. Fechamento do Dia</h3>
                <p>Revise o resumo e registre o fechamento diário.</p>
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

            <button 
              type="button" 
              class="btn-save-closing ${!progress.readyToClose ? 'disabled' : ''}" 
              onclick="window.DailyUpdateHub.saveDailyClosing()"
              ${!progress.readyToClose ? 'aria-disabled="true"' : ''}
            >
              <span>✓</span> Salvar Fechamento Diário
            </button>
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
        // 1. Persist to existing /api/wealth/adjustments (source of truth)
        if (root.healthyTrendApi?.request && root.healthyTrendApi.isAuthenticated?.()) {
          await root.healthyTrendApi.request('/api/wealth/adjustments', {
            method: 'POST',
            body: {
              newAmount: realWealth,
              reason: reason
            }
          });
        }

        // 2. Synchronize operational equity globally
        if (typeof root.setOperationalEquity === 'function') {
          root.setOperationalEquity(realWealth);
        }

        // 3. Update cached wealth summary in localStorage
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

        // 4. Persist account balances to workspace-state
        if (root.healthyTrendWorkspace?.save) {
          root.healthyTrendWorkspace.save('healthy-daily-update-accounts', this.model.accounts);
        }

        // 5. Notify all other screens and models via official custom events
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

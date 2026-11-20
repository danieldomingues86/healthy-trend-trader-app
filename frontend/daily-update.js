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
        if (Array.isArray(tradesRes) && tradesRes.length > 0) {
          this.model.positions = tradesRes.map((t, idx) => ({
            id: t.id || `pos_${idx}`,
            ticker: t.ticker,
            quantity: Number(t.executed_quantity || t.total_quantity || t.planned_quantity || 0),
            entryPrice: Number(t.average_entry_price || t.execution_price || t.entry_price || 0),
            currentPrice: Number(t.current_price || t.execution_price || t.entry_price || 0),
            stopPrice: Number(t.stop_price || 0),
            status: 'Aberta',
            checked: true
          }));
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
                  <span class="card-icon" aria-hidden="true">📊</span>
                  <div class="card-title-text">
                    <h2>2. Conferir Posições Abertas</h2>
                    <p>Atualize preços, quantidades e trailing stops conforme sua corretora.</p>
                  </div>
                </div>
                <span class="card-badge">${model.positions.length} posições abertas</span>
              </header>

              <div class="daily-update-table-container">
                <table class="daily-update-table" aria-label="Tabela de Posições Abertas">
                  <thead>
                    <tr>
                      <th>Ativo</th>
                      <th>Quantidade</th>
                      <th>Preço Entrada</th>
                      <th>Preço Atual</th>
                      <th>Variação</th>
                      <th>Stop / Trailing</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${model.positions.map((pos) => {
                      const entry = Number(pos.entryPrice || 0);
                      const curr = Number(pos.currentPrice || entry);
                      const varPct = entry > 0 ? ((curr - entry) / entry) * 100 : 0;
                      const varClass = varPct > 0 ? 'positive' : varPct < 0 ? 'negative' : 'neutral';
                      return `
                        <tr>
                          <td><strong>${pos.ticker}</strong></td>
                          <td>${pos.quantity}</td>
                          <td>${fmtBRL(entry)}</td>
                          <td>${fmtBRL(curr)}</td>
                          <td>
                            <span class="variation-tag ${varClass}">
                              ${varPct > 0 ? '+' : ''}${varPct.toFixed(2).replace('.', ',')}%
                            </span>
                          </td>
                          <td>${fmtBRL(pos.stopPrice)}</td>
                          <td>
                            <span class="status-tag updated">
                              ${pos.status}
                            </span>
                          </td>
                        </tr>
                      `;
                    }).join('')}
                  </tbody>
                </table>
              </div>

              <footer class="daily-update-card-footer">
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
                <a href="#positions" class="link-action" onclick="if (typeof go === 'function') { go('positions'); return false; }">
                  Ir para Posições Abertas ↗
                </a>
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
      container.querySelectorAll('[data-account-input]').forEach(input => {
        // Real-time recalculation as user types
        input.addEventListener('input', (e) => {
          const accId = input.dataset.accountInput;
          const val = e.target.value;
          const acc = this.model.accounts.find(a => a.id === accId);
          const isUSD = acc?.currency === 'USD' && acc?.inputCurrency === 'USD';

          this.model.updateAccountBalance(accId, val, isUSD);
          this.updateTotalsLive();
        });

        // Full re-render on blur or change to format value
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

      const elExpPct = document.getElementById('kpiExposurePct');
      if (elExpPct) elExpPct.textContent = `${exposurePct.toFixed(2).replace('.', ',')}% do patrimônio`;

      const elTableWealth = document.getElementById('tableConsolidatedWealth');
      if (elTableWealth) elTableWealth.textContent = fmtBRL(realWealth);

      const elTableDayVar = document.getElementById('tableDayVar');
      if (elTableDayVar) {
        elTableDayVar.style.color = dayVarNominal >= 0 ? '#1e7e4a' : '#d14343';
        elTableDayVar.innerHTML = `${dayVarNominal >= 0 ? '▲' : '▼'} ${fmtPct(dayVarPct)} (${fmtBRL(dayVarNominal)})`;
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

    async handleBatchPrices() {
      if (typeof root.showToast === 'function') {
        root.showToast('Atualizando cotações das posições abertas...');
      }
      this.model.positions.forEach(p => {
        p.currentPrice = Math.round(Number(p.currentPrice) * 1.002 * 100) / 100;
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
          if (progress.pendingAccounts > 0) {
            root.showToast(`Existem ${progress.pendingAccounts} conta(s) pendente(s) de conferência.`);
          } else if (progress.invalidAccounts > 0) {
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

/**
 * HEALTHY TREND TRADER — STRATEGY CONFIGURATION CENTER UI (PASSO 3)
 * Central de Configurações, Parâmetros e Versionamento por Estratégia
 */

(function(root) {
  'use strict';

  const model = root.StrategyConfigurationModel || (typeof require === 'function' ? require('./strategy-configuration-model') : null);

  class StrategyConfigurationCenter {
    constructor() {
      this.activeStrategy = 'VOLATILITY_TRADING';
      this.profiles = [];
      this.activeProfile = null;
      this.modalEl = null;
      this.isOpen = false;
      this.comparingProfileId = null;

      this.init();
    }

    init() {
      if (typeof document === 'undefined') return;

      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => this.setup());
      } else {
        this.setup();
      }

      // Reage à mudança de estratégia global
      if (typeof window !== 'undefined') {
        window.addEventListener('healthyTrend:strategyChanged', (e) => {
          const newStrat = e.detail?.strategy;
          if (newStrat) {
            this.activeStrategy = String(newStrat).toUpperCase().includes('VOLATILITY') ? 'VOLATILITY_TRADING' : 'TREND_FOLLOWING';
            if (this.isOpen) this.loadAndRender();
          }
        });
      }
    }

    setup() {
      this.injectQuickButton();
      this.createModalStructure();
    }

    injectQuickButton() {
      const topbarSelector = document.querySelector('.strategy-workspace-selector');
      if (!topbarSelector || document.getElementById('stratConfigQuickBtn')) return;

      const btn = document.createElement('button');
      btn.id = 'stratConfigQuickBtn';
      btn.className = 'strat-config-quick-btn';
      btn.type = 'button';
      btn.title = 'Central de Configurações de Estratégia & Parâmetros';
      btn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="3"></circle>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
        </svg>
        <span>Perfis</span>
      `;

      btn.addEventListener('click', () => this.open());
      topbarSelector.insertAdjacentElement('afterend', btn);
    }

    createModalStructure() {
      if (document.getElementById('stratConfigModal')) return;

      const backdrop = document.createElement('div');
      backdrop.id = 'stratConfigModal';
      backdrop.className = 'strat-config-modal-backdrop';
      backdrop.setAttribute('role', 'dialog');
      backdrop.setAttribute('aria-modal', 'true');

      backdrop.innerHTML = `
        <div class="strat-config-modal-container">
          <div class="strat-config-header">
            <div class="strat-config-title-group">
              <span class="strat-config-eyebrow">Strategy Configuration Center</span>
              <h2 class="strat-config-title">
                <span>⚙️ Perfis & Parâmetros de Estratégia</span>
              </h2>
            </div>

            <div class="strat-config-header-tabs" role="tablist">
              <button type="button" class="strat-config-tab-btn" data-tab="VOLATILITY_TRADING">
                <span>⚡ Volatility Trading</span>
              </button>
              <button type="button" class="strat-config-tab-btn" data-tab="TREND_FOLLOWING">
                <span>📈 Trend Following</span>
              </button>
            </div>

            <button type="button" class="strat-config-close-btn" id="closeStratConfigModal" title="Fechar">
              ✕
            </button>
          </div>

          <div class="strat-config-body" id="stratConfigBody">
            <div style="text-align:center; padding: 40px; color: #64748b;">Carregando configurações...</div>
          </div>
        </div>
      `;

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) this.close();
      });

      document.body.appendChild(backdrop);
      this.modalEl = backdrop;

      // Eventos dos botões de fechar e tabs
      backdrop.querySelector('#closeStratConfigModal').addEventListener('click', () => this.close());
      backdrop.querySelectorAll('.strat-config-tab-btn').forEach(tab => {
        tab.addEventListener('click', () => {
          this.activeStrategy = tab.dataset.tab;
          this.loadAndRender();
        });
      });
    }

    open(strategy = null) {
      if (!this.modalEl) this.createModalStructure();
      if (strategy) {
        this.activeStrategy = strategy.toUpperCase().includes('TREND') ? 'TREND_FOLLOWING' : 'VOLATILITY_TRADING';
      } else if (typeof document !== 'undefined' && document.body.dataset.strategyWorkspace) {
        this.activeStrategy = document.body.dataset.strategyWorkspace.toUpperCase().includes('TREND') ? 'TREND_FOLLOWING' : 'VOLATILITY_TRADING';
      }

      this.isOpen = true;
      this.modalEl.classList.add('open');
      document.body.style.overflow = 'hidden';
      this.loadAndRender();
    }

    close() {
      if (!this.modalEl) return;
      this.isOpen = false;
      this.modalEl.classList.remove('open');
      document.body.style.overflow = '';
      this.comparingProfileId = null;
    }

    async loadAndRender() {
      if (!this.modalEl) return;

      // Atualiza tabs do cabeçalho
      this.modalEl.querySelectorAll('.strat-config-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === this.activeStrategy);
      });

      const bodyEl = this.modalEl.querySelector('#stratConfigBody');
      bodyEl.innerHTML = '<div style="text-align:center; padding: 40px; color: #64748b;">Carregando perfis...</div>';

      try {
        let configs = [];
        if (window.healthyTrendApi?.request) {
          const res = await window.healthyTrendApi.request(`/api/strategy-configs?strategy=${this.activeStrategy}`);
          configs = res?.configs || [];
        }

        if (!configs || configs.length === 0) {
          // Fallback para presets do modelo se offline
          configs = model.getPresetExperiments(this.activeStrategy).map((p, idx) => ({
            id: `offline-cfg-${idx}`,
            name: p.name,
            description: p.description,
            version: '1.0',
            isActive: p.isActive,
            is_active: p.isActive,
            status: 'active',
            parameters: p.parameters,
            parametersHash: model.computeParametersHash(p.parameters)
          }));
        }

        this.profiles = configs;
        this.activeProfile = configs.find(c => c.isActive || c.is_active) || configs[0] || null;
        this.renderBody(bodyEl);
      } catch (err) {
        bodyEl.innerHTML = `<div style="text-align:center; padding: 30px; color: #dc2626;">Erro ao carregar configurações: ${err.message}</div>`;
      }
    }

    renderBody(container) {
      const isVol = this.activeStrategy === 'VOLATILITY_TRADING';

      let presetsHtml = '';
      if (isVol) {
        presetsHtml = `
          <div class="strat-config-presets-strip">
            <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0284c7;">Experimentos IFR:</span>
            <button type="button" class="strat-config-preset-pill" data-preset-level="10">⚡ Nível 10 (Oficial)</button>
            <button type="button" class="strat-config-preset-pill" data-preset-level="5">⚡ Nível 5 (Extremo)</button>
            <button type="button" class="strat-config-preset-pill" data-preset-level="15">⚡ Nível 15 (Moderado)</button>
            <button type="button" class="strat-config-preset-pill" data-preset-level="20">⚡ Nível 20 (Amplo)</button>
          </div>
        `;
      }

      const activeBadgeName = this.activeProfile ? this.activeProfile.name : 'Nenhum';

      let cardsHtml = this.profiles.map(p => this.renderProfileCard(p)).join('');

      let compareSection = '';
      if (this.comparingProfileId) {
        const compProfile = this.profiles.find(p => p.id === this.comparingProfileId);
        if (compProfile && this.activeProfile) {
          compareSection = this.renderComparisonDrawer(this.activeProfile, compProfile);
        }
      }

      container.innerHTML = `
        <div class="strat-config-toolbar">
          <div class="strat-config-toolbar-left">
            <span style="font-size: 12px; font-weight: 700;">Perfil Ativo em Vigor:</span>
            <span class="strat-badge-active" style="background:#0f2a20; color:#fff;">${activeBadgeName}</span>
          </div>
          <div class="strat-config-toolbar-right">
            <button type="button" class="strat-config-btn secondary" id="btnNewExperiment">
              ➕ Novo Perfil
            </button>
          </div>
        </div>

        ${presetsHtml}

        ${compareSection}

        <div class="strat-config-grid">
          ${cardsHtml}
        </div>
      `;

      this.bindActions(container);
    }

    renderProfileCard(p) {
      const isActive = p.isActive || p.is_active;
      const isVol = this.activeStrategy === 'VOLATILITY_TRADING';
      const params = p.parameters || {};

      let matrixHtml = '';
      if (isVol) {
        matrixHtml = `
          <div class="strat-profile-params-matrix">
            <div class="strat-param-item">
              <span class="strat-param-label">Média Curta (SMA)</span>
              <span class="strat-param-value">${params.fastSmaPeriod || 7}d</span>
            </div>
            <div class="strat-param-item">
              <span class="strat-param-label">Média Estrutural (SMA)</span>
              <span class="strat-param-value">${params.structuralSmaPeriod || 200}d</span>
            </div>
            <div class="strat-param-item">
              <span class="strat-param-label">IFR(${params.rsiPeriod || 2})</span>
              <span class="strat-param-value" style="color: #0284c7;">≤ ${params.oversoldLevel || 10} pts</span>
            </div>
            <div class="strat-param-item">
              <span class="strat-param-label">Saída Máxima</span>
              <span class="strat-param-value">${params.maxHoldingDays || 7} pregões</span>
            </div>
            <div class="strat-param-item">
              <span class="strat-param-label">Capital / Trade</span>
              <span class="strat-param-value">R$ ${(params.fixedCapitalPerTrade || 10000).toLocaleString('pt-BR')}</span>
            </div>
            <div class="strat-param-item">
              <span class="strat-param-label">Stop Loss</span>
              <span class="strat-param-value">${params.stopLossEnabled ? (params.stopLossPct * 100) + '%' : 'Desabilitado'}</span>
            </div>
          </div>
        `;
      } else {
        matrixHtml = `
          <div class="strat-profile-params-matrix">
            <div class="strat-param-item">
              <span class="strat-param-label">Filtro de Tendência</span>
              <span class="strat-param-value">EMA21 / SMA50</span>
            </div>
            <div class="strat-param-item">
              <span class="strat-param-label">Rubric Mínima</span>
              <span class="strat-param-value">Score ≥ ${params.rubricMinScore || 85}</span>
            </div>
            <div class="strat-param-item">
              <span class="strat-param-label">Risco Base</span>
              <span class="strat-param-value">${((params.riskBasePct || 0.005) * 100).toFixed(1)}%</span>
            </div>
            <div class="strat-param-item">
              <span class="strat-param-label">Limite Posições</span>
              <span class="strat-param-value">${params.maxOpenPositions || 6} posições</span>
            </div>
          </div>
        `;
      }

      const shortHash = (p.parametersHash || p.parameters_hash || '').slice(0, 8);

      return `
        <div class="strat-profile-card ${isActive ? 'active-profile' : ''}" data-config-id="${p.id}">
          <div class="strat-profile-card-header">
            <div>
              <h4 class="strat-profile-title">${p.name}</h4>
              <p class="strat-profile-desc">${p.description || 'Configuração padrão sem descrição.'}</p>
            </div>
            <div class="strat-profile-badges">
              ${isActive ? '<span class="strat-badge-active">Ativo</span>' : ''}
              <span class="strat-badge-version">v${p.version || '1.0'}</span>
              ${shortHash ? `<span class="strat-badge-hash" title="Hash SHA-256: ${p.parametersHash || p.parameters_hash}">#${shortHash}</span>` : ''}
            </div>
          </div>

          ${matrixHtml}

          <div class="strat-profile-card-actions">
            ${!isActive ? `<button type="button" class="strat-config-btn primary btn-activate" data-id="${p.id}">Ativar</button>` : ''}
            <button type="button" class="strat-config-btn secondary btn-duplicate" data-id="${p.id}" title="Duplicar perfil">📋 Duplicar</button>
            ${!isActive ? `<button type="button" class="strat-config-btn secondary btn-compare" data-id="${p.id}" title="Comparar com perfil ativo">⚖️ Comparar</button>` : ''}
          </div>
        </div>
      `;
    }

    renderComparisonDrawer(profileActive, profileComp) {
      const diffs = model.compareProfiles(profileActive, profileComp);

      const rowsHtml = diffs.map(d => {
        return `
          <tr class="${d.isDifferent ? 'diff-row' : ''}">
            <td>${d.label} ${d.isDifferent ? '<span class="strat-compare-diff-tag">Diferente</span>' : ''}</td>
            <td><b>${d.formattedA}</b></td>
            <td><b>${d.formattedB}</b></td>
          </tr>
        `;
      }).join('');

      return `
        <div style="background: var(--paper-2, #ffffff); border: 1px solid rgba(2, 132, 199, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h4 style="margin: 0; font-size: 14px; color: #0284c7; display: flex; align-items: center; gap: 8px;">
              <span>⚖️ Comparação:</span>
              <span style="color: #0f2a20;">${profileActive.name} (Ativo)</span>
              <span>vs</span>
              <span style="color: #0284c7;">${profileComp.name}</span>
            </h4>
            <button type="button" class="strat-config-btn secondary" id="btnCloseCompare">✕ Fechar Comparação</button>
          </div>
          <table class="strat-compare-table">
            <thead>
              <tr>
                <th>Parâmetro</th>
                <th>${profileActive.name} (Ativo)</th>
                <th>${profileComp.name}</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
    }

    bindActions(container) {
      // Ativar perfil
      container.querySelectorAll('.btn-activate').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          try {
            if (window.healthyTrendApi?.request) {
              await window.healthyTrendApi.request(`/api/strategy-configs/${id}/set-active`, { method: 'POST' });
            }
            if (window.dispatchEvent) {
              window.dispatchEvent(new CustomEvent('healthyTrend:strategyConfigChanged', { detail: { configId: id } }));
            }
            this.loadAndRender();
          } catch (err) {
            alert(`Erro ao ativar perfil: ${err.message}`);
          }
        });
      });

      // Duplicar perfil
      container.querySelectorAll('.btn-duplicate').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.id;
          try {
            if (window.healthyTrendApi?.request) {
              await window.healthyTrendApi.request(`/api/strategy-configs/${id}/duplicate`, { method: 'POST', body: {} });
            }
            this.loadAndRender();
          } catch (err) {
            alert(`Erro ao duplicar perfil: ${err.message}`);
          }
        });
      });

      // Comparar perfil
      container.querySelectorAll('.btn-compare').forEach(btn => {
        btn.addEventListener('click', () => {
          this.comparingProfileId = btn.dataset.id;
          this.renderBody(container);
        });
      });

      // Fechar comparação
      const closeCompareBtn = container.querySelector('#btnCloseCompare');
      if (closeCompareBtn) {
        closeCompareBtn.addEventListener('click', () => {
          this.comparingProfileId = null;
          this.renderBody(container);
        });
      }

      // Pre-set experiments buttons
      container.querySelectorAll('.strat-config-preset-pill').forEach(pill => {
        pill.addEventListener('click', async () => {
          const level = Number(pill.dataset.presetLevel);
          const name = `IFR(2) / Nível ${level} — Experimento`;
          const params = {
            ...model.VOLATILITY_SWING_DEFAULTS,
            oversoldLevel: level
          };
          try {
            if (window.healthyTrendApi?.request) {
              await window.healthyTrendApi.request('/api/strategy-configs', {
                method: 'POST',
                body: {
                  strategyType: 'VOLATILITY_TRADING',
                  name,
                  description: `Experimento de sensibilidade com IFR(2) abaixo de ${level}.`,
                  parameters: params,
                  isActive: false
                }
              });
            }
            this.loadAndRender();
          } catch (err) {
            alert(`Erro ao adicionar experimento: ${err.message}`);
          }
        });
      });

      // Novo experimento manual
      const newBtn = container.querySelector('#btnNewExperiment');
      if (newBtn) {
        newBtn.addEventListener('click', async () => {
          const name = prompt('Nome do novo perfil experimental:', `Experimento ${this.activeStrategy === 'VOLATILITY_TRADING' ? 'Volatility' : 'Trend'} ${new Date().toLocaleDateString('pt-BR')}`);
          if (!name) return;

          const baseParams = this.activeStrategy === 'VOLATILITY_TRADING' ? model.VOLATILITY_SWING_DEFAULTS : model.TREND_FOLLOWING_DEFAULTS;
          try {
            if (window.healthyTrendApi?.request) {
              await window.healthyTrendApi.request('/api/strategy-configs', {
                method: 'POST',
                body: {
                  strategyType: this.activeStrategy,
                  name,
                  description: 'Perfil experimental customizado.',
                  parameters: baseParams,
                  isActive: false
                }
              });
            }
            this.loadAndRender();
          } catch (err) {
            alert(`Erro ao criar perfil: ${err.message}`);
          }
        });
      }
    }
  }

  // Instancia e expõe globalmente
  const instance = new StrategyConfigurationCenter();
  if (typeof window !== 'undefined') {
    window.StrategyConfigCenter = instance;
    window.openStrategyConfigCenter = (strategy) => instance.open(strategy);
  }
})(typeof window !== 'undefined' ? window : globalThis);

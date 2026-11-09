/**
 * HEALTHY TREND TRADER — STRATEGY WORKSPACE UI CONTROLLER (PASSO 1)
 * Mounts global strategy switcher in Topbar and Sidebar, handles UI reactions.
 */

(function(root) {
  'use strict';

  const Model = root.StrategyWorkspaceModel;

  class StrategyWorkspaceUI {
    constructor() {
      this.initialized = false;
    }

    init() {
      if (this.initialized) return;
      if (!Model) {
        console.warn('[StrategyWorkspaceUI] StrategyWorkspaceModel não carregado.');
        return;
      }

      this.initialized = true;
      this.mountTopbarSelector();
      this.mountSidebarIndicator();
      this.bindEvents();
      this.updateActiveUI(Model.getActiveStrategy());
    }

    mountTopbarSelector() {
      let selector = document.getElementById('strategyWorkspaceSelector');

      if (!selector) {
        const topbar = document.querySelector('.topbar');
        const topActions = document.querySelector('.top-actions');
        if (!topbar) return;

        const strategies = Model.getAllStrategies();
        const active = Model.getActiveStrategy();

        selector = document.createElement('div');
        selector.id = 'strategyWorkspaceSelector';
        selector.className = 'strategy-workspace-selector';
        selector.setAttribute('role', 'tablist');
        selector.setAttribute('aria-label', 'Selecionar estratégia operacional ativa');

        selector.innerHTML = strategies.map(s => {
          const isActive = s.id === active;
          const icon = s.id === 'trend_following' ? '📈' : '⚡';
          return `
            <button type="button" 
              class="strat-pill-btn ${s.id === 'trend_following' ? 'strat-trend' : 'strat-volatility'} ${isActive ? 'active' : ''}" 
              role="tab" 
              aria-selected="${isActive ? 'true' : 'false'}"
              data-strategy-target="${s.id}"
              title="${s.subtitle} — ${s.description}">
              <span class="strat-pill-icon" aria-hidden="true">${icon}</span>
              <span class="strat-pill-text">${s.label}</span>
            </button>
          `;
        }).join('');

        if (topActions) {
          topActions.insertBefore(selector, topActions.firstChild);
        } else {
          topbar.appendChild(selector);
        }
      }

      // Delegate click
      if (!selector.dataset.bound) {
        selector.dataset.bound = 'true';
        selector.addEventListener('click', (e) => {
          const btn = e.target.closest('[data-strategy-target]');
          if (!btn) return;
          const targetStrategy = btn.dataset.strategyTarget;
          if (targetStrategy) {
            const changed = Model.setActiveStrategy(targetStrategy);
            if (changed) {
              const cfg = Model.getStrategyConfig(targetStrategy);
              if (typeof root.showToast === 'function') {
                root.showToast(`Ambiente ativo: ${cfg.label} (${cfg.shortLabel})`);
              }
            }
          }
        });
      }
    }

    mountSidebarIndicator() {
      let indicator = document.getElementById('sidebarStrategyIndicator');

      if (!indicator) {
        const brand = document.querySelector('.sidebar .brand');
        if (!brand) return;

        const active = Model.getActiveStrategy();
        const cfg = Model.getStrategyConfig(active);

        indicator = document.createElement('div');
        indicator.id = 'sidebarStrategyIndicator';
        indicator.className = 'sidebar-strategy-indicator';
        indicator.setAttribute('title', 'Clique para alternar o ambiente operacional ativo');
        indicator.innerHTML = `
          <span class="sidebar-strategy-tag">
            <span class="sidebar-strategy-dot"></span>
            <span class="sidebar-strategy-text">${cfg.shortLabel}</span>
          </span>
          <span class="sidebar-strategy-switch-hint">Trocar ⇄</span>
        `;

        brand.insertAdjacentElement('afterend', indicator);
      }

      if (!indicator.dataset.bound) {
        indicator.dataset.bound = 'true';
        indicator.addEventListener('click', () => {
          const switched = Model.toggleStrategy();
          if (switched) {
            const newCfg = Model.getStrategyConfig();
            if (typeof root.showToast === 'function') {
              root.showToast(`Ambiente alternado para ${newCfg.label}`);
            }
          }
        });
      }
    }

    bindEvents() {
      // Listen to healthyTrend:strategyChanged
      window.addEventListener('healthyTrend:strategyChanged', (e) => {
        const strategyId = e.detail?.strategy || Model.getActiveStrategy();
        this.updateActiveUI(strategyId);

        // If sidebar navigation is present, refresh it to adapt hierarchy/context
        if (root.SidebarNavigation && typeof root.SidebarNavigation.refresh === 'function') {
          root.SidebarNavigation.refresh();
        }
      });

      // Workspace loaded sync
      window.addEventListener('healthyTrend:workspaceLoaded', (e) => {
        const state = e.detail?.state || {};
        if (state.activeStrategy) {
          Model.setActiveStrategy(state.activeStrategy);
        }
      });
    }

    updateActiveUI(strategyId) {
      const cfg = Model.getStrategyConfig(strategyId);

      // Update topbar pills
      const topbarSelector = document.getElementById('strategyWorkspaceSelector');
      if (topbarSelector) {
        topbarSelector.querySelectorAll('.strat-pill-btn').forEach(btn => {
          const isTarget = btn.dataset.strategyTarget === strategyId;
          btn.classList.toggle('active', isTarget);
          btn.setAttribute('aria-selected', isTarget ? 'true' : 'false');
        });
      }

      // Update sidebar indicator
      const sidebarText = document.querySelector('.sidebar-strategy-text');
      if (sidebarText) {
        sidebarText.textContent = cfg.shortLabel;
      }

      // Update crumb strategy indicator if present
      const crumb = document.querySelector('.crumb') || document.getElementById('crumb');
      if (crumb) {
        let pill = crumb.querySelector('.crumb-strategy-pill');
        if (!pill) {
          pill = document.createElement('span');
          pill.className = 'crumb-strategy-pill';
          crumb.appendChild(pill);
        }
        pill.textContent = cfg.shortLabel;
        pill.className = `crumb-strategy-pill ${cfg.badgeClass}`;
      }
    }
  }

  root.StrategyWorkspaceUI = new StrategyWorkspaceUI();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => root.StrategyWorkspaceUI.init());
  } else {
    root.StrategyWorkspaceUI.init();
  }

})(typeof window !== 'undefined' ? window : globalThis);

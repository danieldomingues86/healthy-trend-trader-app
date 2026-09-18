/**
 * HEALTHY TREND TRADER - SIDEBAR NAVIGATION & INTELLIGENT FLYOUTS
 * 
 * Features:
 * - Structured navigation by trader action cycles
 * - Direct 1-click access for daily operations (Hoje, Rotina Diária, Monitor de Hábitos, Watchlist, Novo Trade)
 * - Hover & click-to-pin flyout submenus with safe hover bridge (no flicker)
 * - Collapsible sidebar (expanded 248px vs. collapsed 72px) with localStorage persistence
 * - Floating tooltips in collapsed mode
 * - Automatic active state synchronization with window.go()
 * - Keyboard accessibility (ESC, Enter, Space)
 */

(function(root) {
  'use strict';

  const STORAGE_KEY_COLLAPSED = 'healthy-sidebar-collapsed';

  // Complete navigation structure organized into Trader Action Cycles
  const NAV_STRUCTURE = [
    {
      id: 'daily',
      groupLabel: 'Operação Diária',
      items: [
        {
          id: 'today',
          label: 'Hoje',
          icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`,
          page: 'today'
        },
        {
          id: 'dailyroutine',
          label: 'Rotina Diária',
          icon: `<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 2.5H12a1.5 1.5 0 0 1 1.5 1.5v9.5a1.5 1.5 0 0 1-1.5 1.5H4a1.5 1.5 0 0 1-1.5-1.5V4a1.5 1.5 0 0 1 1.5-1.5h1.5"/><rect x="5.5" y="1" width="5" height="3" rx="1"/><path d="M5.5 7.5h5M5.5 11h3.5"/></svg>`,
          page: 'dailyroutine'
        },
        {
          id: 'habits',
          label: 'Monitor de Hábitos',
          icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
          page: 'habits'
        },
        {
          id: 'journal',
          label: 'Diário do Trader',
          icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>`,
          page: 'journal'
        },
        {
          id: 'watchlist',
          label: 'Watchlist',
          icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
          page: 'watchlist'
        },
        {
          id: 'newtrade',
          label: 'Novo Trade',
          icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>`,
          page: 'newtrade'
        }
      ]
    },
    {
      id: 'market-analysis',
      isGroup: true,
      label: 'Análise de Mercado',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`,
      header: 'ANÁLISE DE MERCADO',
      items: [
        {
          id: 'marketcycle',
          title: 'Ciclo de Mercado',
          desc: 'Entenda o ambiente atual.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>`,
          page: 'marketcycle'
        },
        {
          id: 'relativestrength',
          title: 'Relative Strength',
          desc: 'Veja quem está liderando.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
          page: 'relativestrength'
        },
        {
          id: 'emergingleaders',
          title: 'Líderes Emergentes',
          desc: 'Descubra novos líderes.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 20V10M12 20V4M6 20v-6"/><path d="m3 9 4-4 4 4 6-6"/></svg>`,
          page: 'emergingleaders'
        },
        {
          id: 'marketscans',
          title: 'Scans de Mercado',
          desc: 'Encontre movimentos relevantes.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
          page: 'marketscans'
        },
        {
          id: 'fundamentals',
          title: 'Fundamentalista',
          desc: 'Avalie a qualidade do ativo.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21h18M3 10h18M5 10v11M19 10v11M9 10v11M15 10v11M12 2 2 7h20L12 2Z"/></svg>`,
          page: 'fundamentals'
        }
      ]
    },
    {
      id: 'portfolio-risk',
      isGroup: true,
      label: 'Carteira & Risco',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="7" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
      header: 'CARTEIRA & RISCO',
      items: [
        {
          id: 'dashboard',
          title: 'Patrimônio',
          desc: 'Visão patrimonial e alocações.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
          page: 'dashboard'
        },
        {
          id: 'positions',
          title: 'Posições Abertas',
          desc: 'Gestão de stops e trailing.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
          page: 'positions'
        },
        {
          id: 'portfolioheat',
          title: 'Portfolio Heat',
          desc: 'Termômetro do risco da carteira.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2v8M4.93 10.93l1.41 1.41M2 18h2M20 18h2M17.66 12.34l1.41-1.41M12 14a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/></svg>`,
          page: 'portfolioheat'
        },
        {
          id: 'riskpolicy',
          title: 'Política de Risco',
          desc: 'Regras e limites operacionais.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
          page: 'riskpolicy'
        }
      ]
    },
    {
      id: 'data-performance',
      isGroup: true,
      label: 'Dados & Performance',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
      header: 'DADOS & PERFORMANCE',
      items: [
        {
          id: 'analytics',
          title: 'Painel da Verdade',
          desc: 'Métricas de assertividade e Payoff.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
          page: 'analytics'
        },
        {
          id: 'mistakesbook',
          title: 'Erros e Lições',
          desc: 'Caderno de falhas e aprendizados.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M10 10l4 4M14 10l-4 4"/></svg>`,
          page: 'mistakesbook'
        },
        {
          id: 'tradelibrary',
          title: 'Biblioteca de Trades',
          desc: 'Modelos de trades de referência.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>`,
          page: 'tradelibrary'
        },
        {
          id: 'emotionalintelligence',
          title: 'Analisador Emocional',
          desc: 'Psicologia e estado mental.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/></svg>`,
          page: 'emotionalintelligence'
        },
        {
          id: 'platformaccess',
          title: 'Uso da Plataforma',
          desc: 'Tempo de tela e monitor do Profit.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
          page: 'platformaccess'
        },
        {
          id: 'review',
          title: 'Revisão Mensal',
          desc: 'Balanço de fechamento de mês.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="m9 16 2 2 4-4"/></svg>`,
          page: 'review'
        },
        {
          id: 'forecast',
          title: 'Simulador de Resultados',
          desc: 'Projeção estatística e compounding.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m22 7-8.5 8.5-5-5L2 17"/><polyline points="16 7 22 7 22 13"/></svg>`,
          page: 'forecast'
        }
      ]
    },
    {
      id: 'mindset-zen',
      isGroup: true,
      label: 'Mentalidade & Zen',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a7 7 0 1 0 7 7"/></svg>`,
      header: 'MENTALIDADE & ZEN',
      items: [
        {
          id: 'zen',
          title: 'Trader Zen',
          desc: 'Pausas conscientes e reset mental.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 2a7 7 0 1 0 7 7"/></svg>`,
          page: 'zen'
        },
        {
          id: 'wisdom',
          title: 'Sabedoria do Trader',
          desc: 'Filosofia dos maiores mestres.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
          page: 'wisdom'
        },
        {
          id: 'traderprofile',
          title: 'Testes de Perfil',
          desc: 'Diagnóstico do seu perfil de risco.',
          icon: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
          page: 'traderprofile'
        }
      ]
    }
  ];

  const FOOTER_STRUCTURE = [
    {
      id: 'materials',
      label: 'Trader Store',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`,
      page: 'materials'
    },
    {
      id: 'settings',
      label: 'Configurações',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
      page: 'settings'
    },
    {
      id: 'manual',
      label: 'Manual do Software',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/></svg>`,
      page: 'manual'
    },
    {
      id: 'glossary',
      label: 'Glossário do Método',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>`,
      page: 'glossary'
    },
    {
      id: 'about',
      label: 'Sobre',
      icon: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
      page: 'about'
    }
  ];

  class SidebarNavigation {
    constructor() {
      this.isCollapsed = false;
      this.activeFlyoutGroup = null;
      this.activeTriggerBtn = null;
      this.isFlyoutPinned = false;
      this.flyoutEl = null;
      this.tooltipEl = null;
      this.closeTimeout = null;
      this.activePageId = 'today';
    }

    init() {
      const sidebar = document.querySelector('.sidebar');
      if (!sidebar) return;

      // Load collapsed state
      try {
        this.isCollapsed = localStorage.getItem(STORAGE_KEY_COLLAPSED) === 'true';
      } catch (e) {
        this.isCollapsed = false;
      }
      this.applyCollapsedState();

      // Create flyout & tooltip containers if not present
      this.ensureFlyoutElement();
      this.ensureTooltipElement();

      // Render new sidebar structure
      this.renderSidebar(sidebar);

      // Bind global events (click outside, ESC, resize)
      this.bindGlobalEvents();

      // Hook navigation
      this.hookNavigation();

      // Sync active state from current visible page
      const activeSection = document.querySelector('.page.active');
      if (activeSection && activeSection.id) {
        this.setActivePage(activeSection.id);
      }
    }

    applyCollapsedState() {
      if (this.isCollapsed) {
        document.body.classList.add('sidebar-collapsed');
      } else {
        document.body.classList.remove('sidebar-collapsed');
      }
      const btn = document.querySelector('.sidebar-collapse-btn');
      if (btn) {
        btn.textContent = this.isCollapsed ? '»' : '«';
        btn.setAttribute('title', this.isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral');
        btn.setAttribute('aria-expanded', String(!this.isCollapsed));
      }
    }

    toggleCollapse() {
      this.isCollapsed = !this.isCollapsed;
      try {
        localStorage.setItem(STORAGE_KEY_COLLAPSED, String(this.isCollapsed));
      } catch (e) {}
      this.applyCollapsedState();
      this.closeFlyout(true);
      this.hideTooltip();
    }

    ensureFlyoutElement() {
      if (this.flyoutEl) return;
      this.flyoutEl = document.createElement('div');
      this.flyoutEl.className = 'sidebar-flyout';
      this.flyoutEl.setAttribute('role', 'menu');
      this.flyoutEl.setAttribute('aria-label', 'Submenu');

      // Prevent closing when mouse is inside flyout
      this.flyoutEl.addEventListener('mouseenter', () => this.cancelClose());
      this.flyoutEl.addEventListener('mouseleave', () => {
        if (!this.isFlyoutPinned) {
          this.scheduleClose();
        }
      });

      document.body.appendChild(this.flyoutEl);
    }

    ensureTooltipElement() {
      if (this.tooltipEl) return;
      this.tooltipEl = document.createElement('div');
      this.tooltipEl.className = 'sidebar-tooltip';
      this.tooltipEl.setAttribute('role', 'tooltip');
      document.body.appendChild(this.tooltipEl);
    }

    renderSidebar(sidebar) {
      sidebar.innerHTML = `
        <header class="sidebar-header">
          <a class="sidebar-brand-link" onclick="go('today')" title="Início">
            <div class="sidebar-brand-mark"></div>
            <div class="sidebar-brand-titles">
              <strong><em>Healthy</em> Trend Trader</strong>
              <small>V4 PREMIUM</small>
            </div>
          </a>
          <button class="sidebar-collapse-btn" type="button" aria-label="Alternar menu lateral" title="${this.isCollapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}">
            ${this.isCollapsed ? '»' : '«'}
          </button>
        </header>

        <div class="sidebar-nav-container nav">
          ${this.renderNavGroups()}
        </div>

        <footer class="sidebar-footer">
          <div class="nav" style="display:flex; flex-direction:column; gap:3px;">
            ${this.renderFooterItems()}
          </div>
          <div class="sidebar-quote-card">
            <p class="sidebar-quote-text">“Disciplina transforma oportunidades em resultados.”</p>
          </div>
        </footer>
      `;

      this.bindSidebarEvents(sidebar);

      // Re-apply subscription access if defined
      if (typeof root.applySubscriptionAccess === 'function') {
        root.applySubscriptionAccess();
      }
    }

    renderNavGroups() {
      return NAV_STRUCTURE.map((block) => {
        if (block.groupLabel) {
          return `
            <div class="sidebar-group">
              <span class="sidebar-group-label">${block.groupLabel}</span>
              ${block.items.map((item) => this.renderDirectButton(item)).join('')}
            </div>
          `;
        }

        if (block.isGroup) {
          return this.renderGroupButton(block);
        }

        return '';
      }).join('');
    }

    renderFooterItems() {
      return FOOTER_STRUCTURE.map((item) => {
        if (item.isGroup) {
          return this.renderGroupButton(item);
        }
        return this.renderDirectButton(item);
      }).join('');
    }

    renderDirectButton(item) {
      return `
        <button class="sidebar-btn nav-btn" type="button" data-page="${item.page}" data-nav-id="${item.id}" data-label="${item.label}">
          <span class="sidebar-btn-ico">${item.icon}</span>
          <span class="sidebar-btn-label">${item.label}</span>
        </button>
      `;
    }

    renderGroupButton(group) {
      return `
        <button class="sidebar-btn sidebar-group-trigger" type="button" data-group-id="${group.id}" data-label="${group.label}" aria-haspopup="true" aria-expanded="false">
          <span class="sidebar-btn-ico">${group.icon}</span>
          <span class="sidebar-btn-label">${group.label}</span>
          <span class="sidebar-btn-arrow">›</span>
        </button>
      `;
    }

    bindSidebarEvents(sidebar) {
      // Collapse button
      sidebar.querySelector('.sidebar-collapse-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleCollapse();
      });

      // Direct page buttons
      sidebar.querySelectorAll('.sidebar-btn:not(.sidebar-group-trigger)').forEach((btn) => {
        btn.addEventListener('click', () => {
          this.closeFlyout(true);
          const page = btn.dataset.page;
          if (page && typeof root.go === 'function') {
            root.go(page);
          }
        });

        // Hover tooltip for collapsed mode
        btn.addEventListener('mouseenter', () => {
          if (this.isCollapsed) {
            this.showTooltip(btn, btn.dataset.label);
          }
        });
        btn.addEventListener('mouseleave', () => this.hideTooltip());
      });

      // Group trigger buttons (Flyouts)
      sidebar.querySelectorAll('.sidebar-group-trigger').forEach((btn) => {
        const groupId = btn.dataset.groupId;
        const groupDef = this.findGroupDef(groupId);
        if (!groupDef) return;

        // Hover opens flyout (desktop)
        btn.addEventListener('mouseenter', () => {
          this.cancelClose();
          if (this.isCollapsed) {
            this.hideTooltip();
          }
          this.openFlyout(groupDef, btn, false);
        });

        btn.addEventListener('mouseleave', () => {
          if (!this.isFlyoutPinned) {
            this.scheduleClose();
          }
        });

        // Click toggles / pins flyout
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          if (this.activeFlyoutGroup === groupDef.id && this.isFlyoutPinned) {
            this.closeFlyout(true);
          } else {
            this.openFlyout(groupDef, btn, true);
          }
        });
      });
    }

    findGroupDef(groupId) {
      const all = [...NAV_STRUCTURE, ...FOOTER_STRUCTURE];
      for (const item of all) {
        if (item.id === groupId) return item;
      }
      return null;
    }

    openFlyout(groupDef, triggerBtn, isPinned = false) {
      this.cancelClose();
      this.activeFlyoutGroup = groupDef.id;
      this.activeTriggerBtn = triggerBtn;
      this.isFlyoutPinned = isPinned;

      // Update trigger visual
      document.querySelectorAll('.sidebar-group-trigger').forEach((b) => {
        b.classList.toggle('flyout-open', b === triggerBtn);
        b.setAttribute('aria-expanded', String(b === triggerBtn));
      });

      const isProUser = typeof root.isProfessional === 'function' ? root.isProfessional() : false;
      const proPages = root.professionalPages || new Set();

      // Render flyout content
      this.flyoutEl.innerHTML = `
        <div class="flyout-header">
          <span>${groupDef.header || groupDef.label}</span>
          ${isPinned ? '<span style="font-size:9px; color:#638271; font-weight:600; cursor:pointer;" title="Clique para desfixar">FIXADO (ESC)</span>' : ''}
        </div>
        <div class="flyout-items-list nav">
          ${groupDef.items.map((sub) => {
            const isActive = this.activePageId === sub.page;
            const isLocked = proPages.has(sub.page) && !isProUser;
            return `
              <button class="flyout-item-link nav-btn ${isActive ? 'active' : ''} ${isLocked ? 'plan-locked' : ''}" type="button" data-page="${sub.page}" role="menuitem">
                <span class="flyout-item-icon">${sub.icon}</span>
                <div class="flyout-item-body">
                  <div class="flyout-item-title">
                    <span>${sub.title}</span>
                    ${isLocked ? '<span class="flyout-badge-pro">PRO</span>' : ''}
                  </div>
                  <span class="flyout-item-desc">${sub.desc}</span>
                </div>
              </button>
            `;
          }).join('')}
        </div>
      `;

      // Bind item clicks
      this.flyoutEl.querySelectorAll('.flyout-item-link').forEach((link) => {
        link.addEventListener('click', () => {
          const page = link.dataset.page;
          this.closeFlyout(true);
          if (page && typeof root.go === 'function') {
            root.go(page);
          }
        });
      });

      // Calculate position
      this.positionFlyout(triggerBtn);

      this.flyoutEl.classList.add('active');
    }

    positionFlyout(triggerBtn) {
      const rect = triggerBtn.getBoundingClientRect();
      const flyoutHeight = this.flyoutEl.offsetHeight || 300;
      const windowHeight = window.innerHeight;

      // Position to the right of the sidebar
      const left = rect.right + 10;

      // Vertical positioning with bounds checking
      let top = rect.top - 6;
      if (top + flyoutHeight > windowHeight - 16) {
        top = Math.max(16, windowHeight - flyoutHeight - 16);
      }

      this.flyoutEl.style.left = `${left}px`;
      this.flyoutEl.style.top = `${top}px`;
    }

    scheduleClose(delay = 220) {
      this.cancelClose();
      this.closeTimeout = setTimeout(() => {
        this.closeFlyout(false);
      }, delay);
    }

    cancelClose() {
      if (this.closeTimeout) {
        clearTimeout(this.closeTimeout);
        this.closeTimeout = null;
      }
    }

    closeFlyout(force = false) {
      if (this.isFlyoutPinned && !force) return;

      this.cancelClose();
      this.activeFlyoutGroup = null;
      this.activeTriggerBtn = null;
      this.isFlyoutPinned = false;

      if (this.flyoutEl) {
        this.flyoutEl.classList.remove('active');
      }

      document.querySelectorAll('.sidebar-group-trigger').forEach((b) => {
        b.classList.remove('flyout-open');
        b.setAttribute('aria-expanded', 'false');
      });
    }

    showTooltip(element, text) {
      if (!this.tooltipEl || !text) return;
      const rect = element.getBoundingClientRect();
      this.tooltipEl.textContent = text;
      this.tooltipEl.style.left = `${rect.right + 12}px`;
      this.tooltipEl.style.top = `${rect.top + (rect.height / 2) - 13}px`;
      this.tooltipEl.classList.add('active');
    }

    hideTooltip() {
      if (this.tooltipEl) {
        this.tooltipEl.classList.remove('active');
      }
    }

    bindGlobalEvents() {
      // Close on outside click
      document.addEventListener('click', (e) => {
        if (!this.activeFlyoutGroup) return;
        const target = e.target;
        if (!this.flyoutEl.contains(target) && !target.closest('.sidebar-group-trigger')) {
          this.closeFlyout(true);
        }
      });

      // ESC key to close
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          this.closeFlyout(true);
          this.hideTooltip();
        }
      });

      // Reposition or close on resize
      window.addEventListener('resize', () => {
        if (this.activeTriggerBtn && this.flyoutEl?.classList.contains('active')) {
          this.positionFlyout(this.activeTriggerBtn);
        }
      });
    }

    hookNavigation() {
      const originalGo = root.go;
      if (typeof originalGo === 'function') {
        root.go = (id) => {
          originalGo(id);
          this.setActivePage(id);
        };
      }
    }

    setActivePage(pageId) {
      this.activePageId = pageId;

      // Check all direct items
      document.querySelectorAll('.sidebar-btn').forEach((btn) => {
        const isDirect = btn.dataset.page === pageId;
        btn.classList.toggle('active', isDirect);
      });

      // Check which parent group owns this pageId
      const allGroups = [...NAV_STRUCTURE, ...FOOTER_STRUCTURE].filter((x) => x.isGroup);
      allGroups.forEach((group) => {
        const groupBtn = document.querySelector(`.sidebar-group-trigger[data-group-id="${group.id}"]`);
        if (!groupBtn) return;

        const isChildActive = group.items.some((sub) => sub.page === pageId);
        groupBtn.classList.toggle('parent-active', isChildActive);
      });

      // Update flyout active item if open
      if (this.flyoutEl && this.flyoutEl.classList.contains('active')) {
        this.flyoutEl.querySelectorAll('.flyout-item-link').forEach((link) => {
          link.classList.toggle('active', link.dataset.page === pageId);
        });
      }

      // Breadcrumb customization for grouped pages
      const crumb = document.getElementById('crumb');
      if (crumb) {
        for (const group of allGroups) {
          const matchedItem = group.items.find((sub) => sub.page === pageId);
          if (matchedItem) {
            crumb.textContent = `${group.label} / ${matchedItem.title}`;
            break;
          }
        }
      }
    }
  }

  // Export & auto-init
  root.SidebarNavigation = new SidebarNavigation();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => root.SidebarNavigation.init());
  } else {
    root.SidebarNavigation.init();
  }

})(typeof window !== 'undefined' ? window : globalThis);

/**
 * HEALTHY TREND TRADER — STRATEGY WORKSPACE MODEL (PASSO 1)
 * 
 * Single Source of Truth for Dual Strategy Architecture:
 * 1. TREND_FOLLOWING — Swing Trade de Tendência
 * 2. VOLATILITY_TRADING — Swing Trade de Volatilidade
 * 
 * Regra de Ouro da Arquitetura:
 * - Active Strategy Workspace: preferência de navegação do usuário na UI.
 * - Strategy Type do trade: classificação persistente e imutável de cada operação.
 * - Trocar de mundo NÃO altera, não reclassifica e não oculta os trades históricos.
 */

(function(root) {
  'use strict';

  // 1. CANONICAL STRATEGY ENUMS
  const STRATEGIES = {
    TREND_FOLLOWING: 'trend_following',
    VOLATILITY_TRADING: 'volatility_trading'
  };

  // 2. CANONICAL STRATEGY CONFIGURATIONS
  const STRATEGY_CONFIGS = {
    [STRATEGIES.TREND_FOLLOWING]: {
      id: STRATEGIES.TREND_FOLLOWING,
      key: 'TREND_FOLLOWING',
      label: 'Trend Following',
      shortLabel: 'Tendência',
      subtitle: 'Swing Trade de Tendência',
      icon: '📈',
      color: '#10b981',
      badgeClass: 'strat-badge-trend',
      accentVar: '--mint',
      description: 'Movimentos direcionais em tendências estabelecidas, ativos líderes e confluência de edges.',
      philosophy: 'Seguir a tendência primária com risco controlado e trailing stop.'
    },
    [STRATEGIES.VOLATILITY_TRADING]: {
      id: STRATEGIES.VOLATILITY_TRADING,
      key: 'VOLATILITY_TRADING',
      label: 'Volatility Trading',
      shortLabel: 'Volatilidade',
      subtitle: 'Swing Trade de Volatilidade',
      icon: '⚡',
      color: '#0284c7',
      badgeClass: 'strat-badge-volatility',
      accentVar: '--cyan',
      description: 'Mean reversion, recuperações de curto prazo e expansões/contrações de amplitude na tendência.',
      philosophy: 'Explorar choques e compressões de volatilidade com alvos objetivos.'
    }
  };

  // 3. CANONICAL MODULE AUDIT & CLASSIFICATION REGISTRY (PASSO 9)
  const MODULE_AUDIT_MAP = {
    // 1. Exclusivos de Trend Following (ferramentas de momentum/liderança, contextuais na Volatilidade)
    relativestrength: { id: 'relativestrength', name: 'Força Relativa', classification: 'EXCLUSIVE_TREND', label: 'Exclusivo Trend Following' },
    emergingleaders: { id: 'emergingleaders', name: 'Líderes Emergentes', classification: 'EXCLUSIVE_TREND', label: 'Exclusivo Trend Following' },
    couragechallenge: { id: 'couragechallenge', name: 'Desafio Grade A/A+', classification: 'EXCLUSIVE_TREND', label: 'Exclusivo Trend Following' },

    // 2. Exclusivos de Volatility Trading (ferramentas de mean reversion)
    volatilityengine: { id: 'volatilityengine', name: 'Motor de Volatilidade', classification: 'EXCLUSIVE_VOLATILITY', label: 'Exclusivo Volatility Trading' },
    strategyconfigcenter: { id: 'strategyconfigcenter', name: 'Central de Configurações', classification: 'EXCLUSIVE_VOLATILITY', label: 'Exclusivo Volatility Trading' },

    // 3. Compartilhados com Contexto/Filtro de Estratégia
    watchlist: { id: 'watchlist', name: 'Watchlist Inteligente', classification: 'SHARED_AWARE', label: 'Compartilhado com Filtro de Estratégia' },
    marketscans: { id: 'marketscans', name: 'Scans de Mercado', classification: 'SHARED_AWARE', label: 'Compartilhado com Scans por Estratégia' },
    marketcycle: { id: 'marketcycle', name: 'Ciclo de Mercado', classification: 'SHARED_AWARE', label: 'Compartilhado com Interpretação Dual' },
    charts: { id: 'charts', name: 'Gráfico e Indicadores', classification: 'SHARED_AWARE', label: 'Compartilhado com Indicadores por Estratégia' },
    tradeanatomy: { id: 'tradeanatomy', name: 'Anatomia dos Trades', classification: 'SHARED_AWARE', label: 'Compartilhado com Filtro de Estratégia' },
    journal: { id: 'journal', name: 'Diário do Trader', classification: 'SHARED_AWARE', label: 'Compartilhado com Identificação de Estratégia' },
    newtrade: { id: 'newtrade', name: 'Novo Trade', classification: 'SHARED_AWARE', label: 'Compartilhado com Formulário Dual' },
    tradesimulator: { id: 'tradesimulator', name: 'Simulador de Trades', classification: 'SHARED_AWARE', label: 'Compartilhado com Motores Isolados' },
    systemquality: { id: 'systemquality', name: 'System Quality Number (SQN)', classification: 'SHARED_AWARE', label: 'Compartilhado com R-Isolation' },
    reports: { id: 'reports', name: 'Relatórios e Exportação', classification: 'SHARED_AWARE', label: 'Compartilhado com Filtro de Estratégia' },
    manual: { id: 'manual', name: 'Manual e Treinamento', classification: 'SHARED_AWARE', label: 'Compartilhado com Guias por Estratégia' },
    fundamentals: { id: 'fundamentals', name: 'Fundamentos', classification: 'SHARED_AWARE', label: 'Compartilhado' },
    marketcentral: { id: 'marketcentral', name: 'Central de Mercado', classification: 'SHARED_AWARE', label: 'Compartilhado' },
    markettreemap: { id: 'markettreemap', name: 'Heatmap de Setores', classification: 'SHARED_AWARE', label: 'Compartilhado' },

    // 4. Consolidados de Carteira & Risco (Visão unificada do patrimônio e risco)
    dashboard: { id: 'dashboard', name: 'Visão Geral / Cockpit', classification: 'CONSOLIDATED_PORTFOLIO', label: 'Consolidado da Carteira' },
    wealth: { id: 'wealth', name: 'Patrimônio Líquido', classification: 'CONSOLIDATED_PORTFOLIO', label: 'Consolidado da Carteira' },
    positions: { id: 'positions', name: 'Posições Abertas', classification: 'CONSOLIDATED_PORTFOLIO', label: 'Consolidado com Origem por Trade' },
    closedpositions: { id: 'closedpositions', name: 'Posições Fechadas', classification: 'CONSOLIDATED_PORTFOLIO', label: 'Consolidado com Origem por Trade' },
    portfolioheat: { id: 'portfolioheat', name: 'Portfolio Heat', classification: 'CONSOLIDATED_PORTFOLIO', label: 'Consolidado de Risco Global' },
    riskpolicy: { id: 'riskpolicy', name: 'Política de Risco', classification: 'CONSOLIDATED_PORTFOLIO', label: 'Consolidado com Perfis' },
    assetblacklist: { id: 'assetblacklist', name: 'Blindagem Comportamental', classification: 'CONSOLIDATED_PORTFOLIO', label: 'Consolidado Global' },
    analytics: { id: 'analytics', name: 'Painel da Verdade', classification: 'CONSOLIDATED_PORTFOLIO', label: 'Consolidado com Drill-down Individual' }
  };

  const STORAGE_KEY = 'healthy-trend-active-strategy';
  const DEFAULT_STRATEGY = STRATEGIES.TREND_FOLLOWING;

  // Safe storage helper with memory fallback
  let memoryFallback = DEFAULT_STRATEGY;

  function safeGetStorage() {
    try {
      if (typeof window !== 'undefined' && window.healthyTrendWorkspace?.storage?.getItem) {
        const val = window.healthyTrendWorkspace.storage.getItem(STORAGE_KEY);
        if (val) return val;
      }
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(STORAGE_KEY);
        if (val) return val;
      }
    } catch (_) {}
    return memoryFallback;
  }

  function safeSetStorage(strategyId) {
    memoryFallback = strategyId;
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, strategyId);
      }
      if (typeof window !== 'undefined' && window.healthyTrendWorkspace?.storage?.setItem) {
        window.healthyTrendWorkspace.storage.setItem(STORAGE_KEY, strategyId);
      }
      if (typeof window !== 'undefined' && window.healthyTrendWorkspace?.save) {
        window.healthyTrendWorkspace.save('activeStrategy', strategyId);
      }
    } catch (_) {}
  }

  // 3. CORE STRATEGY WORKSPACE CONTROLLER
  class StrategyWorkspaceModel {
    constructor() {
      this.STRATEGIES = STRATEGIES;
      this.STRATEGY_CONFIGS = STRATEGY_CONFIGS;
      this.STORAGE_KEY = STORAGE_KEY;
      this.DEFAULT_STRATEGY = DEFAULT_STRATEGY;

      this._activeStrategy = this._resolveInitialStrategy();
      this._applyBodyDataset(this._activeStrategy);
    }

    _resolveInitialStrategy() {
      const stored = safeGetStorage();
      if (stored && (stored === STRATEGIES.TREND_FOLLOWING || stored === STRATEGIES.VOLATILITY_TRADING)) {
        return stored;
      }
      return DEFAULT_STRATEGY;
    }

    _applyBodyDataset(strategyId) {
      if (typeof document !== 'undefined' && document.body) {
        document.body.dataset.strategyWorkspace = strategyId;
      }
    }

    /**
     * Retorna a estratégia ativa no momento
     * @returns {'trend_following' | 'volatility_trading'}
     */
    getActiveStrategy() {
      return this._activeStrategy;
    }

    /**
     * Retorna os metadados da estratégia ativa ou de uma específica
     * @param {string} [strategyId]
     */
    getStrategyConfig(strategyId) {
      const id = strategyId || this._activeStrategy;
      return STRATEGY_CONFIGS[id] || STRATEGY_CONFIGS[DEFAULT_STRATEGY];
    }

    /**
     * Retorna a lista de todas as estratégias suportadas
     */
    getAllStrategies() {
      return Object.values(STRATEGY_CONFIGS);
    }

    /**
     * Define o mundo ativo e sincroniza a interface
     * @param {'trend_following' | 'volatility_trading'} strategyId
     * @param {Object} [options]
     * @returns {boolean} true se houve alteração
     */
    setActiveStrategy(strategyId, options = {}) {
      if (strategyId !== STRATEGIES.TREND_FOLLOWING && strategyId !== STRATEGIES.VOLATILITY_TRADING) {
        console.warn(`[StrategyWorkspaceModel] Estratégia inválida: "${strategyId}". Mantendo "${this._activeStrategy}".`);
        return false;
      }

      if (this._activeStrategy === strategyId && !options.force) {
        return false;
      }

      const previous = this._activeStrategy;
      this._activeStrategy = strategyId;
      safeSetStorage(strategyId);
      this._applyBodyDataset(strategyId);

      // Dispara evento global para que qualquer módulo ou seletor se atualize
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        const detail = {
          strategy: strategyId,
          previousStrategy: previous,
          config: this.getStrategyConfig(strategyId)
        };
        window.dispatchEvent(new CustomEvent('healthyTrend:strategyChanged', { detail }));
      }

      return true;
    }

    /**
     * Alterna rapidamente entre as duas estratégias
     */
    toggleStrategy() {
      const target = this._activeStrategy === STRATEGIES.TREND_FOLLOWING
        ? STRATEGIES.VOLATILITY_TRADING
        : STRATEGIES.TREND_FOLLOWING;
      return this.setActiveStrategy(target);
    }

    /**
     * Identifica imutavelmente a qual estratégia um trade pertence.
     * Preserva a integridade: trocar de mundo NUNCA altera o strategyType do trade.
     * @param {Object} trade
     * @returns {'trend_following' | 'volatility_trading'}
     */
    getStrategyForTrade(trade) {
      if (!trade || typeof trade !== 'object') return DEFAULT_STRATEGY;

      const raw = trade.strategyType || trade.strategy_type || trade.strategy ||
                  trade.metadata?.strategyType || trade.metadata?.strategy_type || trade.metadata?.strategy;

      if (raw) {
        const normalized = String(raw).trim().toLowerCase();
        if (normalized === 'volatility_trading' || normalized === 'volatility' || normalized === 'volatility-trading') {
          return STRATEGIES.VOLATILITY_TRADING;
        }
        if (normalized === 'trend_following' || normalized === 'trend' || normalized === 'trend-following') {
          return STRATEGIES.TREND_FOLLOWING;
        }
      }

      // Fallback canônico: trades sem estratégia explícita são Trend Following histórico
      return STRATEGIES.TREND_FOLLOWING;
    }

    /**
     * Filtra lista de trades conforme a estratégia do workspace ou visão consolidada.
     * @param {Array} trades
     * @param {'trend_following' | 'volatility_trading' | 'all'} [strategyFilter]
     * @param {Object} [options]
     * @returns {Array} trades filtrados
     */
    filterTradesByStrategy(trades, strategyFilter, options = {}) {
      if (!Array.isArray(trades)) return [];
      const rawFilter = strategyFilter || (options.consolidated ? 'all' : this._activeStrategy);
      const filter = String(rawFilter).trim().toLowerCase();

      if (filter === 'all' || options.consolidated === true) {
        return trades;
      }

      const target = (filter === 'volatility_trading' || filter === 'volatility' || filter === 'volatility-trading')
        ? STRATEGIES.VOLATILITY_TRADING
        : STRATEGIES.TREND_FOLLOWING;

      return trades.filter((trade) => this.getStrategyForTrade(trade) === target);
    }

    /**
     * Verifica se um módulo do sistema é compartilhado por ambas as estratégias.
     * Módulos como Patrimônio, Posições, Diário, Central de Mercado, etc. são compartilhados.
     * @param {string} moduleId
     * @returns {boolean}
     */
    isSharedModule(moduleId) {
      const shared = new Set([
        'today', 'dashboard', 'positions', 'closedpositions', 'portfolioheat',
        'riskpolicy', 'assetblacklist', 'journal', 'dailyroutine', 'habits',
        'marketcentral', 'fundamentals', 'charts', 'markettreemap', 'eventplaybook',
        'settings', 'manual', 'glossary', 'materials', 'platformaccess', 'mission',
        'tradertraining', 'conquests', 'deservingdiary', 'mistakesbook',
        'tradesimulator', 'researchlab', 'forecast', 'riskofruin', 'analytics', 'systemquality'
      ]);
      return shared.has(moduleId);
    }

    /**
     * Verifica se um módulo específico está disponível na estratégia indicada.
     * Na arquitetura atual, Trend Following mantém 100% dos módulos acessíveis.
     * @param {string} moduleId
     * @param {string} [strategyId]
     * @returns {boolean}
     */
    isModuleAvailable(moduleId, strategyId) {
      const active = strategyId || this._activeStrategy;

      // Trend Following possui acesso pleno a todos os módulos existentes
      if (active === STRATEGIES.TREND_FOLLOWING) {
        return true;
      }

      // No Volatility Trading, módulos compartilhados continuam 100% disponíveis
      if (this.isSharedModule(moduleId)) {
        return true;
      }

      // Módulos que exigem Força Relativa ou rastreio direcional clássico de tendência
      // continuam consultáveis para não quebrar rotas diretas, mas são sinalizados como contexto de tendência
      return true;
    }

    /**
     * Retorna o registro de auditoria e classificação do módulo (PASSO 9).
     * @param {string} moduleId 
     */
    getModuleAudit(moduleId) {
      const id = String(moduleId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return MODULE_AUDIT_MAP[id] || {
        id,
        name: moduleId,
        classification: this.isSharedModule(id) ? 'SHARED_AWARE' : 'EXCLUSIVE_TREND',
        label: this.isSharedModule(id) ? 'Compartilhado' : 'Exclusivo Trend Following'
      };
    }

    /**
     * Retorna a classificação de estratégia do módulo:
     * - 'EXCLUSIVE_TREND'
     * - 'EXCLUSIVE_VOLATILITY'
     * - 'SHARED_AWARE'
     * - 'CONSOLIDATED_PORTFOLIO'
     * @param {string} moduleId 
     */
    getModuleClassification(moduleId) {
      return this.getModuleAudit(moduleId).classification;
    }

    /**
     * Retorna todos os módulos auditados e suas respectivas classificações.
     */
    getAllModuleAudits() {
      return Object.values(MODULE_AUDIT_MAP);
    }
  }

  // Instância singleton exposta
  const instance = new StrategyWorkspaceModel();
  instance.MODULE_AUDIT_MAP = MODULE_AUDIT_MAP;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = instance;
    module.exports.StrategyWorkspaceModel = StrategyWorkspaceModel;
    module.exports.STRATEGIES = STRATEGIES;
    module.exports.STRATEGY_CONFIGS = STRATEGY_CONFIGS;
    module.exports.MODULE_AUDIT_MAP = MODULE_AUDIT_MAP;
  }

  root.StrategyWorkspaceModel = instance;

})(typeof window !== 'undefined' ? window : globalThis);

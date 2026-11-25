/**
 * HEALTHY TREND TRADER — CAPITAL INTELLIGENCE MODEL
 * O Mapa Vivo do Seu Dinheiro — Direção Artística & Arquitetura Estrutural
 *
 * Hierarquia Estrutural Obrigatória:
 * 7 Esferas Principais (Dimensões Estruturais e Cíclicas):
 *   1. cycle_br           — Ciclo de Mercado — Brasil
 *   2. cycle_us           — Ciclo de Mercado — Estados Unidos
 *   3. breadth_us         — Market Breadth — Estados Unidos (independente e claramente identificada)
 *   4. gold_commodities   — Ouro / Proteção e Commodities
 *   5. sector_rotation_us — Rotação Setorial — Estados Unidos
 *   6. macro_events       — Eventos Macroeconômicos
 *   7. my_portfolio       — Meu Patrimônio
 *
 * 4 Satélites de Tendência Histórica (Janela Relevante — 21 Pregões):
 *   - trend_dolar         — Dólar (USD/BRL)
 *   - trend_di            — Curva DI / Selic
 *   - trend_us10y         — Treasury 10Y (EUA)
 *   - trend_vix           — VIX (Volatilidade)
 *
 * Invariantes:
 * - Zero números fictícios da imagem de referência reaproveitados como dados reais.
 * - Separação rigorosa entre Contas Correntes e Equity de Investimentos.
 * - Variações de 1 único pregão isoladas na faixa secundária do rodapé.
 * - Tipologia rigorosa de conexões: 'economic' | 'correlation' | 'allocation'.
 * - Sugestão de alocação estritamente não vinculante (apoio à decisão).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.CapitalIntelligenceModel = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // 1. LENTES E UNIVERSOS ESTRUTURAIS
  const UNIVERSES = {
    cycles: {
      id: 'cycles',
      label: 'Ciclos',
      color: '#10b981',
      glowColor: 'rgba(16, 185, 129, 0.42)',
      description: 'Regimes estruturais e permissão operacional dos mercados Brasil e Estados Unidos.'
    },
    breadth: {
      id: 'breadth',
      label: 'Market Breadth',
      color: '#a855f7',
      glowColor: 'rgba(168, 85, 247, 0.42)',
      description: 'Amplitude e participação interna do mercado norte-americano em esfera independente.'
    },
    macro: {
      id: 'macro',
      label: 'Cenário Macroeconômico',
      color: '#d4af37',
      glowColor: 'rgba(212, 175, 55, 0.44)',
      description: 'Juros, inflação, câmbio, política monetária, atividade econômica e indicadores macroeconômicos.'
    },
    rotation: {
      id: 'rotation',
      label: 'Rotação Setorial',
      color: '#38bdf8',
      glowColor: 'rgba(56, 189, 248, 0.42)',
      description: 'Rotação de força relativa entre setores defensivos, cíclicos, energia e tecnologia/IA nos EUA contra o S&P 500 (SPY).'
    },
    portfolio: {
      id: 'portfolio',
      label: 'Patrimônio',
      color: '#e5c158',
      glowColor: 'rgba(229, 193, 88, 0.48)',
      description: 'Posicionamento real da Equity de Investimentos (excluindo contas correntes) e Portfolio Heat.'
    }
  };

  // Alias de compatibilidade para filtros regionais
  const LENS_ALIASES = {
    brasil: 'cycles',
    us: 'cycles'
  };

  // 2. ESFERAS PRINCIPAIS (7 DIMENSÕES ESTRUTURAIS) + 4 SATÉLITES DE TENDÊNCIA (21 PREGÕES)
  // Coordenadas normalizadas em um palco virtual 1000 x 640 para escala fluida em qualquer resolução.
  const DEFAULT_NODES = [
    // --- 7 ESFERAS PRINCIPAIS ---
    {
      id: 'cycle_br',
      tier: 'primary',
      universe: 'cycles',
      region: 'BR',
      badge: 'BRASIL',
      label: 'Ciclo de Mercado',
      shortLabel: 'Ciclo Brasil',
      subtitle: 'Brasil · Regime Estrutural',
      windowLabel: 'Tendência 21 pregões',
      displayValue: 'Aguardando ciclo',
      metricCaption: 'Regime IBOV / B3',
      trendDirection: 'neutral', // 'up' | 'down' | 'neutral'
      state: 'neutral', // 'expansion' | 'caution' | 'defense' | 'neutral'
      stateLabel: 'Sincronizar Ciclo B3',
      color: '#10b981',
      accentColor: '#34d399',
      radius: 56,
      nx: 0.20,
      ny: 0.60,
      dataStatus: 'awaiting_feed', // 'live' | 'awaiting_feed'
      source: 'Ciclo de Mercado (B3 COTAHIST)',
      sourceRoute: 'marketcycle',
      description: 'Lê o regime estrutural do mercado brasileiro (tendência e volatilidade) para definir a permissão operacional em ações B3.',
      details: {
        window: '21 pregões (tendência estrutural)',
        permission: 'Conectado ao motor oficial de Ciclo de Mercado',
        focus: 'Proteção de capital em baixa; seletividade em transição; expansão em alta confirmada'
      }
    },
    {
      id: 'cycle_us',
      tier: 'primary',
      universe: 'cycles',
      region: 'US',
      badge: 'EUA',
      label: 'Ciclo de Mercado',
      shortLabel: 'Ciclo EUA',
      subtitle: 'Estados Unidos · S&P 500 / NDX',
      windowLabel: 'Tendência 21 pregões',
      displayValue: 'Aguardando ciclo',
      metricCaption: 'Regime Wall Street',
      trendDirection: 'neutral',
      state: 'neutral',
      stateLabel: 'Sincronizar Ciclo EUA',
      color: '#3b82f6',
      accentColor: '#60a5fa',
      radius: 58,
      nx: 0.30,
      ny: 0.24,
      dataStatus: 'awaiting_feed',
      source: 'Central de Mercado (Benchmarks Globais)',
      sourceRoute: 'marketcentral',
      description: 'Direção estrutural do principal motor de liquidez acionária global (S&P 500 e Nasdaq-100) em janelas de médio prazo.',
      details: {
        window: '21 pregões (tendência estrutural)',
        benchmarks: 'S&P 500 · Nasdaq-100 · Dow Jones',
        focus: 'Vetor central de apetite a risco para BDRs, ações americanas e fluxo estrangeiro'
      }
    },
    {
      id: 'breadth_us',
      tier: 'primary',
      universe: 'breadth',
      region: 'US',
      badge: 'MARKET BREADTH (EUA)',
      label: 'Market Breadth',
      shortLabel: 'Market Breadth (EUA)',
      subtitle: 'Estados Unidos · Participação Interna',
      windowLabel: 'Saúde estrutural do rali',
      displayValue: '—',
      metricCaption: 'Participação EUA',
      breadthPct: null, // Null até conexão com feed real — NUNCA usar número fictício da imagem
      breadth200Pct: null,
      trendDirection: 'neutral',
      state: 'neutral',
      stateLabel: 'Esfera Independente',
      color: '#a855f7',
      accentColor: '#c084fc',
      radius: 60,
      nx: 0.56,
      ny: 0.21,
      visualWidget: 'breadth_ring',
      dataStatus: 'awaiting_feed',
      source: 'Motor de Amplitude (EUA)',
      sourceRoute: 'marketcentral',
      description: 'Dimensão independente que mede a saúde interna do mercado norte-americano (avanços/quedas, novas máximas vs. mínimas e % acima das médias), distinguindo ralis amplos de mercados estreitos.',
      details: {
        window: 'Amplitude estrutural (21d / 52 semanas)',
        metrics: 'A/D Line · Novas Máximas vs. Mínimas (52s) · % acima MM50',
        focus: 'Alerta precoce de divergências antes mesmo da virada dos índices de topo'
      }
    },
    {
      id: 'gold_commodities',
      tier: 'primary',
      universe: 'macro',
      region: 'GLOBAL',
      badge: 'OURO / PROTEÇÃO',
      label: 'Ouro & Ativos de Proteção',
      shortLabel: 'Ouro / Proteção',
      subtitle: 'Hedge Real · Tendência 21p · Força Relativa',
      windowLabel: 'Tendência 21 pregões (destaque)',
      displayValue: 'Aguardando feed',
      metricCaption: 'Ouro · Janela 21p',
      trendDirection: 'neutral',
      state: 'neutral',
      stateLabel: 'Termômetro de Hedge',
      color: '#d4af37',
      accentColor: '#f3d58d',
      radius: 52,
      nx: 0.50,
      ny: 0.49,
      dataStatus: 'awaiting_feed',
      source: 'Benchmarks Globais (Ouro / Commodities)',
      sourceRoute: 'marketcentral',
      description: 'Monitora a migração de capital para reserva de valor, proteção inflacionária e commodities reais em janelas estruturais.',
      details: {
        window: '21 pregões (destaque primário) · 1d secundário',
        assets: 'Ouro Spot (XAU) · Petróleo WTI · Cesta Commodities',
        focus: 'Força persistente no ouro sinaliza busca institucional por proteção e diversificação'
      }
    },
    {
      id: 'sector_rotation_us',
      tier: 'primary',
      universe: 'rotation',
      region: 'US',
      badge: 'ROTAÇÃO EUA',
      label: 'Rotação Setorial',
      shortLabel: 'Rotação Setorial EUA',
      subtitle: 'Estados Unidos · Força Relativa vs. SPY',
      windowLabel: 'Força Relativa 21p & 63p',
      displayValue: 'Aguardando feed',
      metricCaption: 'Desempenho relativo vs. SPY',
      trendDirection: 'neutral',
      state: 'neutral',
      stateLabel: 'Força Relativa EUA',
      color: '#0ea5e9',
      accentColor: '#38bdf8',
      radius: 50,
      nx: 0.77,
      ny: 0.34,
      visualWidget: 'sector_bars',
      sectors: [], // Preenchido apenas por dados reais; nunca com percentuais da imagem
      dataStatus: 'awaiting_feed',
      source: 'ETFs Setoriais EUA (SPDR / SMH vs. SPY)',
      sourceRoute: 'markettreemap',
      description: 'Compara a força relativa de desempenho de preço dos 12 ETFs setoriais americanos (Tecnologia/IA, Semicondutores, Energia, Saúde, Financeiro, Consumo e demais) contra o S&P 500 (SPY) em janelas de 21 e 63 pregões — sem confundir desempenho relativo com fluxo líquido de fundos.',
      details: {
        window: '21 pregões (primária) e 63 pregões (contexto)',
        benchmarks: 'Comparação direta contra S&P 500 (SPY)',
        buckets: 'Tecnologia/IA & Semis · Energia & Materiais · Financeiro · Saúde · Consumo',
        focus: 'Identifica setores ganhando força, neutros ou perdendo força relativa ao longo do tempo (nunca por 1 único pregão)'
      }
    },
    {
      id: 'macro_events',
      tier: 'primary',
      universe: 'macro',
      region: 'GLOBAL',
      badge: 'EVENTOS MACRO',
      label: 'Eventos Macro',
      shortLabel: 'Eventos Macroeconômicos',
      subtitle: 'Copom · FOMC · Payroll · Inflação',
      windowLabel: 'Calendário de catalisadores',
      displayValue: 'Agenda ativa',
      metricCaption: 'Próximos gatilhos',
      trendDirection: 'neutral',
      state: 'caution',
      stateLabel: 'Catalisadores',
      color: '#f59e0b',
      accentColor: '#fbbf24',
      radius: 48,
      nx: 0.78,
      ny: 0.65,
      dataStatus: 'awaiting_feed',
      source: 'Registro de Eventos & Calendário Macro',
      sourceRoute: 'eventplaybook',
      description: 'Concentra decisões de política monetária e dados de atividade/inflação capazes de reprecificar curvas de juros e alterar o regime de mercado.',
      details: {
        window: 'Próximos eventos de alto impacto',
        catalysts: 'COPOM (BR) · Decisão FOMC (EUA) · Payroll · IPCA / CPI',
        focus: 'Evitar abertura de risco excessivo imediatamente antes de binários macroeconômicos'
      }
    },
    {
      id: 'my_portfolio',
      tier: 'primary',
      universe: 'portfolio',
      region: 'USER',
      badge: 'MEU PATRIMÔNIO',
      label: 'Meu Patrimônio',
      shortLabel: 'Meu Patrimônio',
      subtitle: 'Equity de Investimentos & Heat',
      windowLabel: 'Posição consolidada',
      displayValue: 'Sincronizar Equity',
      metricCaption: 'Exclui contas correntes',
      equityValue: null,
      heatPct: null,
      heatLimitPct: 5.0,
      trendDirection: 'neutral',
      state: 'expansion',
      stateLabel: 'Gestão de Capital',
      color: '#e5c158',
      accentColor: '#fde68a',
      radius: 62,
      nx: 0.48,
      ny: 0.78,
      visualWidget: 'portfolio_ring',
      dataStatus: 'awaiting_feed',
      source: 'Atualização Diária & Patrimônio (Conta Investimentos)',
      sourceRoute: 'dailyupdate',
      description: 'Centro decisório do seu capital: consolida a Equity de Investimentos (excluindo contas correntes do dia a dia), exposição aberta, reserva de caixa e Portfolio Heat.',
      details: {
        accountingRule: 'Contas correntes (ex: Bradesco) não compõem a Equity da estratégia',
        riskControl: 'Portfolio Heat controlado dentro do limite da Política de Risco',
        focus: 'Alinhar o peso de cada classe ao ciclo estrutural sem operar no escuro'
      }
    },

    // --- 4 SATÉLITES DE TENDÊNCIA HISTÓRICA (JANELA 21 PREGÕES — NÃO COTAÇÃO DIÁRIA) ---
    {
      id: 'trend_dolar',
      tier: 'trend_satellite',
      universe: 'macro',
      region: 'BR',
      badge: 'TENDÊNCIA 21P',
      label: 'Dólar (BRL)',
      shortLabel: 'Dólar · 21p',
      subtitle: 'USD/BRL · Tendência 21 pregões',
      windowLabel: 'Janela 21 pregões',
      displayValue: '—',
      metricCaption: 'Tendência 21p',
      trendDirection: 'neutral',
      state: 'neutral',
      stateLabel: '21 pregões',
      color: '#10b981',
      accentColor: '#6ee7b7',
      radius: 30,
      nx: 0.14,
      ny: 0.37,
      sparkline: [],
      dataStatus: 'awaiting_feed',
      source: 'Tendência Histórica Cambial (21p)',
      sourceRoute: 'marketcentral',
      description: 'Leitura estrutural da trajetória do Dólar contra o Real em 21 pregões — sem ruído de oscilações intradiárias.',
      details: {
        window: '21 pregões (tendência cambial)',
        impact: 'Pressiona inflação local, juros futuros e amplifica retornos em BDRs/USD'
      }
    },
    {
      id: 'trend_di',
      tier: 'trend_satellite',
      universe: 'macro',
      region: 'BR',
      badge: 'TENDÊNCIA 21P',
      label: 'Curva DI (BR)',
      shortLabel: 'Curva DI Futuro · 21p',
      subtitle: 'Juros Futuros DI · 21 pregões (distinto da Selic)',
      windowLabel: 'Janela 21 pregões (p.p. / bps)',
      displayValue: '—',
      metricCaption: 'Curva DI vs. Selic',
      trendDirection: 'neutral',
      state: 'neutral',
      stateLabel: '21 pregões',
      color: '#f59e0b',
      accentColor: '#fcd34d',
      radius: 30,
      nx: 0.25,
      ny: 0.83,
      sparkline: [],
      dataStatus: 'awaiting_feed',
      source: 'Curva DI Futuro (B3 / ANBIMA ETTJ) + Contexto Selic BCB',
      sourceRoute: 'marketcentral',
      description: 'Acompanha a evolução histórica da Curva DI negociada em 21 pregões (p.p. e pontos-base), mantida rigorosamente separada da Taxa Selic Meta (decisão vigente do COPOM).',
      details: {
        window: '21 pregões (deslocamento em p.p. e bps)',
        impact: 'Distingue expectativa de juros negociada em mercado (DI) da taxa básica vigente de política monetária (Selic Meta)'
      }
    },
    {
      id: 'trend_us10y',
      tier: 'trend_satellite',
      universe: 'macro',
      region: 'US',
      badge: 'TENDÊNCIA 21P',
      label: 'Treasury 10Y',
      shortLabel: 'US10Y · 21p',
      subtitle: 'Juros 10 Anos EUA · 21 pregões',
      windowLabel: 'Janela 21 pregões',
      displayValue: '—',
      metricCaption: 'Tendência 21p',
      trendDirection: 'neutral',
      state: 'neutral',
      stateLabel: '21 pregões',
      color: '#3b82f6',
      accentColor: '#93c5fd',
      radius: 30,
      nx: 0.67,
      ny: 0.52,
      sparkline: [],
      dataStatus: 'awaiting_feed',
      source: 'US Treasury Yield 10Y (21p)',
      sourceRoute: 'marketcentral',
      description: 'Taxa livre de risco global observada em janela de 21 pregões — principal balizador de valuation de tecnologia e liquidez mundial.',
      details: {
        window: '21 pregões (deslocamento em p.p.)',
        impact: 'Alta persistente dos Treasuries drena liquidez de ativos long-duration e emergentes'
      }
    },
    {
      id: 'trend_vix',
      tier: 'trend_satellite',
      universe: 'breadth',
      region: 'US',
      badge: 'TENDÊNCIA 21P',
      label: 'VIX (Risco)',
      shortLabel: 'VIX · 21p',
      subtitle: 'Volatilidade Implícita · 21 pregões',
      windowLabel: 'Janela 21 pregões',
      displayValue: '—',
      metricCaption: 'Regime 21p',
      trendDirection: 'neutral',
      state: 'neutral',
      stateLabel: '21 pregões',
      color: '#a855f7',
      accentColor: '#d8b4fe',
      radius: 30,
      nx: 0.43,
      ny: 0.13,
      sparkline: [],
      dataStatus: 'awaiting_feed',
      source: 'CBOE VIX — Tendência 21 pregões',
      sourceRoute: 'marketcentral',
      description: 'Regime de volatilidade implícita do S&P 500 avaliado por sua tendência em 21 pregões, distinguindo estresse estrutural de ruído pontual.',
      details: {
        window: '21 pregões (tendência de volatilidade)',
        impact: 'Expansão sustentada do VIX acompanha deterioração da amplitude e exige postura seletiva'
      }
    }
  ];

  // 3. CONEXÕES ESTRUTURAIS RIGOROSAMENTE TIPADAS ('economic' | 'correlation' | 'allocation')
  const DEFAULT_CONNECTIONS = [
    {
      id: 'conn_cycle_us_breadth_us',
      source: 'cycle_us',
      target: 'breadth_us',
      type: 'correlation',
      strength: 5,
      direction: 'bidirectional',
      label: 'Saúde Interna do Ciclo EUA',
      explanation: 'O Ciclo de Mercado dos EUA e o Market Breadth são dimensões complementares e independentes: índices podem parecer estáveis enquanto a amplitude interna deteriora, antecipando reversões.',
      supportingData: 'Comparação estrutural entre direção dos índices (S&P 500 / NDX) e participação interna (A/D e % acima das médias).',
      timeframe: 'Janela estrutural de 21 pregões e 52 semanas.'
    },
    {
      id: 'conn_breadth_sector_us',
      source: 'breadth_us',
      target: 'sector_rotation_us',
      type: 'correlation',
      strength: 4,
      direction: 'source_to_target',
      label: 'Concentração vs. Rotação Setorial',
      explanation: 'Quedas na amplitude do mercado americano costumam coincidir com rotação de desempenho relativo saindo de tecnologia/crescimento para setores defensivos ou ativos reais.',
      supportingData: 'Leitura cruzada de participação interna e força relativa setorial contra o SPY nos últimos 21 pregões.',
      timeframe: 'Janela móvel de 21 pregões.'
    },
    {
      id: 'conn_cycle_us_sector_us',
      source: 'cycle_us',
      target: 'sector_rotation_us',
      type: 'economic',
      strength: 4,
      direction: 'source_to_target',
      label: 'Liderança Relativa em Wall Street',
      explanation: 'Cada fase do ciclo norte-americano favorece grupos setoriais específicos; acompanhar quais setores ganham ou perdem força relativa ajuda a focar nos líderes sem confundir desempenho com fluxo de fundos.',
      supportingData: 'Força relativa de preço (21p e 63p) entre setores ofensivos (Tech/IA, Semis), cíclicos (Financeiro) e defensivos/reais (Energia, Saúde).',
      timeframe: 'Janelas de 21 e 63 pregões.'
    },
    {
      id: 'conn_cycle_us_gold',
      source: 'cycle_us',
      target: 'gold_commodities',
      type: 'correlation',
      strength: 4,
      direction: 'bidirectional',
      label: 'Apetite a Risco vs. Proteção Real',
      explanation: 'Quando o ciclo acionário entra em lateralização ou aversão a risco, o capital institucional migra para o Ouro e reservas de valor como hedge estrutural.',
      supportingData: 'Divergência de força relativa entre ações americanas e Ouro em 21 pregões.',
      timeframe: 'Janela de 21 pregões.'
    },
    {
      id: 'conn_macro_gold',
      source: 'macro_events',
      target: 'gold_commodities',
      type: 'economic',
      strength: 4,
      direction: 'source_to_target',
      label: 'Incerteza Monetária & Hedge',
      explanation: 'Decisões de juros (FOMC/Copom) e surpresas inflacionárias alteram a taxa de juros real esperada, principal motor do Ouro e das commodities.',
      supportingData: 'Sensibilidade histórica de ativos reais a ciclos de inflação e política monetária.',
      timeframe: 'Ciclo de decisões de política monetária.'
    },
    {
      id: 'conn_macro_cycle_br',
      source: 'macro_events',
      target: 'cycle_br',
      type: 'economic',
      strength: 4,
      direction: 'source_to_target',
      label: 'Catalisadores no Ciclo Brasil',
      explanation: 'Decisões de juros (Copom) e dados de inflação/PIB redefinem a taxa de desconto e a propensão ao risco em ações brasileiras.',
      supportingData: 'Sensibilidade do Ibovespa a ciclos de política monetária e dados de atividade.',
      timeframe: 'Ciclos Copom / Divulgações oficiais.'
    },
    {
      id: 'conn_macro_cycle_us',
      source: 'macro_events',
      target: 'cycle_us',
      type: 'economic',
      strength: 5,
      direction: 'source_to_target',
      label: 'Catalisadores no Ciclo EUA',
      explanation: 'Reuniões do FOMC, CPI e Payroll reprecificam o custo do capital mundial e impactam os múltiplos de Wall Street.',
      supportingData: 'Volatilidade estrutural no S&P 500 associada aos eventos institucionais norte-americanos.',
      timeframe: 'Ciclo FOMC / Divulgações mensais.'
    },
    {
      id: 'conn_macro_us10y',
      source: 'macro_events',
      target: 'trend_us10y',
      type: 'economic',
      strength: 5,
      direction: 'source_to_target',
      label: 'Precificação da Curva Americana',
      explanation: 'Payroll, CPI e comunicação do FOMC reprecificam diretamente o rendimento do Treasury de 10 anos ao longo das semanas seguintes.',
      supportingData: 'Deslocamento estrutural da taxa US10Y em janela de 21 pregões.',
      timeframe: 'Ciclo FOMC / 21 pregões.'
    },
    {
      id: 'conn_us10y_cycle_us',
      source: 'trend_us10y',
      target: 'cycle_us',
      type: 'economic',
      strength: 5,
      direction: 'source_to_target',
      label: 'Taxa Livre de Risco Global',
      explanation: 'O Treasury de 10 anos dita a taxa de desconto do valuation global. Tendências de alta nos juros pressionam múltiplos acionários e tecnologia.',
      supportingData: 'Relação estrutural entre tendência de 21 pregões do US10Y e apetite a risco no S&P 500.',
      timeframe: 'Janela de 21 pregões.'
    },
    {
      id: 'conn_us10y_sector_us',
      source: 'trend_us10y',
      target: 'sector_rotation_us',
      type: 'economic',
      strength: 4,
      direction: 'source_to_target',
      label: 'Pressão sobre Duration Setorial',
      explanation: 'Juros longos em alta comprimem setores de alta duration (Tecnologia/IA) e beneficiam setores geradores de caixa imediato ou ligados a commodities.',
      supportingData: 'Sensibilidade setorial à tendência de 21 pregões do Treasury 10Y.',
      timeframe: 'Janela de 21 pregões.'
    },
    {
      id: 'conn_vix_cycle_us',
      source: 'trend_vix',
      target: 'cycle_us',
      type: 'correlation',
      strength: 4,
      direction: 'bidirectional',
      label: 'Regime de Volatilidade Implícita',
      explanation: 'A tendência de 21 pregões do VIX distingue picos passageiros de uma mudança estrutural para regime volátil e defensivo.',
      supportingData: 'Correlação inversa persistente entre tendência do VIX e estabilidade do S&P 500.',
      timeframe: 'Janela de 21 pregões.'
    },
    {
      id: 'conn_vix_breadth_us',
      source: 'trend_vix',
      target: 'breadth_us',
      type: 'correlation',
      strength: 4,
      direction: 'bidirectional',
      label: 'Estresse vs. Participação Interna',
      explanation: 'Aumento sustentado da volatilidade implícita acompanha contração da amplitude do mercado e elevação de novas mínimas de 52 semanas.',
      supportingData: 'Co-movimento entre expansão do VIX e deterioração do Market Breadth EUA.',
      timeframe: 'Janela de 21 pregões.'
    },
    {
      id: 'conn_dolar_cycle_br',
      source: 'trend_dolar',
      target: 'cycle_br',
      type: 'economic',
      strength: 5,
      direction: 'bidirectional',
      label: 'Fluxo Estrangeiro & Câmbio BR',
      explanation: 'Tendência de alta no Dólar reflete saída de fluxo ou percepção de risco fiscal/externo, pressionando o ciclo estrutural da B3.',
      supportingData: 'Trajetória de 21 pregões do USD/BRL frente ao regime do Ibovespa.',
      timeframe: 'Janela de 21 pregões.'
    },
    {
      id: 'conn_di_cycle_br',
      source: 'trend_di',
      target: 'cycle_br',
      type: 'economic',
      strength: 5,
      direction: 'source_to_target',
      label: 'Gravidade dos Juros Locais',
      explanation: 'A abertura na curva DI eleva o custo de oportunidade da renda fixa isenta de risco acionário e atua como gravidade sobre o Ciclo de Mercado no Brasil.',
      supportingData: 'Impacto do deslocamento da curva DI (21 pregões) na atratividade da bolsa brasileira.',
      timeframe: 'Janela de 21 pregões.'
    },
    {
      id: 'conn_macro_di',
      source: 'macro_events',
      target: 'trend_di',
      type: 'economic',
      strength: 4,
      direction: 'source_to_target',
      label: 'Decisões do Copom & Inflação',
      explanation: 'Comunicados do Copom, ata e leituras de IPCA determinam a trajetória dos vértices de juros futuros brasileiros.',
      supportingData: 'Agenda de política monetária brasileira integrada ao Registro de Eventos.',
      timeframe: 'Ciclo de reuniões do Copom.'
    },
    {
      id: 'conn_dolar_gold',
      source: 'trend_dolar',
      target: 'gold_commodities',
      type: 'correlation',
      strength: 3,
      direction: 'bidirectional',
      label: 'Hedge Cambial & Proteção',
      explanation: 'Para o investidor em Reais, a combinação de Dólar firme e Ouro em tendência positiva potencializa a função protetiva da carteira.',
      supportingData: 'Confluência cambial e real em cenários de estresse local ou global.',
      timeframe: 'Janela de 21 pregões.'
    },
    {
      id: 'conn_portfolio_cycle_br',
      source: 'my_portfolio',
      target: 'cycle_br',
      type: 'allocation',
      strength: 5,
      direction: 'source_to_target',
      label: 'Exposição ao Mercado Brasileiro',
      explanation: 'Liga diretamente sua Equity alocada em ações e futuros B3 à permissão do Ciclo de Mercado Brasil, calibrando o risco admissível.',
      supportingData: 'Exposição B3 hidratada da Atualização Diária (separada de contas correntes).',
      timeframe: 'Monitoramento contínuo da carteira.'
    },
    {
      id: 'conn_portfolio_cycle_us',
      source: 'my_portfolio',
      target: 'cycle_us',
      type: 'allocation',
      strength: 5,
      direction: 'source_to_target',
      label: 'Exposição Internacional & BDRs',
      explanation: 'Conecta sua parcela em moeda forte (BDRs e contas internacionais) à tendência estrutural dos Estados Unidos.',
      supportingData: 'Exposição internacional hidratada de BDRs abertos e saldo em USD.',
      timeframe: 'Monitoramento contínuo da carteira.'
    },
    {
      id: 'conn_portfolio_gold',
      source: 'my_portfolio',
      target: 'gold_commodities',
      type: 'allocation',
      strength: 4,
      direction: 'source_to_target',
      label: 'Colchão de Proteção & Reserva',
      explanation: 'Representa o equilíbrio entre busca de tendência e preservação de capital via caixa, renda fixa e ativos de proteção real.',
      supportingData: 'Reserva de liquidez e diversificação descorrelacionada sobre a Equity.',
      timeframe: 'Revisão estratégica por ciclo.'
    },
    {
      id: 'conn_portfolio_di',
      source: 'my_portfolio',
      target: 'trend_di',
      type: 'allocation',
      strength: 4,
      direction: 'bidirectional',
      label: 'Carrego do Caixa & Renda Fixa',
      explanation: 'O capital mantido em caixa livre fora de risco acionário remunera atrelado à curva de juros local enquanto aguarda setups de alta qualidade.',
      supportingData: 'Caixa disponível na Equity de Investimentos (contas correntes excluídas).',
      timeframe: 'Posição patrimonial atual.'
    }
  ];

  // Eventos estruturais de referência do calendário (sem datas/resultados inventados quando não hidratado)
  const DEFAULT_UPCOMING_EVENTS = [
    {
      id: 'ev_copom',
      region: 'BR',
      flag: '🇧🇷',
      title: 'Decisão COPOM (BR)',
      dateLabel: 'Agenda BCB',
      impact: 'high',
      targetNodeId: 'macro_events'
    },
    {
      id: 'ev_payroll',
      region: 'US',
      flag: '🇺🇸',
      title: 'Payroll / Emprego (EUA)',
      dateLabel: 'Agenda BLS',
      impact: 'high',
      targetNodeId: 'macro_events'
    },
    {
      id: 'ev_fomc',
      region: 'US',
      flag: '🇺🇸',
      title: 'Decisão de Juros — FOMC',
      dateLabel: 'Agenda Fed',
      impact: 'high',
      targetNodeId: 'macro_events'
    }
  ];

  // Faixa secundária do rodapé — somente variações de 1 pregão (hidratadas de dados reais)
  const DEFAULT_DAILY_TAPE = [
    { symbol: 'IBOV', label: 'IBOV', market: 'BR', flag: '🇧🇷', calendar: 'B3 (São Paulo)', displayValue: '—', changePct: null, asOfDate: null, updatedAt: null, dataStatus: 'awaiting_feed' },
    { symbol: 'SPX', label: 'S&P 500', market: 'US', flag: '🇺🇸', calendar: 'NYSE (New York)', displayValue: '—', changePct: null, asOfDate: null, updatedAt: null, dataStatus: 'awaiting_feed' },
    { symbol: 'NDX', label: 'Nasdaq', market: 'US', flag: '🇺🇸', calendar: 'NASDAQ (New York)', displayValue: '—', changePct: null, asOfDate: null, updatedAt: null, dataStatus: 'awaiting_feed' },
    { symbol: 'USD', label: 'Dólar', market: 'BR', flag: '🇧🇷', calendar: 'Banco Central (BRL)', displayValue: '—', changePct: null, asOfDate: null, updatedAt: null, dataStatus: 'awaiting_feed' },
    { symbol: 'GOLD', label: 'Ouro', market: 'US', flag: '🇺🇸', calendar: 'NYSE Arca (USD)', displayValue: '—', changePct: null, asOfDate: null, updatedAt: null, dataStatus: 'awaiting_feed' },
    { symbol: 'VIX', label: 'VIX', market: 'US', flag: '🇺🇸', calendar: 'CBOE (New York)', displayValue: '—', changePct: null, asOfDate: null, updatedAt: null, dataStatus: 'awaiting_feed' }
  ];

  function formatBRL(value) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(Number(value));
  }

  function formatSignedPct(value, suffix = '%') {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return '—';
    const num = Number(value);
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(2).replace('.', ',')}${suffix}`;
  }

  class CapitalIntelligenceModel {
    constructor(options = {}) {
      this.nodes = options.nodes
        ? JSON.parse(JSON.stringify(options.nodes))
        : JSON.parse(JSON.stringify(DEFAULT_NODES));
      this.connections = options.connections
        ? JSON.parse(JSON.stringify(options.connections))
        : JSON.parse(JSON.stringify(DEFAULT_CONNECTIONS));
      this.universes = Object.assign({}, UNIVERSES);
      this.selectedUniverse = options.selectedUniverse || 'all';
      this.selectedScenario = options.selectedScenario || 'global';
      this.selectedNodeId = options.selectedNodeId || null;
      this.selectedConnectionId = options.selectedConnectionId || null;
      this.upcomingEvents = JSON.parse(JSON.stringify(DEFAULT_UPCOMING_EVENTS));
      this.dailyTape = JSON.parse(JSON.stringify(DEFAULT_DAILY_TAPE));
      this.portfolioSnapshot = {
        isLive: false,
        equity: null,
        cashValue: null,
        localExposureValue: null,
        globalExposureValue: null,
        heatPct: null,
        heatLimitPct: 5.0,
        openPositionsCount: 0
      };
      this.lastUpdated = null;
      this.dataConfidence = 'structural'; // 'live' | 'partial' | 'structural'
      this.pipelineStatus = 'indisponivel'; // 'atualizado' | 'atrasado' | 'indisponivel' | 'parcial'
      this.freshnessSummary = null;
      this.macroTrendsDetail = null;
      this.allocationSuggestion = null;
    }

    /**
     * Hidrata o modelo diretamente do snapshot canônico servido por GET /api/capital-intelligence/snapshot.
     * Preserva integralmente os estados de frescor ('atualizado' | 'atrasado' | 'indisponivel' | 'parcial'),
     * data de referência (asOfDate) e defasagem em pregões — nunca apresenta dado antigo como atual.
     */
    hydrateFromPipelineSnapshot(snapshot) {
      if (!snapshot || typeof snapshot !== 'object') return this;

      this.pipelineStatus = snapshot.overallStatus || 'parcial';
      this.freshnessSummary = snapshot.freshnessSummary || null;
      this.lastUpdated = snapshot.generatedAt || new Date().toISOString();
      this.dataConfidence = snapshot.overallStatus === 'atualizado'
        ? 'live'
        : snapshot.overallStatus === 'indisponivel'
          ? 'structural'
          : 'partial';

      const applyFreshnessMeta = (node, status, asOfDate, lagBusinessDays, collectedAt, source) => {
        if (!node) return;
        node.freshnessStatus = status || 'indisponivel';
        node.asOfDate = asOfDate || null;
        node.lagBusinessDays = Number.isFinite(lagBusinessDays) ? lagBusinessDays : null;
        node.collectedAt = collectedAt || null;
        if (source) node.source = source;
        node.dataStatus = (status === 'atualizado' || status === 'atrasado' || status === 'parcial') ? 'live' : 'awaiting_feed';
      };

      const spheres = snapshot.spheres || {};

      // 1. Ciclo Brasil (Esfera Oficial — reuso estrito de market-regime.js)
      if (spheres.cycle_br) {
        const br = this.getNodeById('cycle_br');
        const cbr = spheres.cycle_br;
        if (br) {
          br.brazilCycleDetail = {
            hasOfficialRegime: Boolean(cbr.hasOfficialRegime),
            regimeCode: cbr.regimeCode || null,
            regimeLabel: cbr.regimeLabel || null,
            regimeName: cbr.regimeName || null,
            regimeColor: cbr.regimeColor || null,
            direction: cbr.direction || null,
            volatility: cbr.volatility || null,
            diagnosis: cbr.diagnosis || null,
            currentPeriod: cbr.currentPeriod || null,
            recentTimeline21d: Array.isArray(cbr.recentTimeline21d) ? cbr.recentTimeline21d : [],
            recentTransitions: Array.isArray(cbr.recentTransitions) ? cbr.recentTransitions : [],
            supportingIndicators: cbr.supportingIndicators || null,
            benchmarkSummary: Array.isArray(cbr.benchmarkSummary) ? cbr.benchmarkSummary : [],
            relatedFactors: cbr.relatedFactors || null,
            provenance: cbr.provenance || null
          };

          if (cbr.hasOfficialRegime && cbr.regimeLabel) {
            br.displayValue = cbr.regimeLabel;
            br.regimeColor = cbr.regimeColor || br.color;
            const dur = cbr.currentPeriod?.durationTradingDays;
            const ret21 = cbr.supportingIndicators?.return21dPct;
            const parts = [];
            if (Number.isFinite(dur) && dur > 0) parts.push(`${dur}p no regime`);
            if (Number.isFinite(ret21)) parts.push(`21p: ${formatSignedPct(ret21)}`);
            br.metricCaption = parts.length ? parts.join(' · ') : 'Ciclo Oficial IBOV';
            br.state = cbr.direction === 'UP' ? 'expansion' : cbr.direction === 'DOWN' ? 'defense' : 'caution';
            br.stateLabel = cbr.status === 'atrasado'
              ? `Atrasado (${cbr.lagBusinessDays || 1}p)`
              : cbr.regimeLabel;
            if (cbr.diagnosis?.permissionGuidance) {
              br.details.permission = cbr.diagnosis.permissionGuidance;
            }
          } else {
            // Regra estrita: nunca inventar classificação quando motor oficial não fornecer resultado
            br.displayValue = 'Indisponível';
            br.regimeColor = null;
            br.metricCaption = 'Aguardando classificação oficial';
            br.state = 'neutral';
            br.stateLabel = 'Sem regime oficial';
          }

          applyFreshnessMeta(
            br,
            cbr.status,
            cbr.asOfDate,
            cbr.lagBusinessDays,
            cbr.collectedAt,
            cbr.provenance?.provider || cbr.source
          );
        }
      }

      // 2. Ciclo EUA (Esfera Independente — S&P 500/SPY + Nasdaq/QQQ + RSP complementar)
      if (spheres.cycle_us) {
        const us = this.getNodeById('cycle_us');
        const cus = spheres.cycle_us;
        if (us) {
          us.usCycleDetail = {
            hasOfficialRegime: Boolean(cus.hasOfficialRegime),
            regimeCode: cus.regimeCode || null,
            regimeLabel: cus.regimeLabel || null,
            regimeName: cus.regimeName || null,
            regimeColor: cus.regimeColor || null,
            direction: cus.direction || null,
            volatility: cus.volatility || null,
            diagnosis: cus.diagnosis || null,
            spyVsQqqAlignment: cus.spyVsQqqAlignment || null,
            equalWeightContext: cus.equalWeightContext || null,
            currentPeriod: cus.currentPeriod || null,
            recentTimeline21d: Array.isArray(cus.recentTimeline21d) ? cus.recentTimeline21d : [],
            recentTransitions: Array.isArray(cus.recentTransitions) ? cus.recentTransitions : [],
            supportingIndicators: cus.supportingIndicators || null,
            benchmarkSummary: Array.isArray(cus.benchmarkSummary) ? cus.benchmarkSummary : [],
            relatedContext: cus.relatedContext || null,
            methodology: cus.methodology || null,
            provenance: cus.provenance || null
          };

          if (cus.hasOfficialRegime && cus.regimeLabel) {
            us.displayValue = cus.regimeLabel;
            us.regimeColor = cus.regimeColor || us.color;
            const dur = cus.currentPeriod?.durationTradingDays;
            const ret21 = cus.supportingIndicators?.return21dPct;
            const parts = [];
            if (Number.isFinite(dur) && dur > 0) parts.push(`${dur}p no regime`);
            if (Number.isFinite(ret21)) parts.push(`21p: ${formatSignedPct(ret21)}`);
            us.metricCaption = parts.length ? parts.join(' · ') : 'Ciclo Oficial SPY';
            us.state = cus.direction === 'UP' ? 'expansion' : cus.direction === 'DOWN' ? 'defense' : 'caution';
            us.stateLabel = cus.status === 'atrasado'
              ? `Atrasado (${cus.lagBusinessDays || 1}p)`
              : cus.regimeLabel;
            if (cus.diagnosis?.confluencyNote) {
              us.details.benchmarks = cus.diagnosis.confluencyNote;
            }
          } else {
            us.displayValue = 'Indisponível';
            us.regimeColor = null;
            us.metricCaption = 'Aguardando classificação EUA';
            us.state = 'neutral';
            us.stateLabel = 'Sem regime oficial';
          }

          applyFreshnessMeta(
            us,
            cus.status,
            cus.asOfDate,
            cus.lagBusinessDays,
            cus.collectedAt,
            cus.provenance?.provider || cus.source
          );
        }
      }

      // 3. Market Breadth EUA (Esfera Independente Protagonista — multi-fator, S&P 500 + Nasdaq-100)
      if (spheres.breadth_us) {
        const breadth = this.getNodeById('breadth_us');
        const bu = spheres.breadth_us;
        if (breadth) {
          breadth.usBreadthDetail = {
            status: bu.status || 'indisponivel',
            primaryUniverseId: bu.primaryUniverseId || null,
            primaryUniverseName: bu.primaryUniverseName || null,
            coverageLabel: bu.coverageLabel || null,
            latest: bu.latest || null,
            evolution21d: bu.evolution21d || null,
            condition: bu.condition || null,
            divergence: bu.divergence || null,
            universes: bu.universes || null,
            history21d: Array.isArray(bu.history21d) ? bu.history21d : [],
            history63d: Array.isArray(bu.history63d) ? bu.history63d : [],
            methodology: bu.methodology || null,
            limitations: Array.isArray(bu.limitations) ? bu.limitations : [],
            provenance: bu.provenance || null
          };

          applyFreshnessMeta(breadth, bu.status, bu.asOfDate, bu.lagBusinessDays, bu.collectedAt, bu.source);

          if (bu.status === 'indisponivel' || !bu.condition?.code) {
            breadth.breadthPct = null;
            breadth.breadth200Pct = null;
            breadth.displayValue = 'Indisponível';
            breadth.metricCaption = 'Aguardando componentes EUA';
            breadth.state = 'neutral';
            breadth.hasDivergence = false;
          } else {
            const p50 = bu.latest?.aboveSma50Pct;
            const p200 = bu.latest?.aboveSma200Pct;
            breadth.breadthPct = Number.isFinite(p50) ? p50 : null;
            breadth.breadth200Pct = Number.isFinite(p200) ? p200 : null;
            breadth.displayValue = `Amplitude ${bu.condition.label}`;
            const divState = bu.divergence?.state || '';
            breadth.hasDivergence = divState === 'bearish_divergence' || divState === 'bullish_divergence';
            breadth.divergenceState = divState;

            const capParts = [];
            if (bu.primaryUniverseName) capParts.push(bu.primaryUniverseName);
            if (Number.isFinite(p50)) capParts.push(`MM50: ${Math.round(p50)}%`);
            if (Number.isFinite(p200)) capParts.push(`MM200: ${Math.round(p200)}%`);
            breadth.metricCaption = capParts.join(' · ') || 'Participação EUA';
            breadth.state = bu.condition.code === 'strong' ? 'expansion' : bu.condition.code === 'weak' ? 'defense' : 'caution';
            breadth.stateLabel = bu.status === 'atrasado'
              ? `Atrasado (${bu.lagBusinessDays || 1}p)`
              : bu.condition.label;
          }
        }
      }

      // 4. Ouro & Ativos de Proteção (09)
      if (spheres.gold_commodities) {
        const gNode = this.getNodeById('gold_commodities');
        const gc = spheres.gold_commodities;
        if (gNode) {
          gNode.goldProtectionDetail = gc;
          applyFreshnessMeta(gNode, gc.status || 'indisponivel', gc.asOfDate, gc.lagBusinessDays, gc.collectedAt, gc.source);

          if (gc.status === 'indisponivel' || !gc.primaryPrice?.currentPrice) {
            gNode.displayValue = 'Aguardando feed';
            gNode.metricCaption = 'Ouro · Janela 21p';
            gNode.state = 'neutral';
            gNode.stateLabel = 'Indisponível';
            gNode.trendDirection = 'neutral';
          } else {
            // Destaque primário: Tendência histórica de 21 pregões; Variação diária secundária
            gNode.displayValue = gc.displayValue || (Number.isFinite(gc.historicalTrends?.change21dPct)
              ? formatSignedPct(gc.historicalTrends.change21dPct, ' (21p)')
              : `$${gc.primaryPrice.currentPrice.toFixed(2)}`);
            gNode.metricCaption = gc.metricCaption || (Number.isFinite(gc.historicalTrends?.change1dPct)
              ? `Hoje: ${formatSignedPct(gc.historicalTrends.change1dPct)}`
              : 'Ouro · Janela 21p');
            gNode.state = gc.state || 'neutral';
            gNode.stateLabel = gc.stateLabel || 'Proteção / Hedge';
            gNode.trendDirection = gc.historicalTrends?.trendDirection || 'neutral';
          }
        }
      }

      // 5. Rotação Setorial e Força Relativa EUA (07)
      if (spheres.sector_rotation_us) {
        const sNode = this.getNodeById('sector_rotation_us');
        const sr = spheres.sector_rotation_us;
        const list = Array.isArray(sr.sectors) ? sr.sectors : [];
        if (sNode) {
          sNode.sectors = list;
          sNode.usSectorRotationDetail = {
            metricNature: sr.metricNature || 'price_performance',
            isCapitalFlowData: false,
            disclaimerNote: sr.disclaimerNote || '',
            status: sr.status || 'indisponivel',
            asOfDate: sr.asOfDate || null,
            expectedDate: sr.expectedDate || null,
            lagBusinessDays: sr.lagBusinessDays ?? null,
            collectedAt: sr.collectedAt || null,
            source: sr.source || 'unconfigured',
            benchmark: sr.benchmark || null,
            rotationProfile: sr.rotationProfile || null,
            summaryCounts: sr.summaryCounts || { totalCataloged: 12, covered: 0, classified21d: 0, strengthening: 0, neutral: 0, weakening: 0 },
            leader: sr.leader || null,
            laggard: sr.laggard || null,
            groups: sr.groups || { strengthening: [], neutral: [], weakening: [] },
            clusterComparison: Array.isArray(sr.clusterComparison) ? sr.clusterComparison : [],
            sectors: list,
            missingSectors: Array.isArray(sr.missingSectors) ? sr.missingSectors : [],
            colorLegend: Array.isArray(sr.colorLegend) ? sr.colorLegend : [],
            methodology: sr.methodology || null,
            limitations: Array.isArray(sr.limitations) ? sr.limitations : [],
            provenance: sr.provenance || null
          };

          applyFreshnessMeta(sNode, sr.status, sr.asOfDate, sr.lagBusinessDays, sr.collectedAt, sr.source);

          if (sr.status === 'indisponivel' || list.length === 0) {
            sNode.displayValue = 'Indisponível';
            sNode.metricCaption = 'Aguardando ETFs EUA (21p)';
            sNode.state = 'neutral';
            sNode.stateLabel = 'Indisponível';
          } else {
            const leader = sr.leader || list[0];
            const counts = sr.summaryCounts || { strengthening: 0, weakening: 0 };
            const leaderDelta = Number.isFinite(leader?.excessReturnVsSpy21dPct)
              ? formatSignedPct(leader.excessReturnVsSpy21dPct, ' p.p.')
              : (Number.isFinite(leader?.return21dPct) ? formatSignedPct(leader.return21dPct) : '');
            sNode.displayValue = leader ? `${leader.sector}${leaderDelta ? ` ${leaderDelta}` : ''}` : 'Rotação Ativa';
            sNode.metricCaption = `${counts.strengthening} ↑ · ${counts.weakening} ↓ vs SPY (21p)`;
            sNode.state = counts.strengthening > counts.weakening
              ? 'expansion'
              : counts.weakening > counts.strengthening
                ? 'defense'
                : 'caution';
            sNode.stateLabel = sr.rotationProfile?.label || 'Força Relativa 21p';
          }
        }
      }

      // 6. Eventos Macroeconômicos e Catalisadores (10)
      if (spheres.macro_events) {
        const me = spheres.macro_events;
        const mNode = this.getNodeById('macro_events');
        const upcomingList = Array.isArray(me.upcomingEvents) ? me.upcomingEvents : [];
        const allList = Array.isArray(me.allEvents) ? me.allEvents : upcomingList;

        this.upcomingEvents = upcomingList.slice(0, 6).map(ev => ({
          id: ev.id,
          region: ev.country || 'GLOBAL',
          country: ev.country || 'GLOBAL',
          countryLabel: ev.countryLabel || (ev.country === 'BR' ? 'Brasil' : (ev.country === 'US' ? 'Estados Unidos' : 'Global')),
          flag: ev.flag || '🌐',
          title: ev.shortTitle || ev.title,
          fullTitle: ev.title,
          category: ev.category || 'monetary_policy',
          categoryLabel: ev.categoryLabel || 'Macro',
          date: ev.date,
          dateLabel: ev.dateLabel || (ev.date ? `${ev.date.slice(8, 10)}/${ev.date.slice(5, 7)}` : '—'),
          dateFormatted: ev.dateFormatted || ev.date,
          time: ev.time,
          timezone: ev.timezone,
          timezoneLabel: ev.timezoneLabel || (ev.timeLocal || 'BRT'),
          impact: ev.impact || 'high',
          impactLabel: ev.impactLabel || (ev.impact === 'high' ? 'ALTO IMPACTO' : 'MÉDIO IMPACTO'),
          dynamicStatus: ev.dynamicStatus || 'upcoming',
          statusLabel: ev.statusLabel || 'Próximo',
          numbers: ev.numbers || null,
          affectedSpheres: Array.isArray(ev.affectedSpheres) ? ev.affectedSpheres : [],
          transmissionChannel: ev.transmissionChannel || '',
          behavioralGuardrail: ev.behavioralGuardrail || '',
          source: ev.source || 'Fontes Oficiais',
          hasHistoricalPlaybook: Boolean(ev.hasHistoricalPlaybook),
          playbookId: ev.playbookId || null,
          targetNodeId: 'macro_events'
        }));

        if (mNode) {
          mNode.macroEventsDetail = {
            ...me,
            upcomingEvents: upcomingList,
            allEvents: allList,
            counts: me.counts || { upcoming: upcomingList.length, highImpact: 0 }
          };
          mNode.upcomingEvents = upcomingList;
          mNode.allEvents = allList;
          mNode.counts = mNode.macroEventsDetail.counts;
          mNode.nextEvent = me.nextEvent || upcomingList[0] || null;

          mNode.displayValue = me.displayValue || (upcomingList.length > 0 ? `${upcomingList.length} eventos` : 'Agenda livre');
          mNode.metricCaption = me.metricCaption || (mNode.nextEvent ? `${mNode.nextEvent.shortTitle || mNode.nextEvent.title} (${mNode.nextEvent.dateLabel || ''})` : 'Sem catalisadores');
          mNode.state = me.state || (mNode.counts.highImpact > 0 ? 'caution' : 'neutral');
          mNode.stateLabel = me.stateLabel || 'Catalisadores';

          applyFreshnessMeta(mNode, me.status, me.asOfDate, 0, me.collectedAt, me.source);
        }
      }

      // 7. Meu Patrimônio (do backend isolado por tenant, se presente)
      if (spheres.my_portfolio) {
        const mp = spheres.my_portfolio;
        const equity = Number(mp.operationalEquity ?? mp.equity ?? 0);
        if (mp.isLive || equity > 0) {
          this.portfolioSnapshot = {
            isLive: true,
            equity,
            operationalEquity: equity,
            realWealth: Number(mp.realWealth ?? equity),
            checkingWealth: Number(mp.checkingWealth ?? 0),
            cashValue: Number(mp.cashValue ?? 0),
            localExposureValue: Number(mp.localExposureValue ?? mp.exposureByRegion?.brazil?.amount ?? 0),
            globalExposureValue: Number(mp.globalExposureValue ?? mp.exposureByRegion?.global?.amount ?? 0),
            heatPct: Number(mp.heatPct ?? 0),
            heatLimitPct: Number(mp.heatLimitPct ?? 5),
            openPositionsCount: Number(mp.openPositionsCount ?? 0)
          };
          this.portfolioDetail = mp;
          const pNode = this.getNodeById('my_portfolio');
          if (pNode) {
            pNode.equityValue = equity;
            pNode.portfolioDetail = mp;
            pNode.heatPct = mp.heatPct;
            pNode.heatLimitPct = mp.heatLimitPct;
            pNode.displayValue = formatBRL(equity);
            pNode.metricCaption = `Heat ${Number(mp.heatPct || 0).toFixed(2).replace('.', ',')}% / ${Number(mp.heatLimitPct || 5).toFixed(1).replace('.', ',')}%`;
            pNode.stateLabel = `${mp.openPositionsCount || 0} ${mp.openPositionsCount === 1 ? 'posição aberta' : 'posições abertas'}`;
            applyFreshnessMeta(pNode, mp.status || 'atualizado', mp.asOfDate, 0, mp.collectedAt || mp.snapshotTimestamp, mp.source);
          }
        }
      }

      // 8. 4 Satélites de Tendência Histórica (21 pregões) + Contexto Política Monetária Selic (08)
      this.macroTrendsDetail = snapshot.macroTrends || null;
      const satMap = snapshot.trendSatellites21d || {};
      const macroBySat = snapshot.macroTrends?.bySatelliteId || {};
      const selicPolicy = snapshot.macroTrends?.policyContext?.selic || null;

      ['trend_dolar', 'trend_di', 'trend_us10y', 'trend_vix'].forEach(satId => {
        const m = satMap[satId];
        const detail = macroBySat[satId] || m?.macroTrend || null;
        const node = this.getNodeById(satId);
        if (!node) return;

        if (detail) {
          node.macroTrendDetail = detail;
          node.monetaryPolicyContext = satId === 'trend_di' ? selicPolicy : null;
          applyFreshnessMeta(node, detail.status, detail.asOfDate, detail.lagBusinessDays, detail.collectedAt, detail.source);

          if (detail.status === 'indisponivel') {
            node.displayValue = satId === 'trend_di' ? 'DI Indisp.' : 'Indisponível';
            node.metricCaption = (satId === 'trend_di' && selicPolicy && selicPolicy.status !== 'indisponivel')
              ? `Selic: ${selicPolicy.currentValueFormatted}`
              : 'Sem série 21p';
            node.trendDirection = 'neutral';
            node.state = 'neutral';
            node.stateLabel = 'Indisponível';
            node.sparkline = [];
          } else {
            // Valor principal no satélite = tendência histórica de 21 pregões na unidade nativa; nível atual é complementar!
            node.displayValue = detail.hasFull21dWindow
              ? detail.primaryDelta21dFormatted
              : detail.currentValueFormatted;
            node.metricCaption = `${detail.currentValueFormatted} · 21p`;
            node.trendDirection = detail.trend?.code === 'rising' ? 'up' : detail.trend?.code === 'falling' ? 'down' : 'neutral';
            node.state = detail.trend?.code === 'rising'
              ? 'caution'
              : detail.trend?.code === 'falling'
                ? 'expansion'
                : 'neutral';
            node.stateLabel = detail.status === 'atrasado'
              ? `Atrasado (${detail.lagBusinessDays || 1}p)`
              : (detail.trend?.shortLabel || '21 pregões');
            if (Array.isArray(detail.sparkline21d)) node.sparkline = detail.sparkline21d.slice();
          }
          return;
        }

        if (!m) return;
        applyFreshnessMeta(node, m.status, m.freshness?.asOfDate, m.freshness?.lagBusinessDays, m.freshness?.collectedAt, m.provider);
        if (m.status !== 'indisponivel' && Number.isFinite(m.latestValue)) {
          const isRate = m.metricNature === 'macro_rate' && String(m.unit || '').includes('%');
          if (isRate) {
            node.displayValue = Number.isFinite(m.delta21dPp)
              ? `${Math.round(m.delta21dPp * 100) > 0 ? '+' : ''}${Math.round(m.delta21dPp * 100)} bps`
              : `${m.latestValue.toFixed(2).replace('.', ',')}%`;
            node.metricCaption = `${m.latestValue.toFixed(2).replace('.', ',')}% a.a. · 21p`;
          } else {
            node.displayValue = Number.isFinite(m.change21dPct)
              ? formatSignedPct(m.change21dPct)
              : m.latestValue.toFixed(2).replace('.', ',');
            node.metricCaption = `${m.latestValue.toFixed(2).replace('.', ',')} · 21p`;
          }
          if (Array.isArray(m.sparkline21d)) node.sparkline = m.sparkline21d.slice();
        }
      });

      // 9. Faixa Secundária Diária (Rodapé — 1 pregão)
      if (Array.isArray(snapshot.dailyTapeSecondary) && snapshot.dailyTapeSecondary.length) {
        this.dailyTape = snapshot.dailyTapeSecondary.map(item => ({
          symbol: item.symbol,
          label: item.label,
          market: item.market || (['IBOV', 'USD'].includes(item.symbol) ? 'BR' : 'US'),
          flag: item.flag || (['IBOV', 'USD'].includes(item.symbol) ? '🇧🇷' : '🇺🇸'),
          calendar: item.calendar || (['IBOV', 'USD'].includes(item.symbol) ? 'B3 (São Paulo)' : 'NYSE / NASDAQ (New York)'),
          displayValue: Number.isFinite(item.closeValue)
            ? Number(item.closeValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : '—',
          changePct: Number.isFinite(item.change1dPct) ? Number(item.change1dPct) : null,
          asOfDate: item.asOfDate || null,
          updatedAt: item.updatedAt || snapshot.generatedAt || null,
          timezone: item.timezone || (item.market === 'US' ? 'America/New_York' : 'America/Sao_Paulo'),
          dataStatus: item.status === 'indisponivel' ? 'awaiting_feed' : 'live',
          freshnessStatus: item.status
        }));
      }

      // 10. Sugestão de Alocação por Evidências de 21 Pregões (Backend Engine)
      if (snapshot.allocationSuggestion && typeof snapshot.allocationSuggestion === 'object') {
        this.allocationSuggestion = snapshot.allocationSuggestion;
      }

      return this;
    }

    /**
     * Hidrata exclusivamente com dados reais disponíveis nos módulos e APIs oficiais do sistema.
     * Nenhum dado fictício da imagem de referência é injetado.
     */
    hydrateFromSystemState(systemState = {}) {
      const g = (typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
      const dailyModel = systemState.dailyUpdateModel || g?.DailyUpdateHub?.model || null;
      const marketCentralData = systemState.marketCentralData || null;
      const marketCycleData = systemState.marketCycleData || null;

      let liveCount = 0;

      // 1. PATRIMÔNIO REAL (excluindo contas correntes)
      if (dailyModel) {
        const investmentWealth = typeof dailyModel.getInvestmentWealth === 'function'
          ? dailyModel.getInvestmentWealth()
          : null;
        const availableCash = typeof dailyModel.getAvailableCash === 'function'
          ? dailyModel.getAvailableCash()
          : null;
        const heat = typeof dailyModel.getPortfolioHeat === 'function'
          ? dailyModel.getPortfolioHeat()
          : null;
        const heatLimit = typeof dailyModel.getHeatLimit === 'function'
          ? dailyModel.getHeatLimit()
          : 5.0;

        let volBr = 0;
        let volGlobal = 0;
        let openCount = 0;

        if (Array.isArray(dailyModel.positions)) {
          dailyModel.positions.forEach(pos => {
            if (pos.closed || pos.status === 'encerrada') return;
            openCount += 1;
            const vol = typeof dailyModel.getPositionFinancialVolume === 'function'
              ? dailyModel.getPositionFinancialVolume(pos)
              : (Number(pos.quantity || 0) * Number(pos.currentPrice || 0));
            const marketCat = typeof dailyModel.classifyPositionMarket === 'function'
              ? dailyModel.classifyPositionMarket(pos)
              : (pos.assetClass || 'STOCK');

            if (marketCat === 'BDR' || pos.currency === 'USD') {
              volGlobal += Number(vol || 0);
            } else {
              volBr += Number(vol || 0);
            }
          });
        }

        if (Array.isArray(dailyModel.accounts)) {
          const nomadAcc = dailyModel.accounts.find(a =>
            (a.id === 'nomad_daniel' || a.currency === 'USD') &&
            a.type !== 'checking' && a.accountType !== 'checking'
          );
          if (nomadAcc) {
            volGlobal += Number(nomadAcc.newBalance || nomadAcc.balance || 0);
          }
        }

        if (Number.isFinite(investmentWealth) && investmentWealth > 0) {
          liveCount += 1;
          const formatter = dailyModel.constructor?.formatBRL || formatBRL;
          this.portfolioSnapshot = {
            isLive: true,
            equity: investmentWealth,
            cashValue: Number.isFinite(availableCash) ? availableCash : Math.max(0, investmentWealth - volBr - volGlobal),
            localExposureValue: volBr,
            globalExposureValue: volGlobal,
            heatPct: Number.isFinite(heat) ? heat : 0,
            heatLimitPct: heatLimit,
            openPositionsCount: openCount
          };

          const pNode = this.getNodeById('my_portfolio');
          if (pNode) {
            pNode.equityValue = investmentWealth;
            pNode.heatPct = this.portfolioSnapshot.heatPct;
            pNode.heatLimitPct = heatLimit;
            pNode.displayValue = formatter(investmentWealth);
            pNode.metricCaption = `Heat ${this.portfolioSnapshot.heatPct.toFixed(2).replace('.', ',')}% / ${heatLimit.toFixed(1).replace('.', ',')}%`;
            pNode.stateLabel = `${openCount} ${openCount === 1 ? 'posição aberta' : 'posições abertas'}`;
            pNode.dataStatus = 'live';
            pNode.state = this.portfolioSnapshot.heatPct > heatLimit * 0.8 ? 'caution' : 'expansion';

            const realWealth = typeof dailyModel.getConsolidatedRealWealth === 'function'
              ? dailyModel.getConsolidatedRealWealth()
              : (investmentWealth + (typeof dailyModel.getCheckingWealth === 'function' ? dailyModel.getCheckingWealth() : 0));
            const checkingWealth = typeof dailyModel.getCheckingWealth === 'function'
              ? dailyModel.getCheckingWealth()
              : Math.max(0, realWealth - investmentWealth);
            const totalExp = volBr + volGlobal;
            const cVal = Number.isFinite(availableCash) ? availableCash : Math.max(0, investmentWealth - totalExp);

            pNode.portfolioDetail = {
              id: 'my_portfolio',
              isLive: true,
              realWealth,
              operationalEquity: investmentWealth,
              checkingWealth,
              totalExposure: totalExp,
              cashValue: cVal,
              cashPercentage: investmentWealth > 0 ? Number(((cVal / investmentWealth) * 100).toFixed(2)) : 0,
              openPositionsCount: openCount,
              heatPct: this.portfolioSnapshot.heatPct,
              heatLimitPct: heatLimit,
              asOfDate: new Date().toISOString().slice(0, 10),
              snapshotTimestamp: new Date().toISOString(),
              reconciledAt: new Date().toISOString(),
              source: 'Atualização Diária (Workspace Local Reconciliado)',
              exposureByRegion: {
                brazil: { label: 'Brasil (B3)', amount: volBr, percentage: (totalExp > 0 ? Number(((volBr / totalExp) * 100).toFixed(2)) : 100) },
                global: { label: 'Internacional / EUA (BDRs & Dólar)', amount: volGlobal, percentage: (totalExp > 0 ? Number(((volGlobal / totalExp) * 100).toFixed(2)) : 0) }
              },
              exposureByCurrency: {
                brl: { label: 'Real Brasileiro (BRL)', amount: volBr + cVal, percentage: Number((((volBr + cVal) / (investmentWealth || 1)) * 100).toFixed(2)) },
                usd: { label: 'Dólar Americano & BDRs (USD)', amount: volGlobal, percentage: Number(((volGlobal / (investmentWealth || 1)) * 100).toFixed(2)), isForeignCurrencyHedge: volGlobal > 0 }
              },
              concentration: {
                level: openCount <= 2 ? 'Moderada' : 'Baixa',
                diagnostic: 'Risco pulverizado conforme plano operacional da Atualização Diária.'
              },
              liquidity: {
                cashAmount: cVal,
                cashPercentage: investmentWealth > 0 ? Number(((cVal / investmentWealth) * 100).toFixed(2)) : 0,
                status: cVal > 0 ? 'Adequada' : 'Alocação Máxima'
              },
              principles: [
                'Segregação Estrita: Contas correntes permanecem 100% fora da Equity da estratégia.',
                'Prevenção de Dupla Contagem: O saldo nas corretoras já engloba o valor de custódia das posições. NUNCA somar posições ao Patrimônio Real.',
                'Classificação Setorial Fidedigna: Sem invenções. Ativos sem mapeamento confiável são categorizados como "Outros / A Classificar".',
                'Carteira e Decisões Intactas: Atualizações de mercado podem recalcular o valor de mercado das posições na fotografia, mas NUNCA alteram quantidades, ordens ou planos do usuário.'
              ]
            };
          }
        }
      }

      // 2. CICLO DE MERCADO — BRASIL (Market Cycle ou Market Central)
      const regimeObj = marketCycleData?.regime || marketCentralData?.regime || null;
      if (regimeObj) {
        liveCount += 1;
        const brNode = this.getNodeById('cycle_br');
        if (brNode) {
          const label = regimeObj.label || regimeObj.name || regimeObj.regime || 'Regime Ativo';
          const lower = String(label).toLowerCase();
          brNode.displayValue = label;
          brNode.stateLabel = regimeObj.permission || regimeObj.status || label;
          brNode.dataStatus = 'live';
          if (lower.includes('down') || lower.includes('baixa') || lower.includes('defesa')) {
            brNode.state = 'defense';
            brNode.trendDirection = 'down';
          } else if (lower.includes('up') || lower.includes('alta') || lower.includes('expans')) {
            brNode.state = 'expansion';
            brNode.trendDirection = 'up';
          } else {
            brNode.state = 'caution';
            brNode.trendDirection = 'neutral';
          }
          if (regimeObj.summary || regimeObj.description) {
            brNode.details.permission = regimeObj.summary || regimeObj.description;
          }
        }
      }

      // 3. MERCADOS GLOBAIS E BENCHMARKS (Central de Mercado)
      if (marketCentralData && Array.isArray(marketCentralData.globalBenchmarks)) {
        const bySymbol = new Map();
        marketCentralData.globalBenchmarks.forEach(item => {
          if (item && item.symbol) bySymbol.set(String(item.symbol).toUpperCase(), item);
        });

        const spx = bySymbol.get('SPX');
        const ndx = bySymbol.get('NDX');
        const vix = bySymbol.get('VIX');
        const dxy = bySymbol.get('DXY');
        const usd = bySymbol.get('USDBRL') || bySymbol.get('USD') || bySymbol.get('DOL');
        const gold = bySymbol.get('GOLD') || bySymbol.get('XAU') || bySymbol.get('OURO');
        const us10y = bySymbol.get('US10Y');

        if (spx) {
          liveCount += 1;
          const usNode = this.getNodeById('cycle_us');
          if (usNode) {
            const ret1m = spx.returns && Number.isFinite(Number(spx.returns['1m'])) ? Number(spx.returns['1m']) : null;
            usNode.displayValue = ret1m !== null
              ? (ret1m > 1 ? 'Tendência de Alta' : ret1m < -1 ? 'Pressão / Baixa' : 'Lateral / Seletivo')
              : (spx.trend === 'up' ? 'Alta Estrutural' : spx.trend === 'down' ? 'Pressão Estrutural' : 'Lateral');
            usNode.metricCaption = ret1m !== null ? `S&P 500 (21p): ${formatSignedPct(ret1m)}` : 'S&P 500 / Nasdaq';
            usNode.trendDirection = ret1m !== null ? (ret1m > 0.3 ? 'up' : ret1m < -0.3 ? 'down' : 'neutral') : (spx.trend || 'neutral');
            usNode.state = usNode.trendDirection === 'up' ? 'expansion' : usNode.trendDirection === 'down' ? 'defense' : 'caution';
            usNode.stateLabel = usNode.displayValue;
            usNode.dataStatus = 'live';
            if (ndx && ndx.returns && Number.isFinite(Number(ndx.returns['1m']))) {
              usNode.details.benchmarks = `S&P 500 (21p): ${formatSignedPct(ret1m)} · Nasdaq (21p): ${formatSignedPct(ndx.returns['1m'])}`;
            }
          }
        }

        if (gold) {
          liveCount += 1;
          const goldNode = this.getNodeById('gold_commodities');
          if (goldNode) {
            const ret1m = gold.returns && Number.isFinite(Number(gold.returns['1m'])) ? Number(gold.returns['1m']) : null;
            goldNode.displayValue = ret1m !== null ? formatSignedPct(ret1m) : (gold.value || 'Ativo');
            goldNode.metricCaption = 'Ouro · Janela 21p';
            goldNode.trendDirection = ret1m !== null ? (ret1m > 0.3 ? 'up' : ret1m < -0.3 ? 'down' : 'neutral') : (gold.trend || 'neutral');
            goldNode.state = goldNode.trendDirection === 'up' ? 'expansion' : goldNode.trendDirection === 'down' ? 'defense' : 'neutral';
            goldNode.stateLabel = goldNode.trendDirection === 'up' ? 'Força em Proteção' : 'Estável';
            goldNode.dataStatus = 'live';
          }
        }

        if (vix) {
          liveCount += 1;
          const vixNode = this.getNodeById('trend_vix');
          if (vixNode) {
            const ret1m = vix.returns && Number.isFinite(Number(vix.returns['1m'])) ? Number(vix.returns['1m']) : null;
            vixNode.displayValue = ret1m !== null ? formatSignedPct(ret1m) : (vix.value || '—');
            vixNode.metricCaption = vix.value ? `Nível ${vix.value} · 21p` : 'Tendência 21p';
            vixNode.sparkline = Array.isArray(vix.sparkline) ? vix.sparkline.slice() : [];
            vixNode.trendDirection = ret1m !== null ? (ret1m > 2 ? 'up' : ret1m < -2 ? 'down' : 'neutral') : 'neutral';
            vixNode.state = (Number(vix.numericValue) >= 20 || (ret1m !== null && ret1m > 10)) ? 'defense' : 'expansion';
            vixNode.dataStatus = 'live';
          }
        }

        if (usd || dxy) {
          liveCount += 1;
          const fx = usd || dxy;
          const fxNode = this.getNodeById('trend_dolar');
          if (fxNode) {
            const ret1m = fx.returns && Number.isFinite(Number(fx.returns['1m'])) ? Number(fx.returns['1m']) : null;
            fxNode.displayValue = ret1m !== null ? formatSignedPct(ret1m) : (fx.value || '—');
            fxNode.metricCaption = usd ? 'USD/BRL · 21p' : 'DXY · 21p';
            fxNode.sparkline = Array.isArray(fx.sparkline) ? fx.sparkline.slice() : [];
            fxNode.trendDirection = ret1m !== null ? (ret1m > 0.3 ? 'up' : ret1m < -0.3 ? 'down' : 'neutral') : 'neutral';
            fxNode.state = fxNode.trendDirection === 'up' ? 'caution' : 'neutral';
            fxNode.dataStatus = 'live';
          }
        }

        if (us10y) {
          liveCount += 1;
          const tNode = this.getNodeById('trend_us10y');
          if (tNode) {
            const ret1m = us10y.returns && Number.isFinite(Number(us10y.returns['1m'])) ? Number(us10y.returns['1m']) : null;
            tNode.displayValue = us10y.value ? `${us10y.value}` : (ret1m !== null ? formatSignedPct(ret1m) : '—');
            tNode.metricCaption = ret1m !== null ? `21p: ${formatSignedPct(ret1m)}` : 'Tendência 21p';
            tNode.sparkline = Array.isArray(us10y.sparkline) ? us10y.sparkline.slice() : [];
            tNode.trendDirection = ret1m !== null ? (ret1m > 0 ? 'up' : ret1m < 0 ? 'down' : 'neutral') : 'neutral';
            tNode.dataStatus = 'live';
          }
        }

        // Atualiza exclusivamente a faixa secundária de pregão diário (rodapé)
        this.dailyTape = this.dailyTape.map(entry => {
          const match = bySymbol.get(entry.symbol) ||
            (entry.symbol === 'USD' ? (usd || dxy) : null) ||
            (entry.symbol === 'GOLD' ? gold : null);
          if (!match) return entry;
          return {
            symbol: entry.symbol,
            label: entry.label,
            displayValue: match.value || '—',
            changePct: Number.isFinite(Number(match.changePct)) ? Number(match.changePct) : null,
            dataStatus: 'live'
          };
        });
      }

      // 4. EVENTOS MACROECONÔMICOS REAIS (se presentes na Central de Mercado)
      if (marketCentralData && Array.isArray(marketCentralData.events) && marketCentralData.events.length > 0) {
        liveCount += 1;
        this.upcomingEvents = marketCentralData.events.slice(0, 4).map(ev => ({
          id: ev.id || ev.title,
          region: ev.region || (String(ev.country || '').toUpperCase().includes('BR') ? 'BR' : 'US'),
          flag: String(ev.country || ev.region || '').toUpperCase().includes('BR') ? '🇧🇷' : '🇺🇸',
          title: ev.title || ev.name || 'Evento Macro',
          dateLabel: ev.dateLabel || ev.date || 'Em breve',
          impact: ev.impact || 'high',
          targetNodeId: 'macro_events'
        }));
        const macroNode = this.getNodeById('macro_events');
        if (macroNode) {
          macroNode.displayValue = `${this.upcomingEvents.length} catalisadores`;
          macroNode.metricCaption = this.upcomingEvents[0]?.title || 'Calendário macro';
          macroNode.dataStatus = 'live';
        }
      }

      if (liveCount > 0) {
        this.lastUpdated = new Date().toISOString();
        this.dataConfidence = liveCount >= 3 ? 'live' : 'partial';
      }

      return this;
    }

    getNodeById(id) {
      return this.nodes.find(n => n.id === id) || null;
    }

    getConnectionById(id) {
      return this.connections.find(c => c.id === id) || null;
    }

    getPrimarySpheres() {
      return this.nodes.filter(n => n.tier === 'primary');
    }

    getTrendSatellites() {
      return this.nodes.filter(n => n.tier === 'trend_satellite');
    }

    getConnectionsForNode(nodeId) {
      if (!nodeId) return [];
      return this.connections.filter(c => c.source === nodeId || c.target === nodeId);
    }

    getNeighborNodeIds(nodeId) {
      if (!nodeId) return new Set();
      const set = new Set();
      this.connections.forEach(c => {
        if (c.source === nodeId) set.add(c.target);
        if (c.target === nodeId) set.add(c.source);
      });
      return set;
    }

    resolveLens(lens) {
      if (!lens || lens === 'all') return 'all';
      return LENS_ALIASES[lens] || lens;
    }

    getFilteredGraph(rawLens = this.selectedUniverse) {
      const lens = this.resolveLens(rawLens);
      if (lens === 'all') {
        return {
          nodes: this.nodes.map(n => Object.assign({}, n, { isDimmed: false, isBridge: false })),
          connections: this.connections,
          activeUniverse: 'all'
        };
      }

      const activeNodes = this.nodes.filter(n => {
        if (rawLens === 'brasil') return n.region === 'BR';
        if (rawLens === 'us') return n.region === 'US';
        return n.universe === lens;
      });
      const activeIds = new Set(activeNodes.map(n => n.id));

      const activeConnections = this.connections.filter(c =>
        activeIds.has(c.source) || activeIds.has(c.target)
      );

      const bridgeIds = new Set();
      activeConnections.forEach(c => {
        if (!activeIds.has(c.source)) bridgeIds.add(c.source);
        if (!activeIds.has(c.target)) bridgeIds.add(c.target);
      });

      const displayNodes = this.nodes.map(n => {
        const isPrimaryFocus = activeIds.has(n.id);
        const isBridge = !isPrimaryFocus && bridgeIds.has(n.id);
        return Object.assign({}, n, {
          isDimmed: !isPrimaryFocus,
          isBridge
        });
      });

      return {
        nodes: displayNodes,
        connections: this.connections,
        activeConnections,
        activeUniverse: rawLens
      };
    }

    getMacroScenarioSummary() {
      const br = this.getNodeById('cycle_br');
      const us = this.getNodeById('cycle_us');
      const gold = this.getNodeById('gold_commodities');

      return [
        {
          id: 'cycle_br',
          flag: '🇧🇷',
          title: 'Brasil',
          status: br?.dataStatus === 'live' ? br.displayValue : 'Leitura de Ciclo B3',
          tone: br?.state || 'neutral',
          note: br?.dataStatus === 'live'
            ? (br.details?.permission || 'Regime sincronizado com o Ciclo de Mercado.')
            : 'Conectado ao motor de Ciclo de Mercado e tendência de 21 pregões (DI e Dólar).'
        },
        {
          id: 'cycle_us',
          flag: '🇺🇸',
          title: 'EUA',
          status: us?.dataStatus === 'live' ? us.displayValue : 'Ciclo & Amplitude EUA',
          tone: us?.state || 'neutral',
          note: us?.dataStatus === 'live'
            ? (us.details?.benchmarks || 'Benchmarks de Wall Street em janela de 21 pregões.')
            : 'Avaliação conjunta do Ciclo EUA e da esfera independente de Market Breadth.'
        },
        {
          id: 'gold_commodities',
          flag: '✦',
          title: 'Ouro & Proteção',
          status: gold?.dataStatus === 'live' ? `${gold.stateLabel} (${gold.displayValue})` : 'Termômetro de Hedge',
          tone: gold?.state || 'neutral',
          note: 'Monitora rotação para ativos reais e proteção de poder de compra em 21 pregões.'
        }
      ];
    }

    getPortfolioAllocationBreakdown() {
      const snap = this.portfolioSnapshot;
      if (!snap.isLive || !Number.isFinite(snap.equity) || snap.equity <= 0) {
        return {
          isLive: false,
          equity: null,
          equityDisplay: 'Sincronize na Atualização Diária',
          cash: { value: null, pct: null, label: 'Caixa & Renda Fixa' },
          localEquities: { value: null, pct: null, label: 'Ações & Futuros BR' },
          globalEquities: { value: null, pct: null, label: 'Internacional / BDRs' },
          heatPct: null,
          heatLimitPct: snap.heatLimitPct || 5.0
        };
      }

      const equity = snap.equity;
      const localVal = Math.max(0, Number(snap.localExposureValue || 0));
      const globalVal = Math.max(0, Number(snap.globalExposureValue || 0));
      const cashVal = Math.max(0, Number.isFinite(snap.cashValue) ? snap.cashValue : (equity - localVal - globalVal));

      const toPct = (v) => Math.round((v / equity) * 1000) / 10;

      return {
        isLive: true,
        equity,
        equityDisplay: formatBRL(equity),
        cash: { value: cashVal, pct: toPct(cashVal), label: 'Caixa & Renda Fixa' },
        localEquities: { value: localVal, pct: toPct(localVal), label: 'Ações & Futuros BR' },
        globalEquities: { value: globalVal, pct: toPct(globalVal), label: 'Internacional / BDRs' },
        heatPct: snap.heatPct,
        heatLimitPct: snap.heatLimitPct
      };
    }

    getIndicativeRebalanceScenario() {
      const current = this.getPortfolioAllocationBreakdown();

      // 1. Se o snapshot do pipeline forneceu a sugestão enriquecida do motor de alocação de 21 pregões
      if (this.allocationSuggestion && typeof this.allocationSuggestion === 'object') {
        const s = this.allocationSuggestion;
        const comparisonRows = Array.isArray(s.comparisonRows) ? s.comparisonRows : [];

        // Mapeia para manter compatibilidade com consumidores legados de `rows`
        const rows = comparisonRows.map(r => ({
          key: r.key,
          label: r.label,
          currentDisplay: r.currentDisplay,
          currentPct: r.currentPct,
          currentAmount: r.currentAmount,
          suggestedDisplay: r.suggestedDisplay,
          suggestedPct: r.suggestedPct,
          suggestedAmount: r.suggestedAmount,
          deltaPct: r.deltaPct,
          action: r.action,
          actionLabel: r.actionLabel,
          postureGuidance: r.rationale,
          direction: r.action === 'increase' ? 'up' : r.action === 'decrease' ? 'down' : 'neutral'
        }));

        return {
          isLivePortfolio: !!(s.hasLivePortfolio ?? current.isLive),
          totalEquity: s.totalEquity ?? current.equity,
          postureLabel: s.postureLabel || 'Postura Neutra & Disciplinada',
          confidenceLevel: s.confidenceLevel || 'MODERADA',
          shortRationale: s.shortRationale || 'Panorama baseado na consistência de 21 pregões.',
          horizonLabel: 'Horizonte Estrutural de 21 Pregões',
          isHoldRecommended: !!s.isHoldRecommended,
          hasBinarySuperRisk: !!s.hasBinarySuperRisk,
          eventsNote: s.eventsNote || '',
          highImpactEvents: Array.isArray(s.highImpactEvents) ? s.highImpactEvents : [],
          netRiskScore: s.netRiskScore ?? 0,
          evidences: Array.isArray(s.evidences) ? s.evidences : [],
          targetAllocations: s.targetAllocations || {},
          current,
          rows,
          comparisonRows,
          recommendations: Array.isArray(s.regulatoryPrinciples) && s.regulatoryPrinciples.length
            ? s.regulatoryPrinciples
            : [
              'Respeite a precedência do método: Permissão do Ciclo → Qualidade do Setup (Grades A/B/C) → Position Sizing → Portfolio Heat.',
              'Decisões de alocação exigem persistência comprovada de tendência na janela canônica de 21 pregões.',
              'Preserve a separação contábil: contas correntes permanecem fora da Equity de Investimentos.'
            ],
          disclaimer: 'AVISO IMPORTANTE (CARÁTER NÃO VINCULANTE): Esta leitura estrutural de alocação é estritamente uma ferramenta educacional e de apoio à decisão baseada nas evidências macroeconômicas de 21 pregões e regras do método. Não constitui recomendação personalizada de investimento, nem executa ordens ou rebalanceamentos automáticos.'
        };
      }

      // 2. Fallback autônomo (quando sem conexão ao backend) — Motor determinístico de 21 pregões
      const brNode = this.getNodeById('cycle_br');
      const usNode = this.getNodeById('cycle_us');
      const breadthNode = this.getNodeById('breadth_us');
      const goldNode = this.getNodeById('gold_commodities');
      const diNode = this.getNodeById('trend_di');
      const dollarNode = this.getNodeById('trend_dolar');

      const isBrDefense = brNode?.state === 'defense' || (brNode?.trendDirection === 'down');
      const isBrExpansion = brNode?.state === 'expansion' || (brNode?.trendDirection === 'up');
      const isUsExpansion = usNode?.state === 'expansion' || (usNode?.trendDirection === 'up');
      const isUsDefense = usNode?.state === 'defense' || (usNode?.trendDirection === 'down');
      const isGoldStrong = goldNode?.trendDirection === 'up';

      let postureLabel = 'Postura Neutra & Disciplinada';
      let confidenceLevel = 'MODERADA';
      let shortRationale = 'Mercados em consolidação de 21 pregões. Seletividade rigorosa em novos setups.';

      if (isBrDefense && isUsDefense) {
        postureLabel = 'Postura Defensiva Máxima (Preservação de Capital)';
        confidenceLevel = 'ALTA';
        shortRationale = 'Confluência de contração nos 21 pregões em Brasil e EUA. Prioridade total à liquidez e proteção.';
      } else if (isBrDefense && isUsExpansion) {
        postureLabel = 'Postura Seletiva com Viés Global';
        confidenceLevel = 'MODERADA';
        shortRationale = 'Divergência entre fraqueza na B3 e expansão nos EUA. Manter lideranças externas e cautela local.';
      } else if (isBrExpansion && isUsExpansion) {
        postureLabel = 'Postura Construtiva / Alocação em Tendência';
        confidenceLevel = 'ALTA';
        shortRationale = 'Alinhamento favorável nos 21 pregões entre B3 e EUA com lideranças sólidas.';
      }

      // Alvos em múltiplos de 5% somando 100%
      let sugFixed = 35;
      let sugBr = 20;
      let sugUs = 20;
      let sugGold = 10;
      let sugCash = 15;

      if (isBrDefense) {
        sugBr = 10;
        sugCash = 25;
        sugFixed = 40;
      }
      if (isUsDefense) {
        sugUs = 10;
        sugGold = 15;
      }
      if (isBrExpansion) {
        sugBr = 25;
        sugCash = 10;
      }
      if (isUsExpansion) {
        sugUs = 25;
      }

      // Normalização final para garantir soma 100% em múltiplos de 5
      const sum = sugFixed + sugBr + sugUs + sugGold + sugCash;
      if (sum !== 100) {
        sugCash += (100 - sum);
      }

      const totalEq = current.equity || 0;

      const compRows = [
        {
          key: 'fixedIncome',
          label: 'Renda Fixa / Pós-fixado',
          currentPct: current.isLive ? Number((current.cash.pct * 0.7).toFixed(1)) : null,
          currentDisplay: current.isLive ? `${(current.cash.pct * 0.7).toFixed(1).replace('.', ',')}%` : 'Sincronizar',
          suggestedPct: sugFixed,
          suggestedDisplay: `${sugFixed}%`,
          action: 'maintain',
          actionLabel: 'Manter',
          rationale: 'Carrego estrutural atrelado à taxa DI com baixo risco de cauda.'
        },
        {
          key: 'localEquities',
          label: 'Ações Brasil (B3)',
          currentPct: current.isLive ? current.localEquities.pct : null,
          currentDisplay: current.isLive ? `${current.localEquities.pct.toFixed(1).replace('.', ',')}%` : 'Sincronizar',
          suggestedPct: sugBr,
          suggestedDisplay: `${sugBr}%`,
          action: isBrDefense ? 'decrease' : isBrExpansion ? 'increase' : 'maintain',
          actionLabel: isBrDefense ? 'Reduzir' : isBrExpansion ? 'Aumentar' : 'Manter',
          rationale: isBrDefense
            ? 'Regime de defesa em 21 pregões: evitar novas compras e manter apenas posições com stop protegido.'
            : 'Operar setups com confluência de volume e liderança setorial.'
        },
        {
          key: 'globalEquities',
          label: 'Ações Globais & BDRs',
          currentPct: current.isLive ? current.globalEquities.pct : null,
          currentDisplay: current.isLive ? `${current.globalEquities.pct.toFixed(1).replace('.', ',')}%` : 'Sincronizar',
          suggestedPct: sugUs,
          suggestedDisplay: `${sugUs}%`,
          action: isUsExpansion ? 'increase' : isUsDefense ? 'decrease' : 'maintain',
          actionLabel: isUsExpansion ? 'Aumentar' : isUsDefense ? 'Reduzir' : 'Manter',
          rationale: isUsExpansion
            ? 'Manter exposição em líderes globais de alta rentabilidade com Breadth sustentado.'
            : 'Moderação em ativos externos com monitoramento da amplitude setorial.'
        },
        {
          key: 'goldProtection',
          label: 'Ouro & Proteção',
          currentPct: current.isLive ? 5.0 : null,
          currentDisplay: current.isLive ? '5,0%' : 'Monitorado',
          suggestedPct: sugGold,
          suggestedDisplay: `${sugGold}%`,
          action: isGoldStrong ? 'increase' : 'maintain',
          actionLabel: isGoldStrong ? 'Aumentar' : 'Manter',
          rationale: 'Hedge estratégico descorrelacionado para amortecer choques de cauda macroeconômica.'
        },
        {
          key: 'cashLiquidity',
          label: 'Caixa & Liquidez Livre',
          currentPct: current.isLive ? Number((current.cash.pct * 0.3).toFixed(1)) : null,
          currentDisplay: current.isLive ? `${(current.cash.pct * 0.3).toFixed(1).replace('.', ',')}%` : 'Sincronizar',
          suggestedPct: sugCash,
          suggestedDisplay: `${sugCash}%`,
          action: 'maintain',
          actionLabel: 'Manter',
          rationale: 'Reserva de oportunidade desimpedida para acionar quando novos setups surgirem.'
        }
      ];

      // Atualiza delta e amounts
      compRows.forEach(r => {
        if (r.currentPct !== null) {
          r.deltaPct = Number((r.suggestedPct - r.currentPct).toFixed(1));
          r.currentAmount = totalEq > 0 ? (r.currentPct / 100) * totalEq : null;
          r.suggestedAmount = totalEq > 0 ? (r.suggestedPct / 100) * totalEq : null;
          if (r.deltaPct >= 4.0) {
            r.action = 'increase';
            r.actionLabel = `Aumentar (+${Math.round(r.deltaPct)}%)`;
          } else if (r.deltaPct <= -4.0) {
            r.action = 'decrease';
            r.actionLabel = `Reduzir (${Math.round(r.deltaPct)}%)`;
          } else {
            r.action = 'maintain';
            r.actionLabel = 'Manter';
          }
        } else {
          r.deltaPct = null;
          r.currentAmount = null;
          r.suggestedAmount = totalEq > 0 ? (r.suggestedPct / 100) * totalEq : null;
        }
      });

      const fallbackEvidences = [
        {
          name: 'Ciclo B3 (Brasil)',
          period: '21 pregões',
          summary: isBrDefense ? 'Pressão técnica na B3 em 21 pregões.' : 'Estabilidade ou expansão técnica na B3.',
          directionScore: isBrDefense ? -1.0 : isBrExpansion ? 1.0 : 0.0,
          weight: 20
        },
        {
          name: 'Ciclo S&P 500 / Nasdaq (EUA)',
          period: '21 pregões',
          summary: isUsExpansion ? 'Expansão nos EUA em 21 pregões com suporte das lideranças.' : 'Correção ou consolidação externa.',
          directionScore: isUsExpansion ? 1.0 : isUsDefense ? -1.0 : 0.0,
          weight: 20
        },
        {
          name: 'Market Breadth & Rotação (EUA)',
          period: '21 pregões',
          summary: 'Participação setorial e amplitude acompanhadas em esfera independente.',
          directionScore: 0.0,
          weight: 15
        },
        {
          name: 'Juros DI Futuro (Brasil)',
          period: '21 pregões',
          summary: diNode?.stateLabel || 'Vértice intermediário monitorado em 21 pregões.',
          directionScore: diNode?.trendDirection === 'up' ? -1.0 : diNode?.trendDirection === 'down' ? 1.0 : 0.0,
          weight: 15
        },
        {
          name: 'Câmbio Dólar / BRL',
          period: '21 pregões',
          summary: dollarNode?.stateLabel || 'Trajetória cambial de 21 pregões.',
          directionScore: dollarNode?.trendDirection === 'up' ? -0.5 : 0.5,
          weight: 10
        },
        {
          name: 'Risco Global (Treasury 10Y & VIX)',
          period: '21 pregões',
          summary: 'Regime de volatilidade implícita e curva longa dos EUA.',
          directionScore: 0.0,
          weight: 10
        },
        {
          name: 'Ouro & Ativos de Proteção',
          period: '21 pregões',
          summary: isGoldStrong ? 'Ouro em tendência ascendente de 21 pregões.' : 'Ouro em consolidação.',
          directionScore: isGoldStrong ? 0.7 : 0.0,
          weight: 10
        }
      ];

      return {
        isLivePortfolio: current.isLive,
        totalEquity: current.equity,
        postureLabel,
        confidenceLevel,
        shortRationale,
        horizonLabel: 'Horizonte Estrutural de 21 Pregões',
        isHoldRecommended: false,
        hasBinarySuperRisk: false,
        eventsNote: 'Nenhum super-evento de volatilidade binária iminente detectado.',
        highImpactEvents: [],
        netRiskScore: 0,
        evidences: fallbackEvidences,
        targetAllocations: {
          fixedIncome: sugFixed,
          localEquities: sugBr,
          globalEquities: sugUs,
          goldProtection: sugGold,
          cashLiquidity: sugCash
        },
        current,
        rows: compRows.map(r => ({
          key: r.key,
          label: r.label,
          currentDisplay: r.currentDisplay,
          currentPct: r.currentPct,
          currentAmount: r.currentAmount,
          suggestedDisplay: r.suggestedDisplay,
          suggestedPct: r.suggestedPct,
          suggestedAmount: r.suggestedAmount,
          deltaPct: r.deltaPct,
          action: r.action,
          actionLabel: r.actionLabel,
          postureGuidance: r.rationale,
          direction: r.action === 'increase' ? 'up' : r.action === 'decrease' ? 'down' : 'neutral'
        })),
        comparisonRows: compRows,
        recommendations: [
          'Respeite a precedência do método: Permissão do Ciclo → Qualidade do Setup (Grades A/B/C) → Position Sizing → Portfolio Heat.',
          'Decisões de alocação exigem persistência comprovada de tendência na janela canônica de 21 pregões.',
          'Preserve a separação contábil: contas correntes permanecem fora da Equity de Investimentos.'
        ],
        disclaimer: 'AVISO IMPORTANTE (CARÁTER NÃO VINCULANTE): Esta leitura estrutural de alocação é estritamente uma ferramenta educacional e de apoio à decisão baseada nas evidências macroeconômicas de 21 pregões e regras do método. Não constitui recomendação personalizada de investimento, nem executa ordens ou rebalanceamentos automáticos.'
      };
    }

    generateInsights() {
      const br = this.getNodeById('cycle_br');
      const us = this.getNodeById('cycle_us');
      const breadth = this.getNodeById('breadth_us');
      const gold = this.getNodeById('gold_commodities');
      const rotation = this.getNodeById('sector_rotation_us');
      const portfolio = this.getPortfolioAllocationBreakdown();

      return [
        {
          id: 'ins_breadth_independence',
          nodeId: 'breadth_us',
          title: 'Amplitude EUA em Esfera Independente',
          diagnostic: breadth?.dataStatus === 'live'
            ? `Market Breadth EUA em leitura ativa (${breadth.displayValue}), validando a qualidade interna do movimento de Wall Street.`
            : 'O Market Breadth dos EUA opera em esfera dedicada para distinguir ralis saudáveis de concentrações frágeis antes de viradas de ciclo.',
          confidence: breadth?.dataStatus === 'live' ? 'high' : 'structural',
          portfolioImpact: 'Evita elevar risco internacional em índices aparentemente estáveis mas com deterioração interna.'
        },
        {
          id: 'ins_cycle_alignment',
          nodeId: 'cycle_br',
          title: 'Alinhamento de Ciclos Brasil × EUA',
          diagnostic: br?.dataStatus === 'live'
            ? `Ciclo Brasil classificado como "${br.displayValue}". Avalie a confluência com o Ciclo EUA (${us?.displayValue || 'em sincronização'}) antes de alocar risco.`
            : 'Compare o regime estrutural da B3 com o ciclo de Wall Street em janelas de 21 pregões, evitando decisões baseadas em ruído diário.',
          confidence: br?.dataStatus === 'live' ? 'high' : 'structural',
          portfolioImpact: 'Concentra o orçamento de Portfolio Heat no mercado com melhor permissão operacional.'
        },
        {
          id: 'ins_sector_rotation',
          nodeId: 'sector_rotation_us',
          title: 'Rotação de Força Relativa EUA (21p & 63p)',
          diagnostic: rotation?.usSectorRotationDetail?.leader
            ? `Desempenho relativo vs. SPY (21p): ${rotation.usSectorRotationDetail.leader.sector} (${rotation.usSectorRotationDetail.leader.symbol}) lidera; ${rotation.usSectorRotationDetail.summaryCounts?.strengthening || 0} setores fortalecendo e ${rotation.usSectorRotationDetail.summaryCounts?.weakening || 0} enfraquecendo (leitura de preço, não fluxo de fundos).`
            : 'Compare a força relativa dos 12 ETFs setoriais dos EUA contra o S&P 500 (SPY) em 21 e 63 pregões para identificar setores ganhando ou perdendo tração.',
          confidence: rotation?.dataStatus === 'live' ? 'high' : 'structural',
          portfolioImpact: 'Orienta a curadoria da Watchlist para setores em fortalecimento relativo e evita insistir em setores enfraquecidos.'
        },
        {
          id: 'ins_gold_protection',
          nodeId: 'gold_commodities',
          title: 'Ouro & Ativos de Proteção (Tendência 21p & Força Relativa)',
          diagnostic: gold?.goldProtectionDetail?.interpretation?.rationale
            ? `${gold.goldProtectionDetail.interpretation.regimeLabel}: ${gold.goldProtectionDetail.interpretation.rationale}`
            : (gold?.dataStatus === 'live'
              ? `Ouro internacional em regime "${gold.stateLabel}" (${gold.displayValue}), servindo de termômetro para hedge real e reserva de valor.`
              : 'Ouro operando em leitura independente (21 pregões e força relativa vs ações e dólar), sem presumir que toda alta seja fuga para segurança.'),
          confidence: gold?.dataStatus === 'live' ? 'high' : 'structural',
          portfolioImpact: 'Auxilia na calibragem da reserva defensiva e proteção cambial da carteira.'
        },
        {
          id: 'ins_portfolio_posture',
          nodeId: 'my_portfolio',
          title: 'Disciplina de Capital & Portfolio Heat',
          diagnostic: portfolio.isLive
            ? `Equity de Investimentos sincronizada em ${portfolio.equityDisplay} com Heat em ${Number(portfolio.heatPct || 0).toFixed(2).replace('.', ',')}% (limite ${portfolio.heatLimitPct.toFixed(1).replace('.', ',')}%).`
            : 'Sincronize suas contas de investimento na Atualização Diária para projetar sua Equity real e Portfolio Heat no centro do mapa.',
          confidence: portfolio.isLive ? 'high' : 'structural',
          portfolioImpact: 'Mantém contas correntes isoladas e preserva o capital para oportunidades de alta confluência.'
        }
      ];
    }

    getUpcomingEvents() {
      return this.upcomingEvents.slice();
    }

    getDailyTapeItems() {
      return this.dailyTape.slice();
    }
  }

  CapitalIntelligenceModel.UNIVERSES = UNIVERSES;
  CapitalIntelligenceModel.DEFAULT_NODES = DEFAULT_NODES;
  CapitalIntelligenceModel.DEFAULT_CONNECTIONS = DEFAULT_CONNECTIONS;
  CapitalIntelligenceModel.formatBRL = formatBRL;

  return CapitalIntelligenceModel;
}));

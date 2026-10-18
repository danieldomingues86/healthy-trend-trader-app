(function (root, factory) {
  const tickerChartModel = typeof module === 'object' && module.exports
    ? require('./ticker-chart-model')
    : root?.TickerChartModel;
  const tradingRubrics = typeof module === 'object' && module.exports
    ? require('./trading-rubrics')
    : root?.TradingRubrics;
  const api = factory(tickerChartModel, tradingRubrics);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.OpportunityRadarModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (TickerChartModel, TradingRubrics) {
  'use strict';

  const SECTOR_TRANSLATIONS = {
    'retail trade': 'Comércio Varejista',
    'electronic technology': 'Tecnologia Eletrônica',
    'non-energy minerals': 'Materiais Básicos',
    'health services': 'Serviços de Saúde',
    'health technology': 'Tecnologia em Saúde',
    'finance': 'Financeiro',
    'producer manufacturing': 'Bens Industriais',
    'process industries': 'Indústrias de Processo',
    'consumer non-durables': 'Consumo Não Cíclico',
    'consumer durables': 'Consumo Cíclico',
    'distribution services': 'Distribuição',
    'commercial services': 'Serviços Comerciais',
    'consumer services': 'Serviços ao Consumidor',
    'energy minerals': 'Petróleo, Gás e Energia',
    'transportation': 'Transportes e Logística',
    'technology services': 'Tecnologia da Informação',
    'utilities': 'Utilidade Pública',
    'industrial services': 'Serviços Industriais',
    'communications': 'Comunicações',
    'não classificado': 'Outros'
  };

  const COMPANY_DISPLAY_NAMES = {
    PETR4: 'Petrobras',
    PETR3: 'Petrobras',
    WEGE3: 'WEG',
    ITUB4: 'Itaú Unibanco',
    VALE3: 'Vale',
    ABEV3: 'Ambev',
    SANB11: 'Santander',
    GGBR4: 'Gerdau',
    SUZB3: 'Suzano',
    MGLU3: 'Magazine Luiza',
    YDUQ3: 'Yduqs',
    BPAC11: 'BTG Pactual',
    RENT3: 'Localiza',
    RAIL3: 'Rumo',
    ENGI11: 'Energisa',
    TOTS3: 'TOTVS',
    COGN3: 'Cogna',
    SMFT3: 'Smart Fit',
    CEAB3: 'C&A Modas',
    LJQQ3: 'Quero-Quero',
    MOVI3: 'Movida',
    ARML3: 'Armac',
    BBAS3: 'Banco do Brasil',
    BBDC4: 'Bradesco',
    PRIO3: 'PRIO',
    EQTL3: 'Equatorial',
    SBSP3: 'Sabesp',
    VIVT3: 'Vivo',
    TIMS3: 'TIM',
    LREN3: 'Lojas Renner',
    RADL3: 'Raia Drogasil',
    RDOR3: 'Rede D\'Or',
    B3SA3: 'B3',
    EMBJ3: 'Embraer',
    CURY3: 'Cury',
    DIRR3: 'Direcional',
    CYRE3: 'Cyrela',
    MULT3: 'Multiplan',
    IGTI11: 'Iguatemi',
    ALOS3: 'Allos',
    VBBR3: 'Vibra Energia',
    UGPA3: 'Ultrapar',
    CSAN3: 'Cosan',
    GOAU4: 'Metalúrgica Gerdau',
    CSNA3: 'CSN',
    CMIN3: 'CSN Mineração',
    USIM5: 'Usiminas',
    KLBN11: 'Klabin',
    SLCE3: 'SLC Agrícola',
    BEEF3: 'Minerva',
    ASAI3: 'Assaí',
    HAPV3: 'Hapvida',
    FLRY3: 'Fleury',
    HYPE3: 'Hypera',
    TAEE11: 'Taesa',
    EGIE3: 'Engie Brasil',
    CPFE3: 'CPFL Energia',
    CMIG4: 'Cemig',
    CPLE3: 'Copel',
    ENEV3: 'Eneva',
    AURE3: 'Auren Energia',
    ITSA4: 'Itaúsa',
    BBSE3: 'BB Seguridade',
    CXSE3: 'Caixa Seguridade',
    PSSA3: 'Porto Seguro',
    IRBR3: 'IRB Re',
    VIVA3: 'Vivara',
    AZZA3: 'Azzas 2154',
    VAMO3: 'Vamos',
    POMO4: 'Marcopolo',
    MRVE3: 'MRV'
  };

  function translateSector(rawSector) {
    const clean = String(rawSector || '').trim();
    if (!clean) return 'Outros';
    const lower = clean.toLowerCase();
    return SECTOR_TRANSLATIONS[lower] || clean;
  }

  function cleanCompanyName(symbol, rawName) {
    const sym = String(symbol || '').trim().toUpperCase();
    if (COMPANY_DISPLAY_NAMES[sym]) return COMPANY_DISPLAY_NAMES[sym];
    const clean = String(rawName || sym)
      .replace(/\bS\.?\s*A\.?(?:\b|$)/gi, '')
      .replace(/\bS\/A\b/gi, '')
      .replace(/\bPARTICIPACOES\b/gi, '')
      .replace(/\bPARTICIPAÇÕES\b/gi, '')
      .replace(/\bBRASILEIRO\b/gi, '')
      .replace(/\bCIA\b/gi, '')
      .replace(/\bCOMPANHIA\b/gi, '')
      .replace(/[.,\-/]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!clean) return sym;
    return clean
      .toLowerCase()
      .replace(/(?:^|\s)\S/g, (ch) => ch.toUpperCase());
  }

  /**
   * Resolve a categoria de mercado real do sistema:
   * - IBOV: Ações do mercado brasileiro (B3)
   * - IFIX: Fundos de Investimento Imobiliário (FIIs)
   * - BDRs: Brazilian Depositary Receipts (Ativos internacionais na B3)
   */
  function resolveMarketCategory(item) {
    if (!item || typeof item !== 'object') return 'IBOV';
    const explicit = String(item.marketCategory || item.market || '').trim().toUpperCase();
    if (explicit === 'IBOV') return 'IBOV';
    if (explicit === 'IFIX' || explicit === 'FII') return 'IFIX';
    if (explicit === 'BDRS' || explicit === 'BDR') return 'BDRs';

    const assetClass = String(item.assetClass || item.type || '').trim().toLowerCase();
    if (assetClass === 'fii' || item.subType === 'fii') {
      return 'IFIX';
    }
    if (assetClass === 'bdr' || item.subType === 'bdr') {
      return 'BDRs';
    }

    const sym = String(item.symbol || '').trim().toUpperCase();
    if (/(31|32|33|34|35|39)$/.test(sym)) {
      return 'BDRs';
    }

    return 'IBOV';
  }

  /**
   * Formata o nome do gatilho conforme o padrão visual do Radar
   */
  function formatTriggerDisplayName(trigger) {
    if (!trigger) return '';
    const id = String(trigger.id || '').trim().toUpperCase();
    if (id === 'INSIDE_BAR') return 'Inside Bar';
    if (id === '123_COMPRA') return '123 Buy';
    if (id === 'PFR_COMPRA') return 'PFR de Compra';
    if (id === 'DAVE_LANDRY') return 'Dave Landry';
    if (id === 'RBI') return 'Barra Vermelha Ignorada';
    return String(trigger.name || id);
  }

  /**
   * Classifica o score de Força Relativa (3M)
   */
  function classifyRsScore(score) {
    const num = Math.round(Number(score) || 0);
    if (num >= 90) return { score: num, label: 'Líder', tier: 'leader' };
    if (num >= 80) return { score: num, label: 'Força Alta', tier: 'high' };
    if (num >= 70) return { score: num, label: 'Média', tier: 'medium' };
    const fallback = TradingRubrics && typeof TradingRubrics.classifyRelativeStrength === 'function'
      ? TradingRubrics.classifyRelativeStrength(num)
      : { label: 'Fraca' };
    return { score: num, label: fallback.label || 'Fraca', tier: 'low' };
  }

  /**
   * Calcula a relação Risco:Retorno (R:R) com base nos dados reais do gatilho e histórico
   */
  function calculateRiskReward(entry, stop, candles) {
    const entryNum = Number(entry);
    const stopNum = Number(stop);
    if (!Number.isFinite(entryNum) || !Number.isFinite(stopNum) || entryNum <= stopNum || stopNum <= 0) {
      return null;
    }
    const risk = entryNum - stopNum;
    if (risk <= 0) return null;

    let targetPrice = entryNum + (risk * 2.4);
    if (Array.isArray(candles) && candles.length > 0) {
      const recent = candles.slice(-252);
      const highs = recent.map((c) => Number(c.high)).filter((h) => Number.isFinite(h) && h > 0);
      if (highs.length > 0) {
        const high52w = Math.max(...highs);
        const potentialRR = (high52w - entryNum) / risk;
        if (high52w > entryNum && potentialRR >= 2.0) {
          targetPrice = Math.min(high52w, entryNum + (risk * 2.8));
        } else {
          targetPrice = entryNum + (risk * 2.4);
        }
      }
    }

    const rr = Number(((targetPrice - entryNum) / risk).toFixed(1));
    return Number.isFinite(rr) && rr > 0 ? rr : null;
  }

  /**
   * Avalia estritamente se um ativo cumpre TODOS os critérios obrigatórios para entrada no gráfico Diário.
   * Retorna null caso qualquer critério não seja atendido.
   */
  function evaluateAssetReadiness(item, candles, marketCycleState = 'healthy') {
    if (!item || !item.symbol || !Array.isArray(candles) || candles.length < 30) {
      return null;
    }
    if (!TickerChartModel || typeof TickerChartModel.calculateEma !== 'function' || typeof TickerChartModel.detectSetupTriggers !== 'function') {
      return null;
    }

    // 1. Ciclo de mercado não pode ser defensivo (proteção de capital bloqueia novas compras)
    const cycleNorm = String(marketCycleState || 'healthy').trim().toLowerCase();
    if (cycleNorm === 'defensive' || cycleNorm === 'riskoff') {
      return null;
    }

    // 2. Força Relativa (3M) mínima obrigatória (>= 70)
    const rsScore = Math.round(Number(item.score ?? item.rsScore ?? 0));
    if (!Number.isFinite(rsScore) || rsScore < 70) {
      return null;
    }

    // 3. Tendência no Diário: Preço > EMA 9 > EMA 30
    const closes = candles.map((c) => Number(c.close));
    const ema9Arr = TickerChartModel.calculateEma(closes, 9);
    const ema30Arr = TickerChartModel.calculateEma(closes, 30);
    const latestCandle = candles[candles.length - 1];
    const latestClose = Number(latestCandle?.close);
    const latestEma9 = ema9Arr[ema9Arr.length - 1];
    const latestEma30 = ema30Arr[ema30Arr.length - 1];

    if (
      !Number.isFinite(latestClose) ||
      latestEma9 === null ||
      latestEma30 === null ||
      !(latestClose > latestEma9 && latestEma9 > latestEma30)
    ) {
      return null;
    }

    // 4. Gatilho de entrada válido e confirmado pelo motor oficial
    const trigger = TickerChartModel.detectSetupTriggers(candles, ema9Arr, ema30Arr);
    if (!trigger || !trigger.hasTrigger || !trigger.id || trigger.id === 'NONE') {
      return null;
    }

    const entry = Number(trigger.entry);
    const stop = Number(trigger.stop);
    if (!Number.isFinite(entry) || !Number.isFinite(stop) || entry <= 0 || stop <= 0 || entry <= stop) {
      return null;
    }

    const stopPct = Number((((entry - stop) / entry) * 100).toFixed(1));
    const rr = calculateRiskReward(entry, stop, candles);
    if (!rr || rr < 1.5) {
      return null;
    }

    const rsClass = classifyRsScore(rsScore);
    const market = resolveMarketCategory(item);
    const sector = translateSector(item.sector);
    const triggerLabel = formatTriggerDisplayName(trigger);

    return {
      symbol: String(item.symbol).trim().toUpperCase(),
      name: cleanCompanyName(item.symbol, item.name),
      fullName: String(item.name || item.symbol).trim(),
      market,
      sector,
      rawSector: String(item.sector || '').trim(),
      rsScore: rsClass.score,
      rsLabel: rsClass.label,
      rsTier: rsClass.tier,
      rs3m: Number.isFinite(Number(item.m3)) ? Number(Number(item.m3).toFixed(1)) : null,
      marketCycle: cycleNorm === 'transition' ? 'Em Transição' : 'Ciclo Positivo',
      marketCycleState: cycleNorm,
      trend: 'Alinhada',
      trendFormula: 'Preço > EMA 9 > EMA 30',
      triggerId: trigger.id,
      triggerName: triggerLabel,
      triggerRawName: trigger.name,
      triggerDescription: trigger.description || '',
      entry,
      stop,
      stopPct,
      rr,
      status: 'Pronto para entrada',
      lastCandleDate: latestCandle.time || null,
      lastPrice: latestClose
    };
  }

  /**
   * Filtra a lista de oportunidades prontas pelos controles da tela
   */
  function filterOpportunities(items, filters = {}) {
    if (!Array.isArray(items)) return [];
    const marketFilter = String(filters.market || 'ALL').trim().toUpperCase();
    const sectorFilter = String(filters.sector || 'ALL').trim();
    const triggerFilter = String(filters.trigger || 'ALL').trim();
    const searchQuery = String(filters.search || '').trim().toLowerCase();

    return items.filter((item) => {
      if (!item || item.status !== 'Pronto para entrada') return false;

      if (marketFilter !== 'ALL' && String(item.market || '').toUpperCase() !== marketFilter) {
        return false;
      }

      if (sectorFilter !== 'ALL' && item.sector !== sectorFilter && item.rawSector !== sectorFilter) {
        return false;
      }

      if (
        triggerFilter !== 'ALL' &&
        item.triggerId !== triggerFilter &&
        item.triggerName !== triggerFilter &&
        item.triggerRawName !== triggerFilter
      ) {
        return false;
      }

      if (searchQuery) {
        const symMatch = String(item.symbol || '').toLowerCase().includes(searchQuery);
        const nameMatch = String(item.name || '').toLowerCase().includes(searchQuery);
        const fullMatch = String(item.fullName || '').toLowerCase().includes(searchQuery);
        if (!symMatch && !nameMatch && !fullMatch) return false;
      }

      return true;
    });
  }

  /**
   * Extrai opções únicas de setores e gatilhos presentes nos ativos prontos
   */
  function extractFilterOptions(items) {
    const list = Array.isArray(items) ? items : [];
    const sectors = [...new Set(list.map((i) => i.sector).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const triggersMap = new Map();
    for (const item of list) {
      if (item.triggerId && item.triggerName && !triggersMap.has(item.triggerId)) {
        triggersMap.set(item.triggerId, item.triggerName);
      }
    }
    const triggers = [...triggersMap.entries()].map(([id, name]) => ({ id, name }));
    return {
      markets: ['IBOV', 'IFIX', 'BDRs'],
      sectors,
      triggers
    };
  }

  return {
    resolveMarketCategory,
    formatTriggerDisplayName,
    classifyRsScore,
    calculateRiskReward,
    evaluateAssetReadiness,
    filterOpportunities,
    extractFilterOptions,
    translateSector,
    cleanCompanyName
  };
});

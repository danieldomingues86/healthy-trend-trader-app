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

  const BRAND_LOGOS = {
    PETR4: { bg: '#008542', fg: '#ffd100', text: 'BR' },
    PETR3: { bg: '#008542', fg: '#ffd100', text: 'BR' },
    WEGE3: { bg: '#00579d', fg: '#ffffff', text: 'WEG' },
    ITUB4: { bg: '#003399', fg: '#ff7800', text: 'itaú' },
    ITSA4: { bg: '#003399', fg: '#ffd100', text: 'ITSA' },
    VALE3: { bg: '#007e7a', fg: '#e5a93c', text: 'VALE' },
    ABEV3: { bg: '#1446a0', fg: '#ffffff', text: 'ambev' },
    SANB11: { bg: '#ec0000', fg: '#ffffff', text: 'SAN' },
    GGBR4: { bg: '#002b49', fg: '#ffffff', text: 'GO' },
    GOAU4: { bg: '#002b49', fg: '#ffffff', text: 'GO' },
    SUZB3: { bg: '#00965e', fg: '#ffffff', text: 'SUZ' },
    MGLU3: { bg: '#0086ff', fg: '#ffffff', text: 'MGLU' },
    BPAC11: { bg: '#001e62', fg: '#ffffff', text: 'BTG' },
    RENT3: { bg: '#008744', fg: '#ffffff', text: 'LOC' },
    RAIL3: { bg: '#1b365d', fg: '#ffffff', text: 'RUMO' },
    ENGI11: { bg: '#0073cf', fg: '#ff6b00', text: 'ENGI' },
    TOTS3: { bg: '#112233', fg: '#00d1b2', text: 'TOTV' },
    YDUQ3: { bg: '#004b87', fg: '#00c389', text: 'YDUQ' },
    COGN3: { bg: '#5c2d91', fg: '#ffffff', text: 'COGN' },
    SMFT3: { bg: '#1c1c1c', fg: '#ffb800', text: 'SMFT' },
    CEAB3: { bg: '#1f2937', fg: '#ffffff', text: 'C&A' },
    LJQQ3: { bg: '#007a33', fg: '#ffd100', text: 'QQ' },
    MOVI3: { bg: '#f26522', fg: '#ffffff', text: 'MOVI' },
    ARML3: { bg: '#1d428a', fg: '#fdb927', text: 'ARML' },
    BBAS3: { bg: '#fcf000', fg: '#0038a8', text: 'BB' },
    BBDC4: { bg: '#cc092f', fg: '#ffffff', text: 'BRAD' },
    PRIO3: { bg: '#0f2c59', fg: '#00b4d8', text: 'PRIO' }
  };

  const FALLBACK_PALETTE = [
    { bg: '#134e4a', fg: '#ffffff' },
    { bg: '#1e3a8a', fg: '#ffffff' },
    { bg: '#3b0764', fg: '#ffffff' },
    { bg: '#14532d', fg: '#ffffff' },
    { bg: '#7c2d12', fg: '#ffffff' },
    { bg: '#0f172a', fg: '#e2e8f0' }
  ];

  /**
   * Resolve a URL de alta fidelidade do logo oficial para qualquer ativo negociado na B3.
   * Suporta ações ON/PN, Units, FIIs e BDRs, tratando frações (PETR4F -> PETR4).
   */
  function resolveAssetLogoUrl(symbol) {
    if (!symbol) return null;
    const raw = String(symbol).trim().toUpperCase();
    if (!raw) return null;
    // Remove sufixo fracionário 'F' (ex: PETR4F -> PETR4)
    const cleanSym = (/^[A-Z]{4}[0-9]{1,2}F$/i.test(raw)) ? raw.slice(0, -1) : raw;
    if (!/^[A-Z0-9]{4,8}$/.test(cleanSym)) return null;
    return `https://icons.brapi.dev/icons/${cleanSym}.svg`;
  }

  /**
   * Obtém detalhes de identidade visual da marca (iniciais e paleta corporativa)
   * para exibição imediata e fallback elegante caso a imagem esteja indisponível.
   */
  function getAssetBrandDetails(symbol) {
    const sym = String(symbol || '').trim().toUpperCase();
    const brand = BRAND_LOGOS[sym];
    if (brand) {
      return {
        brandText: brand.text,
        bg: brand.bg,
        fg: brand.fg,
        hasCustomBrand: true
      };
    }
    const prefix = sym.replace(/[0-9]+$/, '').slice(0, 3) || sym.slice(0, 2);
    let hash = 0;
    for (let i = 0; i < sym.length; i++) {
      hash = (hash * 31 + sym.charCodeAt(i)) % FALLBACK_PALETTE.length;
    }
    const palette = FALLBACK_PALETTE[Math.abs(hash) % FALLBACK_PALETTE.length];
    return {
      brandText: prefix || sym.slice(0, 2),
      bg: palette.bg,
      fg: palette.fg,
      hasCustomBrand: false
    };
  }

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
  function evaluateAssetReadiness(item, candles, marketCycleState = 'healthy', policy) {
    if (!item || !item.symbol || !Array.isArray(candles) || candles.length < 30) {
      return null;
    }
    if (!TickerChartModel || typeof TickerChartModel.calculateEma !== 'function' || typeof TickerChartModel.detectSetupTriggers !== 'function') {
      return null;
    }

    // 1. Ciclo de mercado: somente Ciclo Positivo é aceito no Radar de Oportunidades.
    // Ativos em ciclo 'defensive', 'riskoff' ou 'transition' (Em Transição) são rigorosamente excluídos.
    const cycleNorm = String(marketCycleState || 'healthy').trim().toLowerCase();
    if (cycleNorm !== 'healthy' && cycleNorm !== 'positive' && !cycleNorm.includes('positivo')) {
      return null;
    }
    const itemCycle = String(item.marketCycleState || item.cycleState || item.cycle || item.marketCycle || '').trim().toLowerCase();
    if (itemCycle && itemCycle !== 'healthy' && itemCycle !== 'positive' && !itemCycle.includes('positivo')) {
      return null;
    }

    // 2. Força Relativa (3M) mínima obrigatória (> 80)
    const rsScore = Math.round(Number(item.score ?? item.rsScore ?? 0));
    if (!Number.isFinite(rsScore) || rsScore <= 80) {
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

    // 5. Avaliação oficial da Rubric (Grade do Ativo) com 100% de paridade com o Gráfico e Novo Trade
    let grade = 'B';
    let rubricScore = 80;
    let rubricSummary = '';

    if (TickerChartModel && typeof TickerChartModel.evaluateChartRubric === 'function') {
      const atrInfo = typeof TickerChartModel.calculateAtr === 'function' ? TickerChartModel.calculateAtr(candles, 21) : null;
      const latestAtr = atrInfo?.latestAtr ?? null;
      const latestAtrPct = atrInfo?.latestAtrPct ?? null;

      const tickerData = {
        tickerInfo: {
          symbol: String(item.symbol).trim().toUpperCase(),
          name: item.name || item.symbol,
          price: latestClose
        },
        trigger: {
          hasTrigger: true,
          id: trigger.id,
          name: trigger.name,
          grade: trigger.grade || 'A',
          entry,
          stop
        },
        relativeStrength: {
          score: rsScore,
          classification: rsClass.label
        },
        marketCycle: {
          regime: 'healthy',
          description: 'Positivo'
        },
        trend: {
          status: 'Alta',
          priceAboveEma9: true,
          ema9AboveEma30: true
        },
        volatility: {
          atr21: latestAtr,
          atrPct: latestAtrPct
        },
        indicators: {
          atr21: latestAtr,
          atrPct: latestAtrPct,
          ema9: latestEma9,
          ema30: latestEma30
        },
        fundamentals: item.fundamentals || (
          (market === 'IFIX' || item.assetClass === 'fii' || /11$/.test(String(item.symbol).trim()))
            ? { available: false, status: 'neutral', evaluation: 'Neutro' }
            : undefined
        )
      };

      const activePolicy = policy || (typeof window !== 'undefined' ? (window.riskPolicyState || window.tradingRubricPolicy) : undefined);
      const evalRubric = TickerChartModel.evaluateChartRubric(tickerData, activePolicy);
      if (evalRubric && evalRubric.finalGrade) {
        grade = evalRubric.finalGrade;
        rubricScore = evalRubric.score;
        rubricSummary = evalRubric.summaryText;
      }
    }

    return {
      symbol: String(item.symbol).trim().toUpperCase(),
      name: cleanCompanyName(item.symbol, item.name),
      fullName: String(item.name || item.symbol).trim(),
      logoUrl: resolveAssetLogoUrl(item.symbol),
      grade,
      rubricScore,
      rubricSummary,
      market,
      sector,
      rawSector: String(item.sector || '').trim(),
      rsScore: rsClass.score,
      rsLabel: rsClass.label,
      rsTier: rsClass.tier,
      rs3m: Number.isFinite(Number(item.m3)) ? Number(Number(item.m3).toFixed(1)) : null,
      marketCycle: 'Ciclo Positivo',
      marketCycleState: 'healthy',
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
    const gradeFilter = String(filters.grade || 'ALL').trim().toUpperCase();
    const searchQuery = String(filters.search || '').trim().toLowerCase();

    return items.filter((item) => {
      if (!item || item.status !== 'Pronto para entrada') return false;

      // Salvaguarda: somente ativos em Ciclo Positivo são elegíveis no Radar de Oportunidades.
      // Ativos com ciclo em transição ou defensivo são estritamente excluídos.
      const cycleNorm = String(item.marketCycleState || item.cycleState || item.cycle || item.marketCycle || '').trim().toLowerCase();
      if (cycleNorm.includes('transi') || cycleNorm.includes('defens') || cycleNorm === 'riskoff') {
        return false;
      }
      if (item.marketCycle && !String(item.marketCycle).toLowerCase().includes('positivo')) {
        return false;
      }

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

      if (gradeFilter !== 'ALL' && String(item.grade || '').toUpperCase() !== gradeFilter) {
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
    const gradesSet = new Set(list.map((i) => String(i.grade || '').trim().toUpperCase()).filter(Boolean));
    const gradeOrder = ['A', 'B', 'C', 'D'];
    const presentGrades = gradeOrder.filter((g) => gradesSet.has(g));
    const grades = presentGrades.length > 0 ? presentGrades : ['A', 'B', 'C', 'D'];

    return {
      markets: ['IBOV', 'IFIX', 'BDRs'],
      sectors,
      triggers,
      grades
    };
  }

  const STORAGE_KEY_SELECTION = 'healthy-trend-radar-selection-v1';

  function normalizeTicker(val) {
    if (!val) return '';
    const clean = String(val).trim().toUpperCase();
    if (!/^[A-Z0-9]{4,8}$/.test(clean)) return '';
    return clean;
  }

  function isSelected(selectedTickers, symbol) {
    const sym = normalizeTicker(symbol);
    if (!sym || !Array.isArray(selectedTickers)) return false;
    return selectedTickers.includes(sym);
  }

  function addSelection(selectedTickers, symbol) {
    const list = Array.isArray(selectedTickers) ? [...selectedTickers] : [];
    const sym = normalizeTicker(symbol);
    if (!sym) return list;
    if (!list.includes(sym)) {
      list.push(sym);
    }
    return list;
  }

  function removeSelection(selectedTickers, symbol) {
    const list = Array.isArray(selectedTickers) ? [...selectedTickers] : [];
    const sym = normalizeTicker(symbol);
    if (!sym) return list;
    return list.filter((s) => s !== sym);
  }

  function toggleSelection(selectedTickers, symbol) {
    if (isSelected(selectedTickers, symbol)) {
      return removeSelection(selectedTickers, symbol);
    }
    return addSelection(selectedTickers, symbol);
  }

  function clearSelection() {
    return [];
  }

  function formatDateIso(dateObj = new Date()) {
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
    if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * Gera o conteúdo CSV para importação direta no Nelogica Profit Chart.
   * Formato padrão: lista de tickers limpos, um por linha, separados por CRLF,
   * sem cabeçalho (para evitar que o Profit tente carregar o ticker "ATIVO" ou "TICKER").
   * Nome do arquivo: watchlist_profit_YYYY-MM-DD.csv
   */
  function generateProfitChartCsv(tickers, date = new Date()) {
    const list = Array.isArray(tickers) ? tickers : [];
    const uniqueTickers = [];
    const seen = new Set();

    for (const raw of list) {
      const sym = normalizeTicker(raw);
      if (sym && !seen.has(sym)) {
        seen.add(sym);
        uniqueTickers.push(sym);
      }
    }

    if (uniqueTickers.length === 0) {
      return {
        success: false,
        error: 'Nenhum ativo selecionado para exportação.',
        csvContent: '',
        count: 0,
        filename: ''
      };
    }

    const dateStr = formatDateIso(date);
    const filename = `watchlist_profit_${dateStr}.csv`;
    // Nelogica Profit Chart importa listas de cotações com um ticker por linha (CRLF).
    const csvContent = uniqueTickers.join('\r\n') + '\r\n';

    return {
      success: true,
      filename,
      csvContent,
      count: uniqueTickers.length,
      tickers: uniqueTickers,
      mimeType: 'text/csv;charset=utf-8'
    };
  }

  /**
   * Enriquece os tickers selecionados para exibição nos cards da seção "Minha seleção",
   * buscando informações de preço, variação e setor na lista de oportunidades
   * ou em catálogo/cache prévio para não apagar o card caso o ativo deixe de ser "Pronto para entrada".
   */
  function enrichSelectedItems(selectedTickers, opportunities = [], fallbackCatalog = {}) {
    const list = Array.isArray(selectedTickers) ? selectedTickers : [];
    const oppMap = new Map();
    if (Array.isArray(opportunities)) {
      for (const item of opportunities) {
        if (item && item.symbol) {
          oppMap.set(String(item.symbol).toUpperCase(), item);
        }
      }
    }

    return list.map((raw) => {
      const sym = normalizeTicker(raw);
      const found = oppMap.get(sym);
      if (found) {
        return {
          symbol: sym,
          name: found.name || cleanCompanyName(sym, found.fullName),
          fullName: found.fullName || found.name,
          price: found.lastPrice || found.entry || null,
          change1dPct: found.change1dPct ?? (Number.isFinite(Number(found.changePct)) ? Number(found.changePct) : (Number.isFinite(Number(found.dayChangePct)) ? Number(found.dayChangePct) : null)),
          sector: found.sector || 'Ações B3',
          market: found.market || resolveMarketCategory(found),
          isReady: true,
          triggerName: found.triggerName || null
        };
      }

      const catalogInfo = fallbackCatalog && fallbackCatalog[sym];
      return {
        symbol: sym,
        name: cleanCompanyName(sym, catalogInfo?.name || sym),
        fullName: catalogInfo?.name || sym,
        price: catalogInfo?.price || null,
        change1dPct: catalogInfo?.change1dPct || null,
        sector: translateSector(catalogInfo?.sector) || 'Ações B3',
        market: catalogInfo?.market || (/(31|32|33|34|35|39)$/.test(sym) ? 'BDRs' : (/11$/.test(sym) ? 'IFIX' : 'IBOV')),
        isReady: false,
        triggerName: null
      };
    });
  }

  /**
   * Migra tickers salvos da Watchlist legada (localStorage ou backend) para a seleção do Radar,
   * garantindo que nenhum ativo prévio do trader seja perdido.
   */
  function migrateLegacyWatchlist(legacyItems, currentSelection = []) {
    const set = new Set();
    const result = [];

    const existing = Array.isArray(currentSelection) ? currentSelection : [];
    for (const raw of existing) {
      const sym = normalizeTicker(raw);
      if (sym && !set.has(sym)) {
        set.add(sym);
        result.push(sym);
      }
    }

    let migratedCount = 0;
    const legacy = Array.isArray(legacyItems) ? legacyItems : [];
    for (const item of legacy) {
      const tickerVal = typeof item === 'string' ? item : (item?.ticker || item?.symbol);
      const sym = normalizeTicker(tickerVal);
      if (sym && !set.has(sym)) {
        set.add(sym);
        result.push(sym);
        migratedCount++;
      }
    }

    return {
      migratedCount,
      combinedSelection: result
    };
  }

  return {
    STORAGE_KEY_SELECTION,
    BRAND_LOGOS,
    FALLBACK_PALETTE,
    resolveAssetLogoUrl,
    getAssetBrandDetails,
    resolveMarketCategory,
    formatTriggerDisplayName,
    classifyRsScore,
    calculateRiskReward,
    evaluateAssetReadiness,
    filterOpportunities,
    extractFilterOptions,
    translateSector,
    cleanCompanyName,
    normalizeTicker,
    isSelected,
    addSelection,
    removeSelection,
    toggleSelection,
    clearSelection,
    generateProfitChartCsv,
    enrichSelectedItems,
    migrateLegacyWatchlist
  };
});

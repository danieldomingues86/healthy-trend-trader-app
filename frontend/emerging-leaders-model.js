(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.EmergingLeadersModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const CONFIG = {
    weights: {
      relativeStrength: 0.25,
      rsAcceleration: 0.15,
      high52wProximity: 0.20,
      correctionResilience: 0.15,
      recoveryStrength: 0.15,
      sectorLeadership: 0.10
    },
    thresholds: {
      emergingLeader: 85,
      strongCandidate: 70,
      improving: 55,
      newHighProximityPct: -2.0
    },
    resilienceMap: {
      'forte': 100,
      'strong': 100,
      'moderada': 65,
      'moderate': 65,
      'baixa': 30,
      'low': 30
    }
  };

  const isFiniteNum = (val) => val !== null && val !== undefined && val !== '' && Number.isFinite(Number(val));
  const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

  function calculateDimensionScore(key, rawValue) {
    if (!isFiniteNum(rawValue) && typeof rawValue !== 'string') return null;

    switch (key) {
      case 'relativeStrength': {
        const num = Number(rawValue);
        return clamp(num, 0, 100);
      }
      case 'rsAcceleration': {
        const num = Number(rawValue);
        if (num >= 20) return 100;
        if (num >= 15) return 85 + ((num - 15) / 5) * 15;
        if (num >= 10) return 70 + ((num - 10) / 5) * 15;
        if (num >= 5) return 55 + ((num - 5) / 5) * 15;
        if (num >= 0) return 40 + (num / 5) * 15;
        return clamp(40 + (num * 2), 0, 40);
      }
      case 'high52wProximity': {
        const dist = Number(rawValue);
        if (dist >= 0) return 100;
        if (dist >= -2.0) return 95 + ((dist + 2.0) / 2.0) * 5;
        if (dist >= -5.0) return 85 + ((dist + 5.0) / 3.0) * 10;
        if (dist >= -10.0) return 70 + ((dist + 10.0) / 5.0) * 15;
        if (dist >= -15.0) return 55 + ((dist + 15.0) / 5.0) * 15;
        if (dist >= -25.0) return 35 + ((dist + 25.0) / 10.0) * 20;
        return clamp(35 + ((dist + 25.0) * 1.5), 0, 35);
      }
      case 'correctionResilience': {
        if (typeof rawValue === 'string') {
          const lower = rawValue.trim().toLowerCase();
          return CONFIG.resilienceMap[lower] ?? 50;
        }
        const num = Number(rawValue);
        return clamp(num, 0, 100);
      }
      case 'recoveryStrength': {
        const num = Number(rawValue);
        if (num >= 25) return 100;
        if (num >= 20) return 85 + ((num - 20) / 5) * 15;
        if (num >= 15) return 70 + ((num - 15) / 5) * 15;
        if (num >= 10) return 55 + ((num - 10) / 5) * 15;
        if (num >= 5) return 40 + ((num - 5) / 5) * 15;
        if (num >= 0) return 25 + (num / 5) * 15;
        return clamp(25 + (num * 1.5), 0, 25);
      }
      case 'sectorLeadership': {
        if (typeof rawValue === 'string') {
          const lower = rawValue.trim().toLowerCase();
          if (lower.includes('forte') || lower.includes('strong')) return 100;
          if (lower.includes('moderad') || lower.includes('moderate')) return 70;
          if (lower.includes('form') || lower.includes('develop')) return 45;
          return 30;
        }
        const num = Number(rawValue);
        return clamp(num, 0, 100);
      }
      default:
        return null;
    }
  }

  function calculateCompositeScore(dimensions, customWeights = {}) {
    const weights = { ...CONFIG.weights, ...customWeights };
    const dimensionScores = {};
    let totalWeightedScore = 0;
    let totalActiveWeight = 0;

    for (const key of Object.keys(CONFIG.weights)) {
      const rawVal = dimensions[key];
      const score = calculateDimensionScore(key, rawVal);
      dimensionScores[key] = score;

      if (score !== null && Number.isFinite(score)) {
        const w = weights[key] ?? CONFIG.weights[key];
        totalWeightedScore += score * w;
        totalActiveWeight += w;
      }
    }

    if (totalActiveWeight <= 0) {
      return {
        score: null,
        dimensions: dimensionScores,
        activeWeightsRatio: 0
      };
    }

    const normalizedScore = Math.round(totalWeightedScore / totalActiveWeight);
    return {
      score: clamp(normalizedScore, 0, 100),
      dimensions: dimensionScores,
      activeWeightsRatio: Math.round(totalActiveWeight * 10000) / 10000
    };
  }

  function classifyStock(score, dist52w = null) {
    if (dist52w !== null && isFiniteNum(dist52w) && Number(dist52w) >= CONFIG.thresholds.newHighProximityPct) {
      return {
        key: 'new-high',
        label: 'NOVA MÁXIMA',
        badgeClass: 'new-high',
        color: '#62d48b'
      };
    }
    if (score >= CONFIG.thresholds.emergingLeader) {
      return {
        key: 'emerging-leader',
        label: 'LÍDER EMERGENTE',
        badgeClass: 'emerging-leader',
        color: '#78d294'
      };
    }
    if (score >= CONFIG.thresholds.strongCandidate) {
      return {
        key: 'strong-candidate',
        label: 'CANDIDATO FORTE',
        badgeClass: 'strong-candidate',
        color: '#d4af37'
      };
    }
    if (score >= CONFIG.thresholds.improving) {
      return {
        key: 'improving',
        label: 'EM EVOLUÇÃO',
        badgeClass: 'improving',
        color: '#66c0f4'
      };
    }
    return {
      key: 'not-confirmed',
      label: 'NÃO CONFIRMADO',
      badgeClass: 'not-confirmed',
      color: '#94a99d'
    };
  }

  function calculate52wRangePosition(price, low52w, high52w) {
    if (!isFiniteNum(price) || !isFiniteNum(low52w) || !isFiniteNum(high52w)) return null;
    const p = Number(price), low = Number(low52w), high = Number(high52w);
    if (high <= low) return 50;
    const pos = ((p - low) / (high - low)) * 100;
    return clamp(Math.round(pos), 0, 100);
  }

  function analyzeSectorClusters(stocks) {
    const sectors = new Map();

    for (const stock of stocks) {
      const sectorName = stock.sector || 'Outros';
      let cluster = sectors.get(sectorName);
      if (!cluster) {
        cluster = {
          name: sectorName,
          candidates: 0,
          rs90: 0,
          rs80: 0,
          nearHighs: 0,
          newHighs: 0,
          totalScore: 0,
          stocks: []
        };
        sectors.set(sectorName, cluster);
      }

      cluster.stocks.push(stock);
      if (stock.score >= CONFIG.thresholds.strongCandidate) cluster.candidates++;
      if (stock.rs >= 90) cluster.rs90++;
      if (stock.rs >= 80) cluster.rs80++;
      if (isFiniteNum(stock.dist52w) && Number(stock.dist52w) >= -10.0) cluster.nearHighs++;
      if (isFiniteNum(stock.dist52w) && Number(stock.dist52w) >= CONFIG.thresholds.newHighProximityPct) cluster.newHighs++;
      cluster.totalScore += Number(stock.score || 0);
    }

    const clustersList = [...sectors.values()].map(c => {
      const avgScore = c.stocks.length > 0 ? Math.round(c.totalScore / c.stocks.length) : 0;
      let status = 'Em Formação';
      let badgeClass = 'developing';
      if (c.candidates >= 4 || (c.candidates >= 3 && c.rs90 >= 2)) {
        status = 'Grupo Forte';
        badgeClass = 'strong';
      } else if (c.candidates >= 2 || c.rs80 >= 2) {
        status = 'Grupo Moderado';
        badgeClass = 'moderate';
      }
      return {
        ...c,
        avgScore,
        status,
        badgeClass
      };
    });

    clustersList.sort((a, b) => {
      if (b.candidates !== a.candidates) return b.candidates - a.candidates;
      return b.avgScore - a.avgScore;
    });

    return clustersList;
  }

  function marketCycleMode(cycleState) {
    const normalized = String(cycleState || '').toLowerCase();
    if (normalized.includes('trans') || normalized === 'transition') {
      return {
        state: 'transition',
        label: 'TRANSIÇÃO',
        discoveryModeActive: true,
        modeBadge: 'Modo Descoberta de Líderes',
        quote: '“Mercados ruins também revelam grandes oportunidades.”',
        quoteAuthor: 'Sabedoria de Mercado',
        color: '#c8f071'
      };
    }
    if (normalized.includes('saud') || normalized === 'healthy') {
      return {
        state: 'healthy',
        label: 'SAUDÁVEL',
        discoveryModeActive: false,
        modeBadge: 'Expansão Confirmada',
        quote: '“Líderes já estabelecidos; confirme o setup antes de executar.”',
        quoteAuthor: 'Sabedoria de Mercado',
        color: '#78d294'
      };
    }
    return {
      state: 'defensive',
      label: 'DEFENSIVO',
      discoveryModeActive: false,
      modeBadge: 'Preservação de Capital',
      quote: '“Observe sem pressa; apenas acompanhe os líderes que resistem à queda.”',
      quoteAuthor: 'Sabedoria de Mercado',
      color: '#e4bf69'
    };
  }

  function filterAndSortCandidates(stocks, filters = {}, sortField = 'score', sortAsc = false) {
    let result = [...stocks];

    if (filters.market && filters.market !== 'all' && filters.market !== 'B3') {
      result = result.filter(s => s.assetClass === filters.market || s.market === filters.market);
    }
    if (filters.sector && filters.sector !== 'all' && filters.sector !== 'Todos os setores') {
      result = result.filter(s => s.sector === filters.sector);
    }
    if (isFiniteNum(filters.minScore)) {
      result = result.filter(s => Number(s.score) >= Number(filters.minScore));
    }
    if (isFiniteNum(filters.minRs)) {
      result = result.filter(s => Number(s.rs) >= Number(filters.minRs));
    }
    if (filters.onlyNewHighs) {
      result = result.filter(s => isFiniteNum(s.dist52w) && Number(s.dist52w) >= CONFIG.thresholds.newHighProximityPct);
    }
    if (filters.search) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter(s => (s.symbol && s.symbol.toLowerCase().includes(q)) || (s.name && s.name.toLowerCase().includes(q)) || (s.sector && s.sector.toLowerCase().includes(q)));
    }

    result.sort((a, b) => {
      let va = a[sortField];
      let vb = b[sortField];

      if (sortField === 'resilience') {
        va = CONFIG.resilienceMap[String(va || '').toLowerCase()] || 0;
        vb = CONFIG.resilienceMap[String(vb || '').toLowerCase()] || 0;
      }

      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;

      if (typeof va === 'string' && typeof vb === 'string') {
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortAsc ? Number(va) - Number(vb) : Number(vb) - Number(va);
    });

    return result;
  }

  return {
    CONFIG,
    calculateDimensionScore,
    calculateCompositeScore,
    classifyStock,
    calculate52wRangePosition,
    analyzeSectorClusters,
    marketCycleMode,
    filterAndSortCandidates
  };
});


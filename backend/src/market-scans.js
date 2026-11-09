/*
 * Motor puro dos Scans de Mercado.
 *
 * Ele só interpreta o cache normalizado por market-data; não busca dados e não
 * conhece HTTP ou interface. Assim os scans reutilizam RS, tendência, ATR e
 * volume já calculados na atualização diária.
 */
function finite(value) { return Number.isFinite(Number(value)); }
function isBdrSymbol(symbol) {
  return /(31|32|33|34|35|39)$/.test(String(symbol || '').trim().toUpperCase());
}
function allAssets(cache) {
  const stock = (cache.relativeStrength || []).map((item) => ({
    ...item,
    assetClass: item.assetClass && item.assetClass !== 'stock' ? item.assetClass : (isBdrSymbol(item.symbol) ? 'bdr' : 'stock'),
    benchmark: cache.benchmark?.symbol || 'IBOV'
  }));
  const fii = (cache.relativeStrengthByClass?.fii?.items || []).map(item => ({ ...item, assetClass: 'fii' }));
  const bdr = (cache.relativeStrengthByClass?.bdr?.items || []).map(item => ({ ...item, assetClass: 'bdr' }));
  return [...stock, ...fii, ...bdr];
}
function itemView(item, status) {
  const scan = item.scan || {};
  const isBdr = item.assetClass === 'bdr' || isBdrSymbol(item.symbol);
  const isFii = item.assetClass === 'fii';
  const assetClass = isBdr ? 'bdr' : (isFii ? 'fii' : (item.assetClass || 'stock'));
  return {
    symbol: item.symbol,
    name: item.name || item.symbol,
    sector: item.sector || 'Não classificado',
    assetClass,
    benchmark: item.benchmark || null,
    dayChangePct: finite(scan.dayChangePct) ? Number(scan.dayChangePct) : null,
    volume: finite(scan.volume) ? Number(scan.volume) : null,
    volumeRatio: finite(scan.volumeRatio) ? Number(scan.volumeRatio) : null,
    score: finite(item.score) ? Number(item.score) : null,
    atrPct: finite(scan.atrPct) ? Number(scan.atrPct) : null,
    trendHealthy: scan.healthyTrend === true,
    rsChange6w: finite(item.relativeTrend?.change6w) ? Number(item.relativeTrend.change6w) : null,
    status
  };
}
function sortBy(items, key) { return [...items].sort((a, b) => Number(b[key] ?? -Infinity) - Number(a[key] ?? -Infinity)); }
function scanDefinition({ id, icon, title, description, criteria, items, availability, sort = 'score', strategy = null }) {
  const results = sortBy(items.map((item) => itemView(item, title)), sort).slice(0, 100);
  return { id, icon, title, description, criteria, available: availability, count: results.length, results, strategy };
}
function marketScansFromCache(cache, options = {}) {
  const strategy = options.strategy ? String(options.strategy).toUpperCase() : null;
  const assets = allAssets(cache);
  const hasMetric = (key) => assets.some((item) => finite(item.scan?.[key]));
  const hasTrend = assets.some((item) => item.scan?.healthyTrend === true || (finite(item.scan?.ema20) && finite(item.scan?.ema200)));
  const hasRs = assets.some((item) => finite(item.score));
  const hasRsTrend = assets.some((item) => finite(item.relativeTrend?.change6w));
  const trendCards = [
    scanDefinition({
      id: 'strong-up', icon: '🚀', title: 'Alta forte', description: 'Movimentos iguais ou superiores a +10% no dia.',
      criteria: 'Variação diária ≥ +10%', availability: hasMetric('dayChangePct'), sort: 'dayChangePct',
      items: assets.filter((item) => Number(item.scan?.dayChangePct) >= 10)
    }),
    scanDefinition({
      id: 'strong-down', icon: '🔻', title: 'Queda forte', description: 'Movimentos iguais ou inferiores a −10% no dia.',
      criteria: 'Variação diária ≤ −10%', availability: hasMetric('dayChangePct'), sort: 'dayChangePct',
      items: assets.filter((item) => Number(item.scan?.dayChangePct) <= -10).sort((a, b) => Number(a.scan?.dayChangePct) - Number(b.scan?.dayChangePct))
    }),
    scanDefinition({
      id: 'abnormal-volume', icon: '🔥', title: 'Volume anormal', description: 'Negociação muito acima da média recente.',
      criteria: 'Volume atual > 2× média de 20 pregões', availability: hasMetric('volumeRatio'), sort: 'volumeRatio',
      items: assets.filter((item) => Number(item.scan?.volumeRatio) > 2)
    }),
    scanDefinition({
      id: 'rs-leaders', icon: '🏆', title: 'Líderes RS', description: 'Ativos na frente do próprio pelotão.',
      criteria: 'RS ≥ 90 e linha relativa ascendente', availability: hasRs, sort: 'score',
      items: assets.filter((item) => Number(item.score) >= 90 && item.relativeTrend?.direction6w === 'up')
    }),
    scanDefinition({
      id: 'rs-qualified', icon: '✦', title: 'Ativos qualificados', description: 'Força relativa confirmada para análise no gráfico.',
      criteria: 'RS ≥ 70 e linha relativa ascendente', availability: hasRs, sort: 'score',
      items: assets.filter((item) => Number(item.score) >= 70 && Number(item.score) < 90 && item.relativeTrend?.direction6w === 'up')
    }),
    scanDefinition({
      id: 'rs-accelerating', icon: '⚡', title: 'RS acelerando', description: 'Força relativa melhorando em ritmo superior ao histórico.',
      criteria: 'RS ≥ 70, linha RS ascendente e aceleração em 6 semanas', availability: hasRsTrend, sort: 'rsChange6w',
      items: assets.filter((item) => {
        const sixWeeks = Number(item.relativeTrend?.change6w);
        const thirteenWeeks = Number(item.relativeTrend?.change13w);
        return Number(item.score) >= 70 && sixWeeks > 0.5 && finite(thirteenWeeks) && (sixWeeks / 6) > (thirteenWeeks / 13);
      })
    }),
    scanDefinition({
      id: 'low-atr', icon: '🟢', title: 'ATR baixo', description: 'Volatilidade diária relativa mais contida.',
      criteria: 'ATR(21) < 2% do preço', availability: hasMetric('atrPct'), sort: 'score',
      items: assets.filter((item) => Number(item.scan?.atrPct) > 0 && Number(item.scan?.atrPct) < 2)
    }),
    scanDefinition({
      id: 'healthy-trend', icon: '📈', title: 'Tendência saudável', description: 'Estrutura de preço alinhada para acompanhamento.',
      criteria: 'Preço > EMA20 > EMA200', availability: hasTrend, sort: 'score',
      items: assets.filter((item) => item.scan?.healthyTrend === true)
    })
  ];

  const volatilityCard = scanDefinition({
    id: 'volatility-oversold', icon: '⚡', title: 'IFR2 Sobrevendido (Volatilidade)', description: 'Candidatos ao Volatility Swing: tendência primária de alta com sobrevenda de curto prazo.',
    criteria: 'Preço > SMA200 e IFR(2) ≤ 10 com Liquidez aprovada', availability: true, sort: 'score',
    strategy: 'VOLATILITY_TRADING',
    items: assets.filter((item) => {
      const scan = item.scan || {};
      const rsi2 = finite(scan.rsi2) ? Number(scan.rsi2) : (finite(scan.ifr2) ? Number(scan.ifr2) : null);
      const aboveSma200 = scan.aboveSma200 === true || (finite(scan.close) && finite(scan.ema200) && Number(scan.close) > Number(scan.ema200));
      return (rsi2 != null ? rsi2 <= 10 : true) && aboveSma200;
    })
  });

  let cards = trendCards;
  if (strategy === 'VOLATILITY_TRADING' || strategy === 'VOLATILITY') {
    cards = [volatilityCard, ...trendCards.filter((c) => ['abnormal-volume', 'low-atr'].includes(c.id))];
  } else if (strategy === 'ALL' || options.includeAll === true) {
    cards = [...trendCards, volatilityCard];
  }

  return {
    updatedAt: cache.updatedAt || null,
    dataAsOf: cache.dataAsOf || cache.b3CotahistDate || cache.relativeStrengthByClass?.dataAsOf || cache.overview?.benchmarkHistory?.at(-1)?.date || null,
    source: cache.source || null,
    universe: { total: assets.length, byClass: { stocks: cache.relativeStrength?.length || 0, fii: cache.relativeStrengthByClass?.fii?.items?.length || 0, bdr: cache.relativeStrengthByClass?.bdr?.items?.length || 0 } },
    cards,
    disclaimer: 'Os Scans de Mercado são ferramentas de filtragem e apoio à análise. Os resultados apresentados não constituem recomendação de compra ou venda de ativos.'
  };
}

module.exports = { marketScansFromCache };
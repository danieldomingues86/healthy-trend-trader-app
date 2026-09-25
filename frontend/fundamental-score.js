(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.FundamentalScore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const CONFIG = {
    weights: {
      profitability: 0.28,
      consistency: 0.22,
      growth: 0.16,
      debt: 0.18,
      valuation: 0.10,
      dividends: 0.06
    },
    dimensionNames: {
      profitability: 'Rentabilidade',
      consistency: 'Consistência de Lucros',
      growth: 'Crescimento',
      debt: 'Endividamento',
      valuation: 'Valuation',
      dividends: 'Dividendos'
    },
    classes: [
      ['EXCELENTE', 9.0],
      ['BOM', 7.0],
      ['MÉDIO', 5.0],
      ['FRACO', 3.0],
      ['RUIM', 0.0]
    ]
  };

  const n = (v) => (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : null);
  const rate = (v) => {
    const value = n(v);
    return value != null && Math.abs(value) > 1 ? value / 100 : value;
  };
  const scoreTier = (value, good, excellent) => (value == null ? null : value >= excellent ? 10 : value >= good ? 7 : 3);

  const formatPct = (val) => (val == null ? 'N/D' : `${(val * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`);
  const formatMultiple = (val) => (val == null ? 'N/D' : `${val.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}x`);

  function formatLargeNumber(value, currency = 'BRL') {
    if (value == null || !Number.isFinite(Number(value))) {
      return { formatted: 'N/D', full: 'N/D' };
    }
    const num = Number(value);
    const isBRL = currency === 'BRL';
    const prefix = isBRL ? 'R$ ' : '$ ';
    const full = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: isBRL ? 'BRL' : 'USD',
      maximumFractionDigits: 2
    }).format(num);

    const abs = Math.abs(num);
    let formatted = '';
    if (abs >= 1e12) {
      const val = (num / 1e12).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      formatted = `${prefix}${val} tri`;
    } else if (abs >= 1e9) {
      const val = (num / 1e9).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      formatted = `${prefix}${val} bi`;
    } else if (abs >= 1e6) {
      const val = (num / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
      formatted = `${prefix}${val} mi`;
    } else if (abs >= 1e3) {
      const val = (num / 1e3).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });
      formatted = `${prefix}${val} mil`;
    } else {
      formatted = full;
    }
    return { formatted, full };
  }

  function analyze(data) {
    const safeData = data || {};
    const m = safeData.metrics || {};
    const rawYears = safeData.incomeHistory;
    const hasHistory = Array.isArray(rawYears) && rawYears.length > 0;
    const years = hasHistory ? rawYears : [];
    const count = years.length;
    const positive = years.filter((y) => n(y?.netIncome) > 0).length;

    const debtRatio = m.netDebtToEbitda != null ? n(m.netDebtToEbitda) : n(m.netDebtToEquity);
    const roicRate = rate(m.roic);
    const roeRate = rate(m.roe);
    const profitabilityRate = roicRate ?? roeRate;
    const growthRate = rate(m.earningsCagr);
    const dividendYieldRate = rate(m.dividendYield);
    const peRatio = n(m.priceEarnings);

    // 1. Cálculo das 6 dimensões base
    const dims = {
      profitability: scoreTier(profitabilityRate, 0.10, 0.18),
      consistency: count > 0 ? (positive / count) * 10 : null,
      growth: scoreTier(growthRate, 0.05, 0.12),
      debt: debtRatio == null ? null : debtRatio <= 1.0 ? 10 : debtRatio <= 2.5 ? 7 : 3,
      valuation: peRatio == null ? null : peRatio <= 0 ? 3 : peRatio <= 8.0 ? 10 : peRatio <= 15.0 ? 7 : 4,
      dividends: dividendYieldRate == null
        ? (count > 0 ? Math.min(10, ((n(safeData.dividendYears) || 0) / count) * 10) : null)
        : Math.min(10, (dividendYieldRate / 0.08) * 10)
    };

    // 2. Cobertura de Dados e Ponderação
    const dimKeys = ['profitability', 'consistency', 'growth', 'debt', 'valuation', 'dividends'];
    const availableKeys = dimKeys.filter((key) => dims[key] != null);
    const availableWeight = availableKeys.reduce((sum, key) => sum + CONFIG.weights[key], 0);
    const dataCoveragePct = Math.round(availableWeight * 100);
    const isPartial = dataCoveragePct < 100;

    // Cálculo do total normalizado
    const rawSum = availableKeys.reduce((sum, key) => sum + (dims[key] * CONFIG.weights[key]), 0);
    const rawTotal = availableWeight > 0 ? rawSum / availableWeight : 0;
    const total = Number(rawTotal.toFixed(1));
    const classification = (CONFIG.classes.find(([, min]) => total >= min) || CONFIG.classes.at(-1))[0];

    // 3. Montagem do Breakdown explicável com contribuição matemática auditada
    let tempContributions = availableKeys.map((key) => {
      const effWeight = availableWeight > 0 ? CONFIG.weights[key] / availableWeight : 0;
      const actualContrib = dims[key] * effWeight;
      return {
        key,
        effWeight,
        actualContrib,
        roundedContrib: Number(actualContrib.toFixed(1))
      };
    });

    // Ajuste fino do resíduo de arredondamento para garantir soma idêntica ao total exibido
    if (tempContributions.length > 0) {
      const sumRounded = Number(tempContributions.reduce((s, c) => s + c.roundedContrib, 0).toFixed(1));
      const diff = Number((total - sumRounded).toFixed(1));
      if (Math.abs(diff) > 0.001) {
        // Encontra o item de maior peso efetivo para acomodar o resíduo de 0.1
        let maxItem = tempContributions[0];
        for (const item of tempContributions) {
          if (item.effWeight > maxItem.effWeight) maxItem = item;
        }
        maxItem.roundedContrib = Number((maxItem.roundedContrib + diff).toFixed(1));
      }
    }
    const contribMap = new Map(tempContributions.map((c) => [c.key, c]));

    const dimensionsBreakdown = dimKeys.map((key) => {
      const officialWeight = CONFIG.weights[key];
      const officialWeightPct = Math.round(officialWeight * 100);
      const isAvailable = dims[key] != null;
      const dimScore = isAvailable ? Number(dims[key].toFixed(1)) : null;
      const contribData = contribMap.get(key);

      const effectiveWeight = contribData ? contribData.effWeight : null;
      const effectiveWeightPct = effectiveWeight ? Number((effectiveWeight * 100).toFixed(1)) : null;
      const actualContribution = contribData ? Number(contribData.actualContrib.toFixed(2)) : 0;
      const displayContribution = contribData ? contribData.roundedContrib : 0;
      const maxContribution = effectiveWeight ? Number((10 * effectiveWeight).toFixed(1)) : null;

      let status = 'unavailable';
      let statusLabel = 'Indisponível';
      if (isAvailable) {
        if (dimScore >= 8.5) { status = 'good'; statusLabel = 'Excelente'; }
        else if (dimScore >= 7.0) { status = 'good'; statusLabel = 'Saudável'; }
        else if (dimScore >= 5.0) { status = 'neutral'; statusLabel = 'Mediano'; }
        else { status = 'warn'; statusLabel = 'Atenção'; }
      }

      // Indicadores detalhados da dimensão
      const indicators = [];
      if (key === 'profitability') {
        if (m.roic != null) {
          indicators.push({
            key: 'roic',
            label: 'ROIC',
            value: roicRate,
            formatted: formatPct(roicRate),
            benchmark: '≥ 18% Excelente • ≥ 10% Saudável',
            status: roicRate >= 0.18 ? 'good' : roicRate >= 0.10 ? 'good' : 'warn',
            interpretation: roicRate >= 0.18 ? 'Alta eficiência sobre o capital investido' : roicRate >= 0.10 ? 'Boa eficiência sobre o capital investido' : 'Retorno sobre capital modesto'
          });
        }
        if (m.roe != null) {
          indicators.push({
            key: 'roe',
            label: 'ROE',
            value: roeRate,
            formatted: formatPct(roeRate),
            benchmark: '≥ 18% Excelente • ≥ 10% Saudável',
            status: roeRate >= 0.18 ? 'good' : roeRate >= 0.10 ? 'good' : 'warn',
            interpretation: roeRate >= 0.18 ? 'Excelente retorno sobre o patrimônio' : roeRate >= 0.10 ? 'Retorno saudável sobre o patrimônio' : 'Retorno contido sobre o patrimônio'
          });
        }
      } else if (key === 'consistency') {
        indicators.push({
          key: 'consistency',
          label: 'Anos com Lucro Positivo',
          value: count > 0 ? positive / count : null,
          formatted: count > 0 ? `${positive} de ${count} anos` : 'Indisponível',
          benchmark: '100% Excelente • ≥ 80% Sólido',
          status: count === 0 ? 'unavailable' : positive / count >= 0.8 ? 'good' : positive / count >= 0.5 ? 'neutral' : 'warn',
          interpretation: count === 0
            ? 'Dados contábeis históricos não disponíveis na base'
            : positive === count
              ? '100% dos anos recentes avaliados com lucro positivo'
              : positive / count >= 0.8
                ? 'Histórico sólido e recorrente de resultados positivos'
                : 'Histórico misto com períodos de prejuízo'
        });
      } else if (key === 'growth') {
        indicators.push({
          key: 'earningsCagr',
          label: 'Crescimento 5 Anos (CAGR)',
          value: growthRate,
          formatted: formatPct(growthRate),
          benchmark: '≥ 12% Excelente • ≥ 5% Saudável',
          status: growthRate == null ? 'unavailable' : growthRate >= 0.12 ? 'good' : growthRate >= 0.05 ? 'good' : 'warn',
          interpretation: growthRate == null
            ? 'Histórico de crescimento de lucros indisponível'
            : growthRate >= 0.12
              ? 'Forte expansão dos lucros no período de 5 anos'
              : growthRate >= 0.05
                ? 'Crescimento saudável e consistente de lucros'
                : 'Crescimento modesto ou contração no período'
        });
      } else if (key === 'debt') {
        const isEbitda = m.netDebtToEbitda != null;
        indicators.push({
          key: isEbitda ? 'netDebtToEbitda' : 'netDebtToEquity',
          label: isEbitda ? 'Dív. Líquida / EBITDA' : 'Dív. Líquida / PL',
          value: debtRatio,
          formatted: formatMultiple(debtRatio),
          benchmark: '≤ 1,0x Excelente • ≤ 2,5x Controlado',
          status: debtRatio == null ? 'unavailable' : debtRatio <= 1.0 ? 'good' : debtRatio <= 2.5 ? 'good' : 'warn',
          interpretation: debtRatio == null
            ? 'Métricas de endividamento indisponíveis'
            : debtRatio <= 0
              ? 'Posição de caixa líquido (sem dívida líquida)'
              : debtRatio <= 1.0
                ? 'Baixo endividamento e sólida estrutura de capital'
                : debtRatio <= 2.5
                  ? 'Endividamento controlado dentro dos parâmetros de segurança'
                  : 'Alavancagem financeira elevada que demanda atenção'
        });
      } else if (key === 'valuation') {
        indicators.push({
          key: 'priceEarnings',
          label: 'P/L (Preço / Lucro)',
          value: peRatio,
          formatted: formatMultiple(peRatio),
          benchmark: '≤ 8x Atrativo • ≤ 15x Justo',
          status: peRatio == null ? 'unavailable' : peRatio <= 0 ? 'warn' : peRatio <= 8.0 ? 'good' : peRatio <= 15.0 ? 'neutral' : 'warn',
          interpretation: peRatio == null
            ? 'Múltiplo P/L indisponível'
            : peRatio <= 0
              ? 'P/L negativo (empresa reportou prejuízo recente)'
              : peRatio <= 8.0
                ? 'Valuation atrativo com margem de segurança'
                : peRatio <= 15.0
                  ? 'Preço razoável em relação aos lucros'
                  : 'Múltiplo expandido com prêmio de crescimento embutido'
        });
      } else if (key === 'dividends') {
        indicators.push({
          key: 'dividendYield',
          label: 'Dividend Yield',
          value: dividendYieldRate,
          formatted: formatPct(dividendYieldRate),
          benchmark: '≥ 8% Máximo • ≥ 5% Atrativo',
          status: dividendYieldRate == null ? 'unavailable' : dividendYieldRate >= 0.05 ? 'good' : dividendYieldRate > 0 ? 'neutral' : 'neutral',
          interpretation: dividendYieldRate == null
            ? 'Dados de dividendos indisponíveis'
            : dividendYieldRate >= 0.08
              ? 'Retorno em proventos direto muito atrativo'
              : dividendYieldRate >= 0.05
                ? 'Distribuição sólida de proventos aos acionistas'
                : dividendYieldRate > 0
                  ? 'Proventos moderados (reinveste parcela dos lucros)'
                  : 'Sem pagamento de dividendos no período'
        });
      }

      return {
        id: key,
        name: CONFIG.dimensionNames[key],
        officialWeight,
        officialWeightPct,
        available: isAvailable,
        dimensionScore: dimScore,
        effectiveWeight,
        effectiveWeightPct,
        actualContribution,
        displayContribution,
        maxContribution,
        status,
        statusLabel,
        indicators
      };
    });

    // 4. Mensagem de Cobertura e Avisos
    let coverageWarning = null;
    if (isPartial) {
      const missingNames = dimKeys.filter((k) => dims[k] == null).map((k) => CONFIG.dimensionNames[k]);
      if (dataCoveragePct >= 70) {
        coverageWarning = `Score calculado com dados parciais (${missingNames.join(', ')} indisponível).`;
      } else {
        coverageWarning = `Atenção: Cobertura de dados de ${dataCoveragePct}%. Dados históricos insuficientes para avaliação completa.`;
      }
    }

    // 5. Destaques Qualitativos
    const highlights = [];
    if (profitabilityRate != null && profitabilityRate >= 0.18) highlights.push(['good', 'Alta eficiência na alocação de capital']);
    if (hasHistory && count > 0 && positive / count >= 0.8) highlights.push(['good', 'Lucros consistentes no histórico disponível']);
    if (debtRatio != null && debtRatio <= 1.5) highlights.push(['good', 'Endividamento controlado']);
    if (debtRatio != null && debtRatio > 3.0) highlights.push(['warn', 'Endividamento elevado']);
    if (peRatio != null && peRatio > 0 && peRatio <= 8.0) highlights.push(['good', 'Valuation atrativo']);
    if (!hasHistory) highlights.push(['warn', 'Histórico contábil anual ausente']);

    const takeaway = classification === 'EXCELENTE' || classification === 'BOM'
      ? 'Fundamentos sólidos que podem funcionar como Edge positivo no Trading Rubric.'
      : classification === 'MÉDIO'
        ? 'Fundamentos medianos: use como contexto, sem deixar que dominem a decisão técnica.'
        : 'Fundamentos frágeis: a qualidade fundamental reduz o Edge da oportunidade.';

    return {
      ...safeData,
      score: total,
      rawScore: rawTotal,
      classification,
      dataCoveragePct,
      isPartial,
      coverageWarning,
      hasHistory,
      dimensions: dims,
      dimensionsBreakdown,
      positiveYears: positive,
      yearsCount: count,
      highlights,
      takeaway,
      config: CONFIG
    };
  }

  return { CONFIG, analyze, formatLargeNumber };
}));

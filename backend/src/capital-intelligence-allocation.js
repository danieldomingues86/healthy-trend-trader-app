'use strict';

/**
 * CAPITAL INTELLIGENCE — MOTOR DE SUGESTÃO DE ALOCAÇÃO POR EVIDÊNCIAS DE 21 PREGÕES
 *
 * Princípios Fundamentais:
 * 1. Janela de Evidência de 21 Pregões: Prioriza a persistência da tendência e confluência macro,
 *    nunca a oscilação isolada ou ruído de 1 pregão.
 * 2. Múltiplas Evidências Ponderadas: Nenhum indicador isolado domina a decisão.
 * 3. Proibição de Falsa Precisão: Todas as alocações sugeridas são expressas em múltiplos de 5%
 *    (ex: 45%, 20%, 15%, 10%, 10%) somando exatamente 100%.
 * 4. Salvaguarda "Manter / Aguardar": Se dados forem insuficientes ou evidências contraditórias,
 *    recomenda manter a alocação atual e preservar liquidez (preservação de capital é ativa).
 * 5. Não Execução: Sistema exclusivamente analítico; nunca emite ordens nem altera posições.
 */

// Limites canônicos e prudentes por classe (em percentuais)
const CLASS_CONSTRAINTS = {
  fixedIncome: { min: 25, max: 70, base: 45, label: 'Renda Fixa / Pós-fixado' },
  localEquities: { min: 5, max: 35, base: 20, label: 'Ações Brasil (B3)' },
  globalEquities: { min: 5, max: 30, base: 15, label: 'Ações Globais & BDRs' },
  goldProtection: { min: 5, max: 15, base: 10, label: 'Ouro & Proteção' },
  cashLiquidity: { min: 5, max: 25, base: 10, label: 'Caixa & Liquidez Livre' }
};

// Pesos das dimensões macroeconômicas de 21 pregões
const EVIDENCE_WEIGHTS = {
  cycleBr: 0.15,
  cycleUs: 0.15,
  breadthSector: 0.15,
  interestRateDi: 0.15,
  usdBrlFx: 0.10,
  treasuryVix: 0.15,
  goldRelative: 0.15
};

/**
 * Arredonda um percentual para o múltiplo de 5 mais próximo.
 */
function roundToFive(val) {
  return Math.round(val / 5) * 5;
}

/**
 * Ajusta um conjunto de percentuais arredondados em múltiplos de 5 para que somem exatamente 100%.
 */
function normalizeToHundred(allocations) {
  const keys = ['fixedIncome', 'localEquities', 'globalEquities', 'goldProtection', 'cashLiquidity'];
  let rounded = {};
  keys.forEach(k => {
    const raw = allocations[k] !== undefined ? allocations[k] : CLASS_CONSTRAINTS[k].base;
    const clamped = Math.max(CLASS_CONSTRAINTS[k].min, Math.min(CLASS_CONSTRAINTS[k].max, raw));
    rounded[k] = roundToFive(clamped);
  });

  let sum = keys.reduce((acc, k) => acc + rounded[k], 0);
  let diff = 100 - sum;

  // Ajusta a diferença de 5 em 5% no amortecedor natural (Renda Fixa ou Caixa)
  while (diff !== 0) {
    const step = diff > 0 ? 5 : -5;
    // Preferência de ajuste: fixedIncome -> cashLiquidity -> goldProtection
    if (diff > 0) {
      if (rounded.fixedIncome + step <= CLASS_CONSTRAINTS.fixedIncome.max) {
        rounded.fixedIncome += step;
      } else if (rounded.cashLiquidity + step <= CLASS_CONSTRAINTS.cashLiquidity.max) {
        rounded.cashLiquidity += step;
      } else {
        rounded.goldProtection += step;
      }
    } else {
      if (rounded.fixedIncome + step >= CLASS_CONSTRAINTS.fixedIncome.min) {
        rounded.fixedIncome += step;
      } else if (rounded.cashLiquidity + step >= CLASS_CONSTRAINTS.cashLiquidity.min) {
        rounded.cashLiquidity += step;
      } else {
        rounded.goldProtection += step;
      }
    }
    sum = keys.reduce((acc, k) => acc + rounded[k], 0);
    diff = 100 - sum;
  }

  return rounded;
}

/**
 * Extrai e avalia as 7 dimensões de evidências estruturais dos últimos 21 pregões.
 */
function evaluateMacroEvidences(snapshot = {}, options = {}) {
  const spheres = snapshot.spheres || {};
  const evidences = [];

  // 1. Ciclo de Mercado Brasil (21 pregões)
  const brSphere = spheres.cycle_br || {};
  const ibovRet21 = Number(brSphere.change21dPct ?? brSphere.return21d ?? 0);
  const brState = String(brSphere.state || 'neutral').toLowerCase();
  let brScore = 0;
  let brText = 'Tendência neutra ou lateral no Brasil em 21 pregões.';
  if (brState === 'expansion' || ibovRet21 > 3.0) {
    brScore = 1.0;
    brText = `Ciclo favorável na B3 (+${ibovRet21.toFixed(1).replace('.', ',')}% em 21p) com médias alinhadas.`;
  } else if (brState === 'defense' || ibovRet21 < -3.0) {
    brScore = -1.0;
    brText = `Ciclo de defesa na B3 (${ibovRet21.toFixed(1).replace('.', ',')}% em 21p) sob pressão técnica.`;
  } else {
    brScore = 0.0;
    brText = `Transição na B3 (${ibovRet21 > 0 ? '+' : ''}${ibovRet21.toFixed(1).replace('.', ',')}% em 21p). Seletividade mandatória.`;
  }
  evidences.push({
    id: 'cycle_br',
    name: 'Ciclo B3 (Brasil)',
    weight: EVIDENCE_WEIGHTS.cycleBr,
    directionScore: brScore,
    period: '21 pregões',
    summary: brText,
    dataStatus: brSphere.status || 'atualizado'
  });

  // 2. Ciclo de Mercado EUA (21 pregões)
  const usSphere = spheres.cycle_us || {};
  const spyRet21 = Number(usSphere.change21dPct ?? usSphere.return21d ?? 0);
  const usState = String(usSphere.state || 'neutral').toLowerCase();
  let usScore = 0;
  let usText = 'Mercado americano em consolidação de 21 pregões.';
  if (usState === 'expansion' || spyRet21 > 2.5) {
    usScore = 1.0;
    usText = `Expansão nos EUA (+${spyRet21.toFixed(1).replace('.', ',')}% em 21p). Lideranças globais ativas.`;
  } else if (usState === 'defense' || spyRet21 < -2.5) {
    usScore = -1.0;
    usText = `Correção nos EUA (${spyRet21.toFixed(1).replace('.', ',')}% em 21p). Risco de contração global.`;
  } else {
    usScore = 0.0;
    usText = `Neutro nos EUA (${spyRet21 > 0 ? '+' : ''}${spyRet21.toFixed(1).replace('.', ',')}% em 21p).`;
  }
  evidences.push({
    id: 'cycle_us',
    name: 'Ciclo S&P 500 / Nasdaq (EUA)',
    weight: EVIDENCE_WEIGHTS.cycleUs,
    directionScore: usScore,
    period: '21 pregões',
    summary: usText,
    dataStatus: usSphere.status || 'atualizado'
  });

  // 3. Market Breadth EUA & Rotação Setorial
  const breadthSphere = spheres.breadth_us || spheres.sectors_us || {};
  const aboveMa50 = Number(breadthSphere.pctAboveMa50 ?? breadthSphere.breadthMa50 ?? 50);
  let breadthScore = 0;
  let breadthText = 'Market Breadth mediano (45-60% acima da MM50). Participação moderada.';
  if (aboveMa50 >= 60) {
    breadthScore = 1.0;
    breadthText = `Market Breadth saudável (${aboveMa50.toFixed(0)}% acima da MM50). Alta sustentada por múltiplos setores.`;
  } else if (aboveMa50 < 40) {
    breadthScore = -1.0;
    breadthText = `Market Breadth fragilizado (${aboveMa50.toFixed(0)}% acima da MM50). Divergência de amplitude interna.`;
  }
  evidences.push({
    id: 'breadth_sector',
    name: 'Market Breadth & Rotação (EUA)',
    weight: EVIDENCE_WEIGHTS.breadthSector,
    directionScore: breadthScore,
    period: '21 pregões',
    summary: breadthText,
    dataStatus: breadthSphere.status || 'atualizado'
  });

  // 4. Curva de Juros DI (Brasil) em 21 pregões
  const diSphere = spheres.rate_di || {};
  const diDelta21Pp = Number(diSphere.delta21dPp ?? diSphere.change21dPct ?? 0);
  let diScore = 0;
  let diText = 'Curva de juros DI com estabilidade nos vértices intermediários.';
  if (diDelta21Pp <= -0.25) {
    diScore = 1.0; // Fechamento de juros é favorável a ativos de risco
    diText = `Fechamento da curva DI (${diDelta21Pp.toFixed(2).replace('.', ',')} pp em 21p). Alívio no custo de capital doméstico.`;
  } else if (diDelta21Pp >= 0.25) {
    diScore = -1.0; // Abertura de juros pressiona valuation e favorece renda fixa
    diText = `Abertura da curva DI (+${diDelta21Pp.toFixed(2).replace('.', ',')} pp em 21p). Prêmios de risco mais altos exigem cautela em ações.`;
  }
  evidences.push({
    id: 'interest_rate_di',
    name: 'Curva de Juros DI Futuro (Brasil)',
    weight: EVIDENCE_WEIGHTS.interestRateDi,
    directionScore: diScore,
    period: '21 pregões',
    summary: diText,
    dataStatus: diSphere.status || 'atualizado'
  });

  // 5. Câmbio Dólar/BRL em 21 pregões
  const fxSphere = spheres.dollar_fx || {};
  const fxRet21 = Number(fxSphere.change21dPct ?? 0);
  let fxScore = 0;
  let fxText = 'Dólar estável frente ao Real nos últimos 21 pregões.';
  if (fxRet21 >= 2.0) {
    fxScore = 0.5; // Alta do dólar favorece exposição externa / hedge cambial
    fxText = `Tendência de alta do Dólar (+${fxRet21.toFixed(1).replace('.', ',')}% em 21p). Favorece preservação de poder de compra global.`;
  } else if (fxRet21 <= -2.0) {
    fxScore = -0.5; // Queda do dólar reduz retorno de ativos não protegidos
    fxText = `Apreciação do Real (-${Math.abs(fxRet21).toFixed(1).replace('.', ',')}% em 21p). Alívio cambial desinflacionário.`;
  }
  evidences.push({
    id: 'us_dolar_fx',
    name: 'Câmbio Dólar / Real (USDBRL)',
    weight: EVIDENCE_WEIGHTS.usdBrlFx,
    directionScore: fxScore,
    period: '21 pregões',
    summary: fxText,
    dataStatus: fxSphere.status || 'atualizado'
  });

  // 6. Treasury 10Y & VIX (Volatilidade Global)
  const vixSphere = spheres.us_treasury_vix || spheres.vix || {};
  const vixVal = Number(vixSphere.latestValue ?? vixSphere.vix ?? 18);
  const vixRet21 = Number(vixSphere.change21dPct ?? 0);
  let vixScore = 0;
  let vixText = `VIX em patamar equilibrado (${vixVal.toFixed(1).replace('.', ',')}). Sem estresse agudo.`;
  if (vixVal < 16 && vixRet21 <= 0) {
    vixScore = 1.0;
    vixText = `Volatilidade global controlada (VIX ${vixVal.toFixed(1).replace('.', ',')}). Ambiente favorável a risco com controle de drawdown.`;
  } else if (vixVal > 22 || vixRet21 > 20) {
    vixScore = -1.0;
    vixText = `Aversão a risco global detectada (VIX ${vixVal.toFixed(1).replace('.', ',')}). Demanda por liquidez imediata.`;
  }
  evidences.push({
    id: 'treasury_vix',
    name: 'Volatilidade Global (VIX) & Risco',
    weight: EVIDENCE_WEIGHTS.treasuryVix,
    directionScore: vixScore,
    period: '21 pregões',
    summary: vixText,
    dataStatus: vixSphere.status || 'atualizado'
  });

  // 7. Ouro e Ativos de Proteção
  const goldSphere = spheres.gold_protection || {};
  const goldRet21 = Number(goldSphere.change21dPct ?? goldSphere.return21d ?? 0);
  let goldScore = 0;
  let goldText = 'Ouro em movimento lateral relativo.';
  if (goldRet21 > 2.5 && (brScore < 0 || vixScore < 0)) {
    goldScore = 1.0; // Ouro subindo com aversão a risco confirma fuga para proteção
    goldText = `Ouro com força relativa (+${goldRet21.toFixed(1).replace('.', ',')}% em 21p) confirmando busca estrutural por preservação.`;
  } else if (goldRet21 > 4.0) {
    goldScore = 0.5;
    goldText = `Momentum positivo no Ouro (+${goldRet21.toFixed(1).replace('.', ',')}% em 21p). Manutenção de hedge estratégico recomendada.`;
  } else if (goldRet21 < -4.0) {
    goldScore = -0.5;
    goldText = `Correção no Ouro (${goldRet21.toFixed(1).replace('.', ',')}% em 21p) em ambiente de menor demanda por proteção extrema.`;
  }
  evidences.push({
    id: 'gold_protection',
    name: 'Ouro & Ativos de Proteção',
    weight: EVIDENCE_WEIGHTS.goldRelative,
    directionScore: goldScore,
    period: '21 pregões',
    summary: goldText,
    dataStatus: goldSphere.status || 'atualizado'
  });

  // 8. Eventos Macroeconômicos Relevantes (Modificador de Incerteza)
  const eventsSphere = spheres.macro_events || {};
  const upcomingEvents = Array.isArray(eventsSphere.upcomingEvents) ? eventsSphere.upcomingEvents : [];
  const highImpactImminent = upcomingEvents.filter(ev => {
    const days = Number(ev.daysUntil ?? 99);
    const imp = String(ev.importance || ev.priority || '').toLowerCase();
    return days >= 0 && days <= 5 && (imp.includes('high') || imp.includes('alta') || imp.includes('critical'));
  });

  const hasBinarySuperRisk = highImpactImminent.length > 0;
  const eventsNote = hasBinarySuperRisk
    ? `Atenção: ${highImpactImminent.length} evento(s) de alto impacto nos próximos 5 dias (ex: ${highImpactImminent[0].title || 'Decisão de Juros'}). Recomenda-se cautela pré-divulgação.`
    : 'Calendário macro sem decisões binárias extremas nos próximos 5 dias úteis.';

  return {
    evidences,
    hasBinarySuperRisk,
    highImpactEvents: highImpactImminent,
    eventsNote
  };
}

/**
 * Motor Principal: Constrói a recomendação e compara alocação real com sugestão de 21 pregões.
 */
function buildAllocationSuggestion({ snapshot = {}, portfolioDimension = null, now = new Date() } = {}) {
  const { evidences, hasBinarySuperRisk, highImpactEvents, eventsNote } = evaluateMacroEvidences(snapshot);

  // 1. Verificar suficiência dos dados (prevenção de alucinação ou suposição cega)
  const unavailableCount = evidences.filter(e => e.dataStatus === 'indisponivel').length;
  const isDataInsufficient = unavailableCount >= 3;

  // 2. Calcular Score Agregado Ponderado de Apetite a Risco
  let weightedRiskScore = 0;
  let totalWeight = 0;
  evidences.forEach(e => {
    weightedRiskScore += e.directionScore * e.weight;
    totalWeight += e.weight;
  });
  const netScore = totalWeight > 0 ? weightedRiskScore / totalWeight : 0;

  // 3. Testar Conflito Severo (ex: juros e bolsa em forte contradição)
  const brCycle = evidences.find(e => e.id === 'cycle_br')?.directionScore || 0;
  const usCycle = evidences.find(e => e.id === 'cycle_us')?.directionScore || 0;
  const diRate = evidences.find(e => e.id === 'interest_rate_di')?.directionScore || 0;
  const goldEvidence = evidences.find(e => e.id === 'gold_protection');
  const brScore = brCycle;
  const usScore = usCycle;
  const goldScore = goldEvidence ? goldEvidence.directionScore : 0;
  const isContradictory = (brCycle > 0.5 && diRate < -0.5) || (usCycle > 0.5 && brCycle < -0.5 && diRate < -0.5);

  // 4. Determinar Postura Estratégica e Nível de Confiança
  let confidenceLevel = 'ALTA';
  let postureLabel = 'Postura Equilibrada & Seletiva';
  let shortRationale = 'Evidências apontam equilíbrio entre classes, mantendo disciplina técnica.';
  let isHoldRecommended = false;

  if (isDataInsufficient) {
    confidenceLevel = 'BAIXA / AGUARDAR';
    postureLabel = 'Aguardar — Preservar Alocação Atual';
    shortRationale = 'Dados de mercado parciais ou em sincronização. Manter carteira intacta e preservar liquidez.';
    isHoldRecommended = true;
  } else if (hasBinarySuperRisk) {
    confidenceLevel = 'MODERADA';
    postureLabel = 'Postura Prudente Pré-Eventos';
    shortRationale = `Incerteza temporária com decisão crítica à frente (${highImpactEvents[0]?.title || 'Copom/Fed'}). Evitar apostas direcionais bruscas.`;
  } else if (isContradictory) {
    confidenceLevel = 'MODERADA';
    postureLabel = 'Manter Alocação & Aguardar Confluência';
    shortRationale = 'Divergência entre curva de juros e mercado acionário. Priorizar preservação de capital.';
    isHoldRecommended = true;
  } else if (netScore <= -0.35) {
    confidenceLevel = 'ALTA';
    postureLabel = 'Postura Defensiva com Proteção';
    shortRationale = 'Tendência desfavorável em 21 pregões com juros ou volatilidade elevados. Favorecer Renda Fixa e Caixa.';
  } else if (netScore >= 0.35) {
    confidenceLevel = 'ALTA';
    postureLabel = 'Postura de Expansão com Viés Global';
    shortRationale = 'Tendência saudável em 21 pregões e amplitude setorial positiva. Aumentar seletividade em líderes.';
  }

  // 5. Calcular Alocação Estratégica Alvo (Target)
  let targetAlloc = {};
  if (isHoldRecommended) {
    // Alocação base neutra e segura se houver conflito ou dados insuficientes
    targetAlloc = {
      fixedIncome: 45,
      localEquities: 15,
      globalEquities: 15,
      goldProtection: 10,
      cashLiquidity: 15
    };
  } else if (netScore <= -0.35) {
    // Modo Defensivo: Reduz Ações BR, Aumenta Renda Fixa, Caixa e Ouro
    targetAlloc = {
      fixedIncome: 55,
      localEquities: 10,
      globalEquities: 10,
      goldProtection: 10,
      cashLiquidity: 15
    };
  } else if (netScore >= 0.35) {
    // Modo Expansão: Aloca em Ações Líderes e Globais, reduz Caixa
    targetAlloc = {
      fixedIncome: 35,
      localEquities: 25,
      globalEquities: 20,
      goldProtection: 10,
      cashLiquidity: 10
    };
  } else {
    // Modo Equilibrado: Padrão balanceado com disciplina
    targetAlloc = {
      fixedIncome: 45,
      localEquities: 20,
      globalEquities: 15,
      goldProtection: 10,
      cashLiquidity: 10
    };
  }

  // Se houver ouro em forte tendência de refúgio, reforça proteção
  if (goldEvidence && goldEvidence.directionScore >= 1.0 && targetAlloc.goldProtection < 15) {
    targetAlloc.goldProtection += 5;
    targetAlloc.cashLiquidity = Math.max(5, targetAlloc.cashLiquidity - 5);
  }

  const normalizedTarget = normalizeToHundred(targetAlloc);

  // 6. Extrair Alocação Real do Portfólio do Usuário
  const port = portfolioDimension || {};
  const hasLivePortfolio = Boolean(port.isLive && port.operationalEquity > 0);
  const totalEquity = hasLivePortfolio ? Number(port.operationalEquity) : 0;
  const rawClassAlloc = port.allocationByClass || {};

  // Mapeamento harmonizado entre as categorias reais do usuário e as 5 macro-classes estratégicas
  const currentPcts = {
    fixedIncome: 0,
    localEquities: 0,
    globalEquities: 0,
    goldProtection: 0,
    cashLiquidity: 0
  };

  if (hasLivePortfolio && totalEquity > 0) {
    currentPcts.localEquities = Number(rawClassAlloc.BRAZIL_EQUITIES?.percentage || 0);
    currentPcts.globalEquities = Number((rawClassAlloc.BDRS_INTERNATIONAL?.percentage || 0) + (rawClassAlloc.US_EQUITIES?.percentage || 0));
    currentPcts.goldProtection = Number(rawClassAlloc.GOLD_PROTECTION?.percentage || 0);
    // Renda Fixa declarada em contas
    const fixedIncomeDeclared = Number(rawClassAlloc.FIXED_INCOME_CASH?.percentage || 0);
    const freeCash = Number(port.liquidity?.cashPercentage || 0);

    if (fixedIncomeDeclared > 0 && freeCash > 0) {
      currentPcts.fixedIncome = Math.max(0, fixedIncomeDeclared - freeCash);
      currentPcts.cashLiquidity = freeCash;
    } else if (freeCash > 0) {
      currentPcts.cashLiquidity = freeCash;
      currentPcts.fixedIncome = Math.max(0, 100 - (currentPcts.localEquities + currentPcts.globalEquities + currentPcts.goldProtection + currentPcts.cashLiquidity));
    } else {
      currentPcts.fixedIncome = 100 - (currentPcts.localEquities + currentPcts.globalEquities + currentPcts.goldProtection);
      currentPcts.cashLiquidity = 0;
    }
  }

  // 7. Comparativo Detalhado Classe a Classe
  const classesOrder = [
    { key: 'fixedIncome', label: 'Renda Fixa / Pós-fixado' },
    { key: 'localEquities', label: 'Ações Brasil (B3)' },
    { key: 'globalEquities', label: 'Ações Globais & BDRs' },
    { key: 'goldProtection', label: 'Ouro & Proteção' },
    { key: 'cashLiquidity', label: 'Caixa & Liquidez Livre' }
  ];

  const comparisonRows = classesOrder.map(({ key, label }) => {
    const curPct = hasLivePortfolio ? Number(currentPcts[key] || 0) : null;
    const sugPct = normalizedTarget[key];
    const delta = curPct !== null ? Number((sugPct - curPct).toFixed(1)) : null;

    let action = 'maintain';
    let actionLabel = 'Manter';
    if (delta !== null) {
      if (delta >= 4.0) {
        action = 'increase';
        actionLabel = 'Aumentar';
      } else if (delta <= -4.0) {
        action = 'decrease';
        actionLabel = 'Reduzir';
      }
    }

    let rationale = '';
    if (key === 'fixedIncome') {
      rationale = diRate < 0
        ? 'Prêmios atrativos de juros reais favorecem manutenção da base de segurança com liquidez diária ou vencimento curto.'
        : 'Âncora essencial de estabilidade patrimonial e amortecimento de volatilidade.';
    } else if (key === 'localEquities') {
      rationale = brScore <= 0
        ? 'Restringir a setups de altíssima confluência (Grades A e B) ou aguardar melhora do ciclo técnico da B3.'
        : 'Ciclo doméstico favorável apoia alocação seletiva em ativos líderes com momentum superior ao IBOV.';
    } else if (key === 'globalEquities') {
      rationale = usScore >= 0
        ? 'Manter exposição cambial e foco em líderes globais de alta rentabilidade com tendência confirmada em 21 pregões.'
        : 'Moderação em ativos externos com monitoramento rigoroso de Breadth e suporte do S&P 500.';
    } else if (key === 'goldProtection') {
      rationale = goldScore >= 0.5
        ? 'Preservar parcela estratégica descorrelacionada para proteção contra cauda e surpresas macroeconômicas globais.'
        : 'Manter cota mínima prudente de proteção sem alavancagem.';
    } else if (key === 'cashLiquidity') {
      rationale = hasBinarySuperRisk || brScore < 0
        ? 'Preservar reserva de oportunidade desimpedida. Estar em caixa é uma posição estratégica de respeito ao mercado.'
        : 'Manter margem operacional livre para novos setups sem violar o limite de Portfolio Heat.';
    }

    const curAmount = (curPct !== null && totalEquity > 0) ? (curPct / 100) * totalEquity : null;
    const sugAmount = totalEquity > 0 ? (sugPct / 100) * totalEquity : null;

    return {
      key,
      label,
      currentPct: curPct !== null ? Number(curPct.toFixed(1)) : null,
      currentDisplay: curPct !== null ? `${curPct.toFixed(1).replace('.', ',')}%` : 'Sincronizar',
      currentAmount: curAmount,
      suggestedPct: sugPct,
      suggestedDisplay: `${sugPct}%`,
      suggestedAmount: sugAmount,
      deltaPct: delta,
      action,
      actionLabel,
      rationale
    };
  });

  return {
    asOfTimestamp: now instanceof Date ? now.toISOString() : new Date().toISOString(),
    horizon: '21 pregões (Trend Following Macro)',
    confidenceLevel,
    postureLabel,
    shortRationale,
    isHoldRecommended,
    hasBinarySuperRisk,
    eventsNote,
    highImpactEvents,
    netRiskScore: Number(netScore.toFixed(2)),
    evidences,
    targetAllocations: normalizedTarget,
    hasLivePortfolio,
    totalEquity,
    comparisonRows,
    regulatoryPrinciples: [
      'Natureza Estritamente Educacional & Analítica: O Healthy Trend Trader não atua como corretora, consultora CVM ou gestora discricionária. Esta sugestão não constitui recomendação de investimento individual.',
      'Ausência de Automação Compulsória: O sistema NUNCA executa ordens, nunca rebalanceia carteiras e nunca altera posições ou quantidades cadastradas pelo usuário.',
      'Janela Canônica de 21 Pregões: Rejeição formal de oscilações e notícias de curto prazo (1 pregão). Decisões de alocação exigem persistência comprovada de tendência.',
      'Correlação não é Causalidade: Comportamentos históricos entre classes macro servem como bússola probabilística, não como certeza mecânica futura.'
    ]
  };
}

module.exports = {
  CLASS_CONSTRAINTS,
  EVIDENCE_WEIGHTS,
  roundToFive,
  normalizeToHundred,
  evaluateMacroEvidences,
  buildAllocationSuggestion
};

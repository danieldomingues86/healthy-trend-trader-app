'use strict';

/**
 * HEALTHY TREND TRADER — CAPITAL INTELLIGENCE PORTFOLIO & REAL EXPOSURE ENGINE (11)
 * Módulo Canônico de Integração Patrimonial e Exposição Real
 *
 * Princípios invioláveis:
 * 1. Segregação Absoluta: Contas correntes (ex: Bradesco) permanecem 100% fora da Equity
 *    de investimentos; compõem apenas o Patrimônio Total.
 * 2. Prevenção de Dupla Contagem: O saldo informado nas corretoras já contempla as posições
 *    custodiadas. NUNCA somar posições ao Patrimônio Real ou à Equity. Caixa livre = Equity - Exposição.
 * 3. Classificação Estrita de Setores: Sem invenções. Tickers sem mapeamento seguro são
 *    categorizados estritamente como "Outros / A Classificar".
 * 4. Fotografia Patrimonial Datada: Exibir sempre a data/hora explícita da conciliação.
 * 5. Carteira Intacta: Atualizações de cotações podem recalcular valor de mercado na fotografia,
 *    mas NUNCA alteram ordens, quantidades ou decisões do usuário sem sua ação explícita.
 */

const { RAW_SECTOR_TO_CANONICAL, SECTOR_METADATA } = require('./market-treemap');

const ASSET_CLASSES = {
  FIXED_INCOME_CASH: {
    code: 'FIXED_INCOME_CASH',
    label: 'Renda Fixa & Caixa Livre',
    shortLabel: 'Renda Fixa / Caixa',
    color: '#10b981',
    description: 'Caixa desimpedido em contas de investimento e títulos pós/prefixados.'
  },
  BRAZIL_EQUITIES: {
    code: 'BRAZIL_EQUITIES',
    label: 'Ações Brasil (B3)',
    shortLabel: 'Ações Brasil',
    color: '#3b82f6',
    description: 'Ações ordinárias, preferenciais e units negociadas na B3.'
  },
  BDRS_INTERNATIONAL: {
    code: 'BDRS_INTERNATIONAL',
    label: 'BDRs Internacionais',
    shortLabel: 'BDRs Globais',
    color: '#8b5cf6',
    description: 'Certificados de depósito de empresas e ETFs globais na B3.'
  },
  US_EQUITIES: {
    code: 'US_EQUITIES',
    label: 'Ações & ETFs EUA / Global',
    shortLabel: 'Ações EUA',
    color: '#06b6d4',
    description: 'Ativos em moeda estrangeira (USD) custodiados no exterior.'
  },
  FIIS: {
    code: 'FIIS',
    label: 'Fundos Imobiliários (FIIs)',
    shortLabel: 'FIIs',
    color: '#f59e0b',
    description: 'Fundos de investimento imobiliário negociados na B3.'
  },
  FUTURES_DERIVATIVES: {
    code: 'FUTURES_DERIVATIVES',
    label: 'Futuros & Derivativos',
    shortLabel: 'Futuros B3',
    color: '#ec4899',
    description: 'Contratos futuros de índice, dólar e commodities (margem de garantia).'
  },
  OTHER_ASSETS: {
    code: 'OTHER_ASSETS',
    label: 'Outros Ativos / Cripto',
    shortLabel: 'Outros',
    color: '#6b7280',
    description: 'Startups, criptoativos e outros investimentos alternativos.'
  }
};

/**
 * Dicionário canônico de setores confiáveis para ações B3 e BDRs comuns.
 * Baseado estritamente na classificação da B3 e dados oficiais do CVM/Fundamentus.
 */
const CANONICAL_TICKER_SECTORS = {
  // Petróleo, Gás e Biocombustíveis
  PETR3: 'Petróleo, Gás e Biocombustíveis',
  PETR4: 'Petróleo, Gás e Biocombustíveis',
  PRIO3: 'Petróleo, Gás e Biocombustíveis',
  UGPA3: 'Petróleo, Gás e Biocombustíveis',
  CSAN3: 'Petróleo, Gás e Biocombustíveis',
  VBBR3: 'Petróleo, Gás e Biocombustíveis',
  BRAV3: 'Petróleo, Gás e Biocombustíveis',
  RECV3: 'Petróleo, Gás e Biocombustíveis',

  // Materiais Básicos (Mineração, Siderurgia, Papel)
  VALE3: 'Materiais Básicos',
  GGBR4: 'Materiais Básicos',
  GOAU4: 'Materiais Básicos',
  CSNA3: 'Materiais Básicos',
  USIM5: 'Materiais Básicos',
  SUZB3: 'Materiais Básicos',
  KLBN11: 'Materiais Básicos',
  CMIN3: 'Materiais Básicos',

  // Financeiro (Bancos e Seguradoras)
  ITUB4: 'Financeiro',
  BBDC3: 'Financeiro',
  BBDC4: 'Financeiro',
  BBAS3: 'Financeiro',
  SANB11: 'Financeiro',
  BPAC11: 'Financeiro',
  ITSA4: 'Financeiro',
  B3SA3: 'Financeiro',
  BBSE3: 'Financeiro',
  CXSE3: 'Financeiro',
  PSSA3: 'Financeiro',

  // Utilidade Pública (Energia Elétrica, Saneamento)
  ELET3: 'Utilidade Pública',
  ELET6: 'Utilidade Pública',
  EGIE3: 'Utilidade Pública',
  EQTL3: 'Utilidade Pública',
  CPLE3: 'Utilidade Pública',
  CPLE6: 'Utilidade Pública',
  CPFE3: 'Utilidade Pública',
  CMIG4: 'Utilidade Pública',
  SBSP3: 'Utilidade Pública',
  ENEV3: 'Utilidade Pública',
  TAEE11: 'Utilidade Pública',

  // Bens Industriais (Máquinas, Logística, Aviação)
  WEGE3: 'Bens Industriais',
  EMBR3: 'Bens Industriais',
  RAIL3: 'Bens Industriais',
  CCRO3: 'Bens Industriais',
  POMO4: 'Bens Industriais',
  TUPY3: 'Bens Industriais',

  // Consumo Cíclico
  MGLU3: 'Consumo Cíclico',
  LREN3: 'Consumo Cíclico',
  ARZZ3: 'Consumo Cíclico',
  ALOS3: 'Consumo Cíclico',
  MULT3: 'Consumo Cíclico',
  CYRE3: 'Consumo Cíclico',
  EZTC3: 'Consumo Cíclico',
  MRVE3: 'Consumo Cíclico',
  CVCB3: 'Consumo Cíclico',
  AZUL4: 'Consumo Cíclico',
  GOLL4: 'Consumo Cíclico',

  // Consumo Não Cíclico
  ABEV3: 'Consumo Não Cíclico',
  JBSS3: 'Consumo Não Cíclico',
  BRFS3: 'Consumo Não Cíclico',
  MRFG3: 'Consumo Não Cíclico',
  CRFB3: 'Consumo Não Cíclico',
  ASAI3: 'Consumo Não Cíclico',
  SMTO3: 'Consumo Não Cíclico',

  // Saúde
  RDOR3: 'Saúde',
  RADL3: 'Saúde',
  HAPV3: 'Saúde',
  FLRY3: 'Saúde',
  HYPE3: 'Saúde',

  // Tecnologia da Informação
  TOTS3: 'Tecnologia da Informação',
  CASH3: 'Tecnologia da Informação',
  POSI3: 'Tecnologia da Informação',
  INTB3: 'Tecnologia da Informação',

  // Telecomunicações
  VIVT3: 'Telecomunicações',
  TIMS3: 'Telecomunicações',

  // BDRs Internacionais mais frequentes
  AAPL34: 'Tecnologia da Informação',
  MSFT34: 'Tecnologia da Informação',
  NVDC34: 'Tecnologia da Informação',
  AMZO34: 'Consumo Cíclico',
  GOGL34: 'Serviços de Comunicação',
  GOGL35: 'Serviços de Comunicação',
  META34: 'Serviços de Comunicação',
  TSLA34: 'Consumo Cíclico',
  M2ST34: 'Tecnologia da Informação',
  DISB34: 'Serviços de Comunicação',
  NFLX34: 'Serviços de Comunicação',
  COCA34: 'Consumo Não Cíclico',
  BERK34: 'Financeiro',
  JNJB34: 'Saúde',
  PFIZ34: 'Saúde'
};

/**
 * Identifica a classe de ativo a partir dos metadados e ticker da posição.
 */
function resolvePositionAssetClass(pos = {}) {
  const sym = String(pos.ticker || pos.asset || pos.symbol || '').trim().toUpperCase();
  const rawMeta = String(
    pos.assetClass ||
    pos.marketCategory ||
    pos.category ||
    pos.instrumentType ||
    pos.type ||
    pos.market ||
    ''
  ).trim().toUpperCase();

  if (rawMeta === 'BDR' || rawMeta.includes('BDR')) return ASSET_CLASSES.BDRS_INTERNATIONAL;
  if (rawMeta === 'FII' || rawMeta.includes('FII') || rawMeta.includes('IMOBIL')) return ASSET_CLASSES.FIIS;
  if (rawMeta === 'FUTURES' || rawMeta.includes('FUTUR') || rawMeta === 'BMF') return ASSET_CLASSES.FUTURES_DERIVATIVES;
  if (rawMeta === 'US' || rawMeta === 'US_STOCK' || pos.currency === 'USD') return ASSET_CLASSES.US_EQUITIES;
  if (rawMeta === 'STOCK' || rawMeta.includes('ACAO') || rawMeta.includes('EQUITY')) return ASSET_CLASSES.BRAZIL_EQUITIES;

  // Análise heurística por sufixo e padrão B3
  if (/^(WIN|IND|WDO|DOL|BGI|CCM|ICF|SJC|BIT|ETH|DI1)[FGHJKMNQUVXZ]\d{2}$/.test(sym)) {
    return ASSET_CLASSES.FUTURES_DERIVATIVES;
  }
  if (/(31|32|33|34|35|39)$/.test(sym)) {
    return ASSET_CLASSES.BDRS_INTERNATIONAL;
  }
  if (sym.endsWith('11') && (pos.accountType === 'fii' || rawMeta.includes('FII'))) {
    return ASSET_CLASSES.FIIS;
  }
  if (/(3|4|5|6|11)$/.test(sym)) {
    return ASSET_CLASSES.BRAZIL_EQUITIES;
  }
  if (/^[A-Z]{1,5}$/.test(sym) && pos.currency === 'USD') {
    return ASSET_CLASSES.US_EQUITIES;
  }

  return ASSET_CLASSES.OTHER_ASSETS;
}

/**
 * Resolve o setor econômico do ativo sem invenções.
 * Se não houver mapeamento confiável, retorna "Outros / A Classificar".
 */
function resolvePositionSector(pos = {}) {
  const sym = String(pos.ticker || pos.asset || pos.symbol || '').trim().toUpperCase();
  if (CANONICAL_TICKER_SECTORS[sym]) {
    return CANONICAL_TICKER_SECTORS[sym];
  }

  const rawSec = String(pos.sector || pos.setor || pos.segment || '').trim();
  if (rawSec) {
    if (RAW_SECTOR_TO_CANONICAL[rawSec]) {
      return RAW_SECTOR_TO_CANONICAL[rawSec];
    }
    if (SECTOR_METADATA[rawSec]) {
      return rawSec;
    }
  }

  return 'Outros / A Classificar';
}

/**
 * Constrói a dimensão completa do Patrimônio e Exposição Real.
 *
 * @param {Object} params
 * @param {Object} params.wealthData Dados vindos do wealth service (list)
 * @param {Array} params.tradesData Lista de trades/planos vindos de trades.listPlans
 * @param {Object} params.policyData Política de risco
 * @param {Object} params.workspaceStateData Chaves salvas no workspace (daily_update_accounts, etc.)
 * @param {Date} [params.now] Timestamp da consulta
 */
function buildPortfolioDimension({
  wealthData = null,
  tradesData = [],
  policyData = null,
  workspaceStateData = {},
  now = new Date()
} = {}) {
  const snapshotDate = now.toISOString().slice(0, 10);
  const snapshotTimestamp = now.toISOString();

  // 1. Reconciliação das Contas (Prioridade: contas da Atualização Diária no workspace-state ou no wealthData)
  let accounts = [];
  if (Array.isArray(workspaceStateData?.daily_update_accounts) && workspaceStateData.daily_update_accounts.length > 0) {
    accounts = workspaceStateData.daily_update_accounts;
  } else if (Array.isArray(wealthData?.accounts) && wealthData.accounts.length > 0) {
    accounts = wealthData.accounts;
  }

  // Segregação estrita: Contas de Investimento vs. Contas Correntes
  let investmentWealth = 0;
  let checkingWealth = 0;
  const accountsReconciled = [];

  if (accounts.length > 0) {
    accounts.forEach(acc => {
      const type = String(acc.accountType || acc.type || 'investment').toLowerCase();
      const isChecking = type === 'checking' || type === 'corrente';
      const balance = Number(acc.newBalance ?? acc.balance ?? acc.amount ?? 0);
      const currency = String(acc.currency || 'BRL').toUpperCase();
      const fxRate = Number(acc.fxRate || (currency === 'USD' ? 5.75 : 1));
      const balanceBrl = currency === 'USD' ? (Number(acc.newBalanceUSD ?? acc.balanceUSD ?? (balance / fxRate)) * fxRate) : balance;

      if (isChecking) {
        checkingWealth += balanceBrl;
      } else {
        investmentWealth += balanceBrl;
      }

      accountsReconciled.push({
        id: acc.id || acc.name,
        name: acc.name || acc.label || 'Conta',
        institution: acc.institution || acc.broker || acc.name,
        accountType: isChecking ? 'checking' : 'investment',
        currency,
        fxRate,
        balance: balanceBrl,
        balanceOriginal: balance,
        isChecking
      });
    });
  } else {
    // Fallback gracioso com os valores do resumo de wealth
    const summaryEquity = Number(wealthData?.summary?.operationalEquity ?? wealthData?.summary?.realWealth ?? 0);
    investmentWealth = summaryEquity;
    checkingWealth = 0;
  }

  // Patrimônio Real Total (Regra de Ouro: Soma de Todas as Contas, incluindo Correntes)
  const realWealth = investmentWealth + checkingWealth;

  // 2. Reconciliação das Posições em Aberto
  const openTrades = Array.isArray(tradesData)
    ? tradesData.filter(t => t.status === 'open' || t.status === 'active' || t.status === 'aberta')
    : [];

  let totalExposure = 0;
  let totalHeatPct = 0;
  const positionsEnriched = [];

  const classAccumulator = {
    [ASSET_CLASSES.FIXED_INCOME_CASH.code]: 0,
    [ASSET_CLASSES.BRAZIL_EQUITIES.code]: 0,
    [ASSET_CLASSES.BDRS_INTERNATIONAL.code]: 0,
    [ASSET_CLASSES.US_EQUITIES.code]: 0,
    [ASSET_CLASSES.FIIS.code]: 0,
    [ASSET_CLASSES.FUTURES_DERIVATIVES.code]: 0,
    [ASSET_CLASSES.OTHER_ASSETS.code]: 0
  };

  const classItemCount = {
    [ASSET_CLASSES.FIXED_INCOME_CASH.code]: 0,
    [ASSET_CLASSES.BRAZIL_EQUITIES.code]: 0,
    [ASSET_CLASSES.BDRS_INTERNATIONAL.code]: 0,
    [ASSET_CLASSES.US_EQUITIES.code]: 0,
    [ASSET_CLASSES.FIIS.code]: 0,
    [ASSET_CLASSES.FUTURES_DERIVATIVES.code]: 0,
    [ASSET_CLASSES.OTHER_ASSETS.code]: 0
  };

  const sectorAccumulator = {};
  const regionAccumulator = {
    brazil: 0,
    global: 0
  };
  const currencyAccumulator = {
    brl: 0,
    usd: 0
  };

  openTrades.forEach(trade => {
    const qty = Number(trade.currentQuantity ?? trade.executedQuantity ?? trade.executed_quantity ?? trade.quantity ?? 0);
    const entryPrice = Number(trade.entryPrice ?? trade.entry_price ?? 0);
    const currentPrice = Number(trade.currentPrice ?? trade.current_price ?? trade.lastPrice ?? entryPrice);
    const positionVol = Math.max(0, qty * currentPrice);
    const heatRisk = Number(trade.currentRiskPercent ?? trade.current_risk_percent ?? trade.riskPercent ?? 0);

    totalExposure += positionVol;
    totalHeatPct += heatRisk;

    const assetCls = resolvePositionAssetClass(trade);
    classAccumulator[assetCls.code] = (classAccumulator[assetCls.code] || 0) + positionVol;
    classItemCount[assetCls.code] = (classItemCount[assetCls.code] || 0) + 1;

    // Região & Moeda
    const isGlobal = assetCls.code === ASSET_CLASSES.BDRS_INTERNATIONAL.code ||
      assetCls.code === ASSET_CLASSES.US_EQUITIES.code ||
      trade.currency === 'USD' ||
      trade.market === 'US';

    if (isGlobal) {
      regionAccumulator.global += positionVol;
      currencyAccumulator.usd += positionVol;
    } else {
      regionAccumulator.brazil += positionVol;
      currencyAccumulator.brl += positionVol;
    }

    // Setor
    const sectorName = resolvePositionSector(trade);
    sectorAccumulator[sectorName] = (sectorAccumulator[sectorName] || 0) + positionVol;

    const unrlResult = (currentPrice - entryPrice) * (trade.direction === 'short' ? -1 : 1) * qty;
    const unrlPct = entryPrice > 0 ? ((currentPrice - entryPrice) / entryPrice) * (trade.direction === 'short' ? -1 : 1) * 100 : 0;

    positionsEnriched.push({
      id: trade.id,
      ticker: String(trade.ticker || '').toUpperCase(),
      strategy: trade.strategy || 'Trend Following',
      direction: trade.direction || 'long',
      assetClass: assetCls.code,
      assetClassLabel: assetCls.shortLabel,
      sector: sectorName,
      quantity: qty,
      entryPrice,
      currentPrice,
      volume: positionVol,
      equityWeightPct: investmentWealth > 0 ? (positionVol / investmentWealth) * 100 : 0,
      unrealizedResultBrl: unrlResult,
      unrealizedResultPct: unrlPct,
      riskPercent: heatRisk,
      isGlobal
    });
  });

  // 3. Regra Inviolável de Caixa Livre (Zero Dupla Contagem)
  // O saldo das contas nas corretoras já contempla a custódia.
  // Portanto: Caixa Livre = Equity de Investimentos - Exposição em Posições
  const cashValue = Math.max(0, investmentWealth - totalExposure);
  classAccumulator[ASSET_CLASSES.FIXED_INCOME_CASH.code] = cashValue;

  // Caixa em contas de investimento também contribui para BRL / Brasil (ou USD se conta for internacional)
  accountsReconciled.forEach(acc => {
    if (!acc.isChecking && acc.currency === 'USD') {
      // Saldo livre internacional (Nomad) adiciona à exposição em USD e Global
      // Apenas a parcela em excesso da exposição das posições US
      const usdExposure = openTrades
        .filter(t => t.currency === 'USD' || t.market === 'US')
        .reduce((sum, t) => sum + (Number(t.currentQuantity || 0) * Number(t.currentPrice || 0)), 0);
      const freeUsdCash = Math.max(0, acc.balance - usdExposure);
      currencyAccumulator.usd += freeUsdCash;
      regionAccumulator.global += freeUsdCash;
    }
  });

  const baseWealthForAlloc = investmentWealth > 0 ? investmentWealth : realWealth;

  // Monta lista de Alocação por Classe
  const allocationByClass = Object.keys(ASSET_CLASSES).map(code => {
    const spec = ASSET_CLASSES[code];
    const amount = classAccumulator[code] || 0;
    const pct = baseWealthForAlloc > 0 ? (amount / baseWealthForAlloc) * 100 : 0;
    return {
      code,
      label: spec.label,
      shortLabel: spec.shortLabel,
      amount,
      percentage: Number(pct.toFixed(2)),
      color: spec.color,
      description: spec.description,
      count: classItemCount[code] || (code === ASSET_CLASSES.FIXED_INCOME_CASH.code && cashValue > 0 ? 1 : 0)
    };
  }).filter(c => c.amount > 0 || c.code === ASSET_CLASSES.FIXED_INCOME_CASH.code);

  // Exposição por Região
  const totalRegionVol = regionAccumulator.brazil + regionAccumulator.global;
  const exposureByRegion = {
    brazil: {
      label: 'Brasil (B3 / Moeda Local)',
      amount: regionAccumulator.brazil,
      percentage: totalRegionVol > 0 ? Number(((regionAccumulator.brazil / totalRegionVol) * 100).toFixed(2)) : 100
    },
    global: {
      label: 'Internacional / EUA (BDRs & Dólar)',
      amount: regionAccumulator.global,
      percentage: totalRegionVol > 0 ? Number(((regionAccumulator.global / totalRegionVol) * 100).toFixed(2)) : 0
    }
  };

  // Exposição por Moeda (Exposição Cambial)
  const totalCurrencyVol = currencyAccumulator.brl + currencyAccumulator.usd;
  const exposureByCurrency = {
    brl: {
      label: 'Real Brasileiro (BRL)',
      amount: currencyAccumulator.brl,
      percentage: totalCurrencyVol > 0 ? Number(((currencyAccumulator.brl / totalCurrencyVol) * 100).toFixed(2)) : 100
    },
    usd: {
      label: 'Dólar Americano & BDRs (USD)',
      amount: currencyAccumulator.usd,
      percentage: totalCurrencyVol > 0 ? Number(((currencyAccumulator.usd / totalCurrencyVol) * 100).toFixed(2)) : 0,
      isForeignCurrencyHedge: currencyAccumulator.usd > 0
    }
  };

  // Exposição por Setor (ordenado por volume decrescente)
  const exposureBySector = Object.keys(sectorAccumulator).map(sectorName => {
    const amt = sectorAccumulator[sectorName];
    const pct = totalExposure > 0 ? (amt / totalExposure) * 100 : 0;
    const meta = SECTOR_METADATA[sectorName] || { accent: '#6b7280' };
    const tickers = positionsEnriched.filter(p => p.sector === sectorName).map(p => p.ticker);

    return {
      sector: sectorName,
      amount: amt,
      percentage: Number(pct.toFixed(2)),
      color: meta.accent || '#6b7280',
      tickers,
      isUnclassified: sectorName === 'Outros / A Classificar'
    };
  }).sort((a, b) => b.amount - a.amount);

  // Concentração: Top 1 e Top 3 posições
  const sortedPositions = [...positionsEnriched].sort((a, b) => b.volume - a.volume);
  const top1 = sortedPositions[0] || null;
  const top3List = sortedPositions.slice(0, 3);
  const top3Amount = top3List.reduce((s, p) => s + p.volume, 0);
  const top1Pct = top1 && investmentWealth > 0 ? (top1.volume / investmentWealth) * 100 : 0;
  const top3Pct = investmentWealth > 0 ? (top3Amount / investmentWealth) * 100 : 0;

  let concentrationLevel = 'Baixa';
  let concentrationDiagnostic = 'Risco bem pulverizado entre os ativos em carteira.';
  if (top1Pct > 20 || top3Pct > 45) {
    concentrationLevel = 'Alta';
    concentrationDiagnostic = `Elevada concentração: maior ativo representa ${top1Pct.toFixed(1)}% do capital total.`;
  } else if (top1Pct > 10 || top3Pct > 25) {
    concentrationLevel = 'Moderada';
    concentrationDiagnostic = `Concentração saudável: maior posição limitada a ${top1Pct.toFixed(1)}% da Equity.`;
  }

  // Liquidez
  const cashPct = investmentWealth > 0 ? (cashValue / investmentWealth) * 100 : 0;
  let liquidityStatus = 'Adequada';
  if (cashPct < 15) {
    liquidityStatus = 'Alocação Máxima';
  } else if (cashPct > 60) {
    liquidityStatus = 'Elevada Liquidez';
  }

  const heatLimitPct = Number(policyData?.maxPortfolioHeat ?? policyData?.portfolioHeatLimit ?? 5.0);

  return {
    id: 'my_portfolio',
    tier: 'primary',
    universe: 'portfolio',
    region: 'USER',
    badge: 'MEU PATRIMÔNIO',
    label: 'Meu Patrimônio',
    shortLabel: 'Meu Patrimônio',
    subtitle: 'Equity de Investimentos & Exposição Real',
    windowLabel: 'Fotografia Patrimonial Reconciliada',
    displayValue: investmentWealth > 0
      ? `R$ ${investmentWealth.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : 'Sincronizar Equity',
    metricCaption: `Heat ${totalHeatPct.toFixed(2).replace('.', ',')}% / ${heatLimitPct.toFixed(1).replace('.', ',')}%`,
    state: totalHeatPct > heatLimitPct * 0.85 ? 'caution' : 'expansion',
    stateLabel: `${openTrades.length} ${openTrades.length === 1 ? 'posição aberta' : 'posições abertas'}`,
    status: investmentWealth > 0 ? 'atualizado' : 'parcial',
    isLive: investmentWealth > 0,
    asOfDate: snapshotDate,
    snapshotTimestamp,
    reconciledAt: snapshotTimestamp,
    source: 'Módulo Patrimônio & Atualização Diária (Reconciliado)',
    realWealth,
    operationalEquity: investmentWealth,
    checkingWealth,
    totalExposure,
    cashValue,
    cashPercentage: Number(cashPct.toFixed(2)),
    openPositionsCount: openTrades.length,
    heatPct: Number(totalHeatPct.toFixed(2)),
    heatLimitPct,
    allocationByClass,
    exposureByRegion,
    exposureByCurrency,
    exposureBySector,
    concentration: {
      level: concentrationLevel,
      top1: top1 ? { ticker: top1.ticker, volume: top1.volume, percentage: Number(top1Pct.toFixed(2)) } : null,
      top3: { tickers: top3List.map(p => p.ticker), volume: top3Amount, percentage: Number(top3Pct.toFixed(2)) },
      diagnostic: concentrationDiagnostic
    },
    liquidity: {
      cashAmount: cashValue,
      cashPercentage: Number(cashPct.toFixed(2)),
      status: liquidityStatus
    },
    positionsList: positionsEnriched,
    accountsList: accountsReconciled,
    principles: [
      'Segregação Estrita: Contas correntes permanecem 100% fora da Equity da estratégia e nunca participam do cálculo de drawdown ou heat.',
      'Prevenção de Dupla Contagem: O saldo nas corretoras já engloba o valor de custódia das posições. NUNCA somar posições ao Patrimônio Real.',
      'Classificação Setorial Fidedigna: Sem invenções. Ativos sem mapeamento confiável são categorizados como "Outros / A Classificar".',
      'Fotografia Temporal Rastreável: O sistema registra o exato timestamp de conciliação patrimonial.',
      'Carteira e Decisões Intactas: Atualizações de mercado podem recalcular o valor de mercado das posições na fotografia, mas NUNCA alteram quantidades, ordens ou planos do usuário.'
    ]
  };
}

module.exports = {
  ASSET_CLASSES,
  CANONICAL_TICKER_SECTORS,
  resolvePositionAssetClass,
  resolvePositionSector,
  buildPortfolioDimension
};

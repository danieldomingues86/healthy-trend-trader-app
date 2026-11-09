/**
 * HEALTHY TREND TRADER — STRATEGY CONFIGURATION MODEL (PASSO 3)
 * 
 * Central de Configurações, Parâmetros, Perfis e Versionamento por Estratégia.
 * Suporta separação estrita entre:
 * 1. TREND_FOLLOWING (Swing Trade de Tendência)
 * 2. VOLATILITY_TRADING (Swing Trade de Volatilidade)
 * 
 * Características:
 * - Parâmetros tipados, validados e nunca hardcoded
 * - Versionamento imutável (snapshots auditáveis)
 * - Múltiplos perfis de experimentos (ex: IFR 2 nível 5, 10, 15, 20)
 * - Comparador de perfis lado a lado
 * - Compatível com Browser e Node.js
 */

(function(root) {
  'use strict';

  const STRATEGY_TYPES = {
    TREND_FOLLOWING: 'TREND_FOLLOWING',
    VOLATILITY_TRADING: 'VOLATILITY_TRADING'
  };

  // Parâmetros padrão do Volatility Swing (conforme especificação oficial)
  const VOLATILITY_SWING_DEFAULTS = {
    timeframe: 'Diário',
    fastSmaPeriod: 7,
    structuralSmaPeriod: 200,
    indicator: 'IFR',
    rsiPeriod: 2,
    oversoldLevel: 10,
    priceCondition: 'CLOSE_BELOW_FAST_SMA',
    structuralFilter: 'CLOSE_ABOVE_STRUCTURAL_SMA',
    recoveryExit: 'CLOSE_ABOVE_FAST_SMA',
    maxHoldingDays: 7,
    positionSizingMethod: 'FIXED_CAPITAL',
    fixedCapitalPerTrade: 10000,
    stopLossEnabled: false,
    stopLossPct: null
  };

  // Parâmetros preservados do Trend Following (não misturados)
  const TREND_FOLLOWING_DEFAULTS = {
    timeframe: 'Diário',
    trendFilter: 'EMA21_SMA50_SMA200',
    rubricMinScore: 85,
    riskBasePct: 0.005,
    maxOpenPositions: 6,
    scaleInEnabled: true,
    scaleInMaxR: 1.0,
    sellIntoStrengthEnabled: true,
    sellIntoStrengthStartR: 2.0,
    trailingStopMethod: 'EMA9_EMA21'
  };

  // Metadados dos campos para renderização e comparação humanizada
  const PARAM_METADATA = {
    VOLATILITY_TRADING: [
      { key: 'timeframe', label: 'Timeframe Operacional', type: 'select', unit: '' },
      { key: 'fastSmaPeriod', label: 'Média Curta (SMA)', type: 'number', unit: 'períodos', min: 3, max: 50 },
      { key: 'structuralSmaPeriod', label: 'Média Estrutural (SMA)', type: 'number', unit: 'períodos', min: 50, max: 500 },
      { key: 'indicator', label: 'Indicador de Oscilação', type: 'select', unit: '' },
      { key: 'rsiPeriod', label: 'Período do IFR/RSI', type: 'number', unit: 'períodos', min: 2, max: 21 },
      { key: 'oversoldLevel', label: 'Nível de Sobrevenda', type: 'number', unit: 'pts', min: 1, max: 40 },
      { key: 'priceCondition', label: 'Condição de Gatilho de Preço', type: 'select', unit: '' },
      { key: 'structuralFilter', label: 'Filtro de Tendência Primária', type: 'select', unit: '' },
      { key: 'recoveryExit', label: 'Saída por Recuperação', type: 'select', unit: '' },
      { key: 'maxHoldingDays', label: 'Saída Temporal Máxima', type: 'number', unit: 'pregões', min: 1, max: 60 },
      { key: 'positionSizingMethod', label: 'Método de Dimensionamento', type: 'select', unit: '' },
      { key: 'fixedCapitalPerTrade', label: 'Capital Alocado por Trade', type: 'currency', unit: 'R$', min: 100, max: 5000000 },
      { key: 'stopLossEnabled', label: 'Stop Técnico/Financeiro', type: 'boolean', unit: '' },
      { key: 'stopLossPct', label: 'Limite de Stop Loss', type: 'percent', unit: '%', min: 0.01, max: 0.50 }
    ],
    TREND_FOLLOWING: [
      { key: 'timeframe', label: 'Timeframe Operacional', type: 'select', unit: '' },
      { key: 'trendFilter', label: 'Alinhamento de Médias', type: 'select', unit: '' },
      { key: 'rubricMinScore', label: 'Score Mínimo da Rubric', type: 'number', unit: 'pts', min: 50, max: 100 },
      { key: 'riskBasePct', label: 'Risco Nominal Base', type: 'percent', unit: '%', min: 0.001, max: 0.05 },
      { key: 'maxOpenPositions', label: 'Limite de Posições Concorrentes', type: 'number', unit: 'posições', min: 1, max: 12 },
      { key: 'scaleInEnabled', label: 'Piramidagem Autorizada', type: 'boolean', unit: '' },
      { key: 'scaleInMaxR', label: 'Faixa Máxima de Scale-In', type: 'number', unit: 'R', min: 0.5, max: 2.0 },
      { key: 'sellIntoStrengthEnabled', label: 'Realização em Força (Sell Into Strength)', type: 'boolean', unit: '' },
      { key: 'sellIntoStrengthStartR', label: 'Gatilho de Realização Parcial', type: 'number', unit: 'R', min: 1.5, max: 5.0 },
      { key: 'trailingStopMethod', label: 'Método de Condução de Stop', type: 'select', unit: '' }
    ]
  };

  /**
   * Ordena recursivamente as chaves de um objeto para serialização determinística
   */
  function canonicalizeObject(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(canonicalizeObject);
    const sorted = {};
    Object.keys(obj).sort().forEach(k => {
      sorted[k] = canonicalizeObject(obj[k]);
    });
    return sorted;
  }

  /**
   * Calcula hash determinístico SHA-256 de parâmetros para controle de versão
   */
  function computeParametersHash(parameters) {
    const canonicalJson = JSON.stringify(canonicalizeObject(parameters || {}));
    if (typeof require === 'function') {
      try {
        const crypto = require('node:crypto');
        return crypto.createHash('sha256').update(canonicalJson).digest('hex');
      } catch (_) {}
    }
    // Fallback determinístico não-criptográfico de 64 caracteres hex
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57, h3 = 0x9e3779b9, h4 = 0x7b5d6f83;
    for (let i = 0; i < canonicalJson.length; i++) {
      const ch = canonicalJson.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
      h3 = Math.imul(h3 ^ ch, 2246822507);
      h4 = Math.imul(h4 ^ ch, 3266489909);
    }
    const toHex = (n) => (n >>> 0).toString(16).padStart(8, '0');
    return (toHex(h1) + toHex(h2) + toHex(h3) + toHex(h4) + toHex(h1 ^ h3) + toHex(h2 ^ h4) + toHex(h1 + h2) + toHex(h3 + h4)).slice(0, 64);
  }

  /**
   * Valida parâmetros de estratégia conforme regras de domínio
   */
  function validateParameters(strategyType, params = {}) {
    const normStrat = String(strategyType || '').trim().toUpperCase();
    if (![STRATEGY_TYPES.TREND_FOLLOWING, STRATEGY_TYPES.VOLATILITY_TRADING].includes(normStrat)) {
      throw new Error(`Tipo de estratégia desconhecido: "${strategyType}".`);
    }

    if (!params || typeof params !== 'object') {
      throw new Error('Parâmetros de configuração ausentes ou inválidos.');
    }

    const timeframe = params.timeframe || 'Diário';
    if (timeframe !== 'Diário' && timeframe !== 'DAILY') {
      throw new Error('O único timeframe operacional homologado para Swing Trade é o Diário.');
    }

    if (normStrat === STRATEGY_TYPES.VOLATILITY_TRADING) {
      const merged = { ...VOLATILITY_SWING_DEFAULTS, ...params };

      const fastSma = Number(merged.fastSmaPeriod);
      if (!Number.isInteger(fastSma) || fastSma < 3 || fastSma > 50) {
        throw new Error('Média rápida (fastSmaPeriod) deve ser um número inteiro entre 3 e 50 períodos.');
      }

      const structSma = Number(merged.structuralSmaPeriod);
      if (!Number.isInteger(structSma) || structSma < 50 || structSma > 500) {
        throw new Error('Média estrutural (structuralSmaPeriod) deve ser um número inteiro entre 50 e 500 períodos.');
      }

      if (fastSma >= structSma) {
        throw new Error('A média curta deve ser estritamente menor que a média estrutural.');
      }

      const rsiPeriod = Number(merged.rsiPeriod);
      if (!Number.isInteger(rsiPeriod) || rsiPeriod < 2 || rsiPeriod > 21) {
        throw new Error('Período do IFR (rsiPeriod) deve ser um número inteiro entre 2 e 21 períodos.');
      }

      const oversold = Number(merged.oversoldLevel);
      if (!Number.isFinite(oversold) || oversold < 1 || oversold > 40) {
        throw new Error('Nível de sobrevenda do IFR (oversoldLevel) deve estar entre 1 e 40.');
      }

      const maxHolding = Number(merged.maxHoldingDays);
      if (!Number.isInteger(maxHolding) || maxHolding < 1 || maxHolding > 60) {
        throw new Error('Tempo máximo de permanência (maxHoldingDays) deve estar entre 1 e 60 pregões.');
      }

      const fixedCap = Number(merged.fixedCapitalPerTrade);
      if (!Number.isFinite(fixedCap) || fixedCap < 100) {
        throw new Error('Capital fixo por operação (fixedCapitalPerTrade) deve ser de no mínimo R$ 100,00.');
      }

      if (merged.stopLossEnabled) {
        const stopPct = Number(merged.stopLossPct);
        if (!Number.isFinite(stopPct) || stopPct < 0.01 || stopPct > 0.50) {
          throw new Error('Quando o stop loss está ativo, o percentual deve estar entre 1% (0.01) e 50% (0.50).');
        }
      }

      return {
        ...VOLATILITY_SWING_DEFAULTS,
        ...merged,
        timeframe: 'Diário',
        fastSmaPeriod: fastSma,
        structuralSmaPeriod: structSma,
        rsiPeriod,
        oversoldLevel: oversold,
        maxHoldingDays: maxHolding,
        fixedCapitalPerTrade: fixedCap,
        stopLossEnabled: Boolean(merged.stopLossEnabled),
        stopLossPct: merged.stopLossEnabled ? Number(merged.stopLossPct) : null
      };
    }

    if (normStrat === STRATEGY_TYPES.TREND_FOLLOWING) {
      const merged = { ...TREND_FOLLOWING_DEFAULTS, ...params };
      const minScore = Number(merged.rubricMinScore ?? 85);
      if (!Number.isFinite(minScore) || minScore < 50 || minScore > 100) {
        throw new Error('Score mínimo da Rubric de tendência deve estar entre 50 e 100.');
      }

      const riskBase = Number(merged.riskBasePct ?? 0.005);
      if (!Number.isFinite(riskBase) || riskBase < 0.001 || riskBase > 0.05) {
        throw new Error('Risco base nominal deve estar entre 0.1% e 5.0%.');
      }

      const maxPos = Number(merged.maxOpenPositions ?? 6);
      if (!Number.isInteger(maxPos) || maxPos < 1 || maxPos > 12) {
        throw new Error('Limite de posições concorrentes deve estar entre 1 e 12.');
      }

      return {
        ...TREND_FOLLOWING_DEFAULTS,
        ...merged,
        timeframe: 'Diário',
        rubricMinScore: minScore,
        riskBasePct: riskBase,
        maxOpenPositions: maxPos,
        scaleInEnabled: merged.scaleInEnabled !== false,
        sellIntoStrengthEnabled: merged.sellIntoStrengthEnabled !== false
      };
    }

    return params;
  }

  /**
   * Retorna os 4 experimentos oficiais pré-calibrados para Volatility Trading
   */
  function getPresetExperiments(strategyType) {
    const norm = String(strategyType || '').trim().toUpperCase();
    if (norm === STRATEGY_TYPES.VOLATILITY_TRADING) {
      return [
        {
          name: 'IFR(2) / Nível 10 — Padrão Oficial',
          description: 'Configuração canônica de Volatility Swing Trade: IFR(2) <= 10, filtro SMA 200, saída na SMA 7 ou após 7 pregões.',
          isActive: true,
          parameters: {
            ...VOLATILITY_SWING_DEFAULTS,
            oversoldLevel: 10
          }
        },
        {
          name: 'IFR(2) / Nível 5 — Sobrevenda Extrema',
          description: 'Experimento conservador com filtro ultra restritivo (IFR 2 <= 5). Maior taxa de acerto e menor frequência de entradas.',
          isActive: false,
          parameters: {
            ...VOLATILITY_SWING_DEFAULTS,
            oversoldLevel: 5
          }
        },
        {
          name: 'IFR(2) / Nível 15 — Gatilho Moderado',
          description: 'Experimento intermediário com IFR(2) <= 15 para capturar correções mais brandas dentro da tendência primária.',
          isActive: false,
          parameters: {
            ...VOLATILITY_SWING_DEFAULTS,
            oversoldLevel: 15
          }
        },
        {
          name: 'IFR(2) / Nível 20 — Entrada Ampla',
          description: 'Experimento agressivo com IFR(2) <= 20. Alta frequência de sinais em mercados direcionais com rápida recuperação.',
          isActive: false,
          parameters: {
            ...VOLATILITY_SWING_DEFAULTS,
            oversoldLevel: 20
          }
        }
      ];
    }

    if (norm === STRATEGY_TYPES.TREND_FOLLOWING) {
      return [
        {
          name: 'Trend Following — Oficial Healthy Trend',
          description: 'Configuração oficial do Healthy Trend Trader: condução direcional sistemática com Rubric de 100 pontos e trailing stop.',
          isActive: true,
          parameters: { ...TREND_FOLLOWING_DEFAULTS }
        }
      ];
    }

    return [];
  }

  /**
   * Compara dois perfis e retorna as diferenças exatas entre parâmetros
   */
  function compareProfiles(profileA, profileB) {
    if (!profileA || !profileB) return [];
    const strat = profileA.strategy_type || profileA.strategyType || STRATEGY_TYPES.VOLATILITY_TRADING;
    const metadata = PARAM_METADATA[strat] || PARAM_METADATA.VOLATILITY_TRADING;

    const paramsA = profileA.parameters || {};
    const paramsB = profileB.parameters || {};

    return metadata.map(meta => {
      const valA = paramsA[meta.key];
      const valB = paramsB[meta.key];
      const isDifferent = JSON.stringify(valA) !== JSON.stringify(valB);

      let formattedA = valA != null ? String(valA) : '—';
      let formattedB = valB != null ? String(valB) : '—';

      if (meta.type === 'currency' && Number.isFinite(Number(valA))) {
        formattedA = Number(valA).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      }
      if (meta.type === 'currency' && Number.isFinite(Number(valB))) {
        formattedB = Number(valB).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
      }
      if (meta.type === 'percent' && Number.isFinite(Number(valA))) {
        formattedA = (Number(valA) * 100).toFixed(1) + '%';
      }
      if (meta.type === 'percent' && Number.isFinite(Number(valB))) {
        formattedB = (Number(valB) * 100).toFixed(1) + '%';
      }
      if (meta.type === 'boolean') {
        formattedA = valA ? 'Habilitado' : 'Desabilitado';
        formattedB = valB ? 'Habilitado' : 'Desabilitado';
      }

      return {
        key: meta.key,
        label: meta.label,
        type: meta.type,
        unit: meta.unit,
        valueA: valA,
        valueB: valB,
        formattedA,
        formattedB,
        isDifferent
      };
    });
  }

  /**
   * Gera um snapshot imutável para ser gravado em trades ou simulações
   */
  function createSnapshot(profile) {
    if (!profile || typeof profile !== 'object') return null;
    const parameters = canonicalizeObject(profile.parameters || {});
    const parametersHash = profile.parameters_hash || profile.parametersHash || computeParametersHash(parameters);

    return {
      configId: profile.id,
      configName: profile.name,
      configVersion: profile.version || '1.0',
      strategyType: profile.strategy_type || profile.strategyType,
      parametersHash,
      parameters,
      snapshotAt: new Date().toISOString()
    };
  }

  /**
   * Duplica um perfil existente para experimentação sem sobrescrever o original
   */
  function duplicateProfile(originalProfile, options = {}) {
    if (!originalProfile || typeof originalProfile !== 'object') {
      throw new Error('Perfil original inválido para duplicação.');
    }

    const strat = originalProfile.strategy_type || originalProfile.strategyType;
    const newName = options.newName || `Cópia de ${originalProfile.name}`.slice(0, 120);
    const newDesc = options.newDescription ?? (originalProfile.description ? `Derivado de ${originalProfile.name}. ${originalProfile.description}` : 'Perfil experimental para testes de sensibilidade.');
    const validatedParams = validateParameters(strat, options.parameters || originalProfile.parameters);

    return {
      strategy_type: strat,
      strategyType: strat,
      name: newName,
      description: newDesc,
      version: '1.0',
      is_active: false,
      status: 'active',
      parameters: validatedParams,
      parameters_hash: computeParametersHash(validatedParams)
    };
  }

  const StrategyConfigurationModel = {
    STRATEGY_TYPES,
    VOLATILITY_SWING_DEFAULTS,
    TREND_FOLLOWING_DEFAULTS,
    PARAM_METADATA,
    canonicalizeObject,
    computeParametersHash,
    validateParameters,
    getPresetExperiments,
    compareProfiles,
    createSnapshot,
    duplicateProfile
  };

  // Exportação isomórfica (Browser & Node.js)
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = StrategyConfigurationModel;
  }
  if (typeof root !== 'undefined') {
    root.StrategyConfigurationModel = StrategyConfigurationModel;
  }
})(typeof window !== 'undefined' ? window : globalThis);

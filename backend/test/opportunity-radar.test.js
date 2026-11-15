'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { getOpportunityRadarData } = require('../src/opportunity-radar');

test('getOpportunityRadarData retorna estrutura segura quando cache está vazio', async () => {
  const res = await getOpportunityRadarData(null);
  assert.equal(res.totalReady, 0);
  assert.deepEqual(res.items, []);
});

test('getOpportunityRadarData consolida apenas ativos prontos para entrada usando motores reais (IBOV, IFIX, BDRs)', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const cacheFile = path.join(__dirname, '..', 'data', 'market-cache.json');
  if (!fs.existsSync(cacheFile)) return;

  const cache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  const result = await getOpportunityRadarData(cache);

  assert.equal(typeof result.totalReady, 'number');
  assert.ok(Array.isArray(result.items));
  assert.equal(result.totalReady, result.items.length);

  for (const item of result.items) {
    assert.ok(['IBOV', 'IFIX', 'BDRs'].includes(item.market), `Mercado inválido: ${item.market}`);
    assert.ok(item.rsScore > 80, `RS deve ser estritamente > 80, recebido: ${item.rsScore}`);
    assert.ok(['A', 'B', 'C', 'D'].includes(item.grade), `Grade deve ser válido, recebido: ${item.grade}`);
    assert.equal(item.trend, 'Alinhada');
    assert.equal(item.status, 'Pronto para entrada');
    assert.ok(item.entry > item.stop, 'Entrada planejada deve ser maior que stop inicial');
    assert.ok(item.rr >= 1.5, 'R:R deve ser consistente');
    assert.ok(item.triggerName && item.triggerId !== 'NONE', 'Deve possuir gatilho confirmado');
    assert.ok(item.liquidity, `Ativo ${item.symbol} deve possuir metadados de liquidez`);
    assert.equal(item.liquidity.isEligible, true, `Ativo ${item.symbol} deve ter liquidez elegível no Radar`);
  }
});

test('getOpportunityRadarData expõe marketCycles canônico por mercado e reflete IFIX em Expansão independentemente de IBOV', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const cacheFile = path.join(__dirname, '..', 'data', 'market-cache.json');
  if (!fs.existsSync(cacheFile)) return;

  const rawCache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  const fiiHist = (rawCache.cycles?.fii?.benchmark?.history || []);
  const lastHealthy = fiiHist.findLast ? fiiHist.findLast(c => c.state === 'healthy') : fiiHist.slice().reverse().find(c => c.state === 'healthy');
  const cache = {
    ...rawCache,
    cycles: {
      ...rawCache.cycles,
      fii: {
        market: 'fii',
        benchmark: {
          symbol: 'IFIX',
          name: 'Índice de Fundos de Investimentos Imobiliários (IFIX)',
          returns: { m1: 1.08, m3: -0.89 },
          history: lastHealthy ? fiiHist.filter(c => c.date <= lastHealthy.date) : fiiHist
        },
        cycle: lastHealthy ? {
          state: 'healthy',
          score: 87,
          price: lastHealthy.close,
          ema10: lastHealthy.ema10,
          ema72: lastHealthy.ema72,
          above10: true,
          above72: true,
          structure: true
        } : (rawCache.cycles?.fii?.cycle || { state: 'healthy', score: 87 })
      }
    }
  };
  const result = await getOpportunityRadarData(cache);

  assert.ok(result.marketCycles, 'marketCycles deve existir no payload');
  assert.ok(result.marketCycles.ALL, 'Deve possuir ciclo ALL');
  assert.ok(result.marketCycles.IBOV, 'Deve possuir ciclo IBOV');
  assert.ok(result.marketCycles.IFIX, 'Deve possuir ciclo IFIX');
  assert.ok(result.marketCycles.BDRs, 'Deve possuir ciclo BDRs');

  // IFIX deve refletir status healthy (Expansão) com score >= 70
  assert.equal(result.marketCycles.IFIX.state, 'healthy');
  assert.equal(result.marketCycles.IFIX.marketId, 'fii');
  assert.ok(result.marketCycles.IFIX.score >= 70, `Score IFIX deve ser >= 70, recebido: ${result.marketCycles.IFIX.score}`);

  // ALL não pode ser defensivo se houver mercado saudável com oportunidades
  assert.equal(result.marketCycles.ALL.state, 'healthy');
});


test('getOpportunityRadarData suporta Volatility Trading (IFR 2) sem bloqueio por modo defesa', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const cacheFile = path.join(__dirname, '..', 'data', 'market-cache.json');
  if (!fs.existsSync(cacheFile)) return;

  const rawCache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));

  // Força todos os mercados em ciclo defensivo para provar independência do ciclo de mercado
  const defensiveCache = {
    ...rawCache,
    cycle: { state: 'defensive', score: 20 },
    cycles: {
      stock_b3: { cycle: { state: 'defensive', score: 20 } },
      fii: { cycle: { state: 'defensive', score: 20 } },
      bdr: { cycle: { state: 'defensive', score: 20 } }
    }
  };

  const result = await getOpportunityRadarData(defensiveCache, { strategy: 'VOLATILITY_TRADING' });

  assert.ok(result.volatilitySummary, 'volatilitySummary deve existir no payload');
  assert.equal(result.volatilitySummary.oversoldLevel, 10, 'Nível padrão de sobrevenda deve ser 10');
  assert.ok(typeof result.volatilitySummary.totalEvaluated === 'number');
  assert.ok(result.volatilitySummary.totalEvaluated > 0, 'Deve avaliar o universo elegível');

  assert.ok(Array.isArray(result.items), 'items deve ser array');
  assert.ok(Array.isArray(result.volatilityItems), 'volatilityItems deve existir');
  assert.ok(result.items.length > 0, 'Volatility Trading não deve ser bloqueado por ciclo de mercado defensivo');

  for (const item of result.items) {
    assert.equal(item.strategyType, 'VOLATILITY_TRADING');
    assert.ok(typeof item.ifr2 === 'number', `Ativo ${item.symbol} deve possuir IFR(2) numérico`);
    assert.equal(item.oversoldLevel, 10);
    assert.ok(typeof item.distanceToOversold === 'number');
    assert.equal(item.status, 'SOBREVENDA', 'Radar de Volatilidade deve listar apenas ativos em SOBREVENDA');
    assert.equal(item.statusCode, 'OVERSOLD');
    assert.ok(item.ifr2 <= 10, 'IFR2 deve ser <= 10');
    assert.ok(item.liquidity && item.liquidity.isEligible, `Ativo ${item.symbol} deve ser elegível no Liquidity Gate`);
  }

  // Validação estrita de categorização de mercado para Volatility Trading
  const stockUnits = new Set(['ALUP11', 'BIDI11', 'BPAC11', 'CPLE11', 'ENGI11', 'IGTI11', 'KLBN11', 'MODL11', 'RANI11', 'SANB11', 'SAPR11', 'SULA11', 'TAEE11', 'TIET11', 'BRBI11', 'ALLD11']);
  for (const item of result.volatilityItems) {
    const sym = item.symbol;
    if (/(31|32|33|34|35|39)$/.test(sym)) {
      assert.equal(item.market, 'BDRs', `BDR ${sym} deve ser classificada como BDRs`);
    } else if (sym.endsWith('11') && !stockUnits.has(sym)) {
      assert.equal(item.market, 'IFIX', `FII/Fiagro ${sym} deve ser classificado como IFIX e nunca IBOV`);
      assert.equal(item.marketCategory, 'IFIX', `FII/Fiagro ${sym} deve ter marketCategory=IFIX`);
    } else if (stockUnits.has(sym) || /(3|4|5|6|7|8)$/.test(sym)) {
      assert.equal(item.market, 'IBOV', `Ação/Unit ${sym} deve ser classificada como IBOV`);
    }
  }
});


test('getOpportunityRadarData expõe metadados de BDR e alerta de earnings na janela de 0 a 10 dias corridos', async () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const cacheFile = path.join(__dirname, '..', 'data', 'market-cache.json');
  if (!fs.existsSync(cacheFile)) return;

  const rawCache = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  const result = await getOpportunityRadarData(rawCache, { strategy: 'ALL' });

  // Procura por BDR conhecida com earnings próximos (ex: WALM34)
  const walm = result.items.find(i => i.symbol === 'WALM34');
  if (walm) {
    assert.ok(walm.bdrInfo, 'WALM34 deve possuir bdrInfo');
    assert.equal(walm.bdrInfo.isBdr, true);
    assert.equal(walm.bdrInfo.underlyingSymbol, 'WMT');
    assert.ok(walm.bdrInfo.stockChartsUrl.includes('stockcharts.com/acp/?s=WMT'));
    assert.equal(walm.hasUpcomingEarnings, true, 'WALM34 deve ter hasUpcomingEarnings true');
    assert.ok(walm.earnings, 'WALM34 deve possuir objeto earnings');
    assert.equal(walm.earnings.isWithinWindow, true);
    assert.ok(walm.earnings.daysRemaining >= 0 && walm.earnings.daysRemaining <= 10);
    assert.ok(walm.earnings.dateFormatted);
  }

  // Garante isolamento: ações brasileiras não devem possuir hasUpcomingEarnings
  const nonBdrs = result.items.filter(i => !/(31|32|33|34|35|39)$/.test(i.symbol));
  for (const item of nonBdrs) {
    assert.equal(item.hasUpcomingEarnings, undefined, 'Ação brasileira não deve ter alerta de earnings');
  }
});

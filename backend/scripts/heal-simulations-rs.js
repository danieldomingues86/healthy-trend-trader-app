/**
 * backend/scripts/heal-simulations-rs.js
 * Recupera e preenche retroativamente a Força Relativa (RS 0-99) histórica para todas
 * as operações em app.trade_simulations que foram salvas sem rs_score.
 * Utiliza dados diários B3 COTAHIST / TwelveData causalmente até a data do sinal (sem look-ahead bias).
 */

require('../src/env');
const database = require('../src/database');
const tickerChart = require('../src/ticker-chart');
const model = require('../../frontend/trade-simulator-model');

async function healSimulationsRs() {
  if (!database.configured()) {
    console.log('[heal-rs] Banco de dados não configurado.');
    return;
  }

  const b3 = tickerChart.loadB3History();
  const nasdaq = tickerChart.loadNasdaqHistory();
  const bCandles = b3.get('IBOV') || b3.get('BOVA11') || [];

  const res = await database.query(
    `SELECT id, symbol, signal_date, sector FROM app.trade_simulations WHERE rs_score IS NULL`
  );
  console.log(`[heal-rs] Registros precisando de recuperação de RS: ${res.rows.length}`);

  let calculatedCount = 0;
  let seedFallbackCount = 0;
  let unrecoverableCount = 0;

  for (const row of res.rows) {
    const sym = String(row.symbol || '').toUpperCase().trim();
    const sDate = row.signal_date instanceof Date
      ? row.signal_date.toISOString().slice(0, 10)
      : String(row.signal_date || '').slice(0, 10);

    const candles = b3.get(sym) || nasdaq.get(sym);
    let rsScore = null;

    if (candles && Array.isArray(candles) && candles.length > 0) {
      const slice = candles.filter(c => {
        const d = String(c.time || c.date || '').slice(0, 10);
        return d && d <= sDate;
      });

      if (slice.length >= 10) {
        const evalRes = model.calculateHistoricalRsScore(slice, bCandles, { evalDate: sDate });
        if (evalRes && evalRes.isAvailable && evalRes.rsScore != null) {
          rsScore = evalRes.rsScore;
          calculatedCount++;
        }
      }
    }

    if (rsScore == null && model.OFFICIAL_SEED_RS_BY_SYMBOL[sym] != null) {
      rsScore = model.OFFICIAL_SEED_RS_BY_SYMBOL[sym];
      seedFallbackCount++;
    }

    if (rsScore != null) {
      await database.query(
        `UPDATE app.trade_simulations SET rs_score = $1 WHERE id = $2`,
        [rsScore, row.id]
      );
    } else {
      unrecoverableCount++;
    }
  }

  console.log(`[heal-rs] Concluído:`);
  console.log(`  - Calculados causalmente via COTAHIST: ${calculatedCount}`);
  console.log(`  - Recuperados via calibração oficial: ${seedFallbackCount}`);
  console.log(`  - Não recuperáveis: ${unrecoverableCount}`);

  const check = await database.query(
    `SELECT count(*) as total, count(rs_score) as with_rs FROM app.trade_simulations`
  );
  console.log(`[heal-rs] Estado do banco agora:`, check.rows[0]);
}

if (require.main === module) {
  healSimulationsRs()
    .catch(console.error)
    .finally(() => database.pool && database.pool.end());
}

module.exports = { healSimulationsRs };

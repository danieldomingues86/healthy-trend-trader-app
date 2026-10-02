'use strict';

require('../src/env');
const { nasdaqRelativeStrengthEngine } = require('../src/nasdaq-relative-strength');

async function main() {
  console.log('='.repeat(70));
  console.log('  SINCRONIZAÇÃO OFICIAL EOD — NASDAQ-100 (TWELVE DATA)');
  console.log('='.repeat(70));

  const args = process.argv.slice(2);
  const symbolsArg = args.find(a => a.startsWith('--symbols='));
  const forceBackfill = args.includes('--force-backfill');
  const autoPacing = !args.includes('--no-pacing');
  const limitArg = args.find(a => a.startsWith('--limit='));

  let targetSymbols = null;
  if (symbolsArg) {
    targetSymbols = symbolsArg.split('=')[1].split(',').map(s => s.trim().toUpperCase()).filter(Boolean);
    console.log(`[cli] Símbolos específicos solicitados (${targetSymbols.length}): ${targetSymbols.join(', ')}`);
  } else if (limitArg) {
    const limit = Number(limitArg.split('=')[1]) || 10;
    const { NASDAQ_100_UNIVERSE, BENCHMARK_QQQ } = require('../src/nasdaq-universe');
    targetSymbols = [BENCHMARK_QQQ.symbol, ...NASDAQ_100_UNIVERSE.getSymbols().slice(0, limit)];
    console.log(`[cli] Amostra limitada a ${targetSymbols.length} símbolos: ${targetSymbols.join(', ')}`);
  } else {
    console.log('[cli] Executando sincronização de TODOS os 100 ativos do Nasdaq-100 + Benchmark QQQ (101 símbolos)...');
  }

  const guardStatus = await nasdaqRelativeStrengthEngine.provider.getStatus();
  console.log(`[cli] Status Twelve Data: Configurado=${guardStatus.configured} | Créditos Hoje=${guardStatus.creditsUsedToday}/${guardStatus.safeDailyLimit} | Restantes=${guardStatus.creditsRemainingToday}`);

  console.log('[cli] Iniciando coleta EOD...');
  const startTime = Date.now();

  const result = await nasdaqRelativeStrengthEngine.runEodJob({
    symbols: targetSymbols,
    forceBackfill,
    autoPacing,
    outputsize: 250 // garante SMA200 (200+ candles)
  });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(70));
  console.log('  RELATÓRIO DE SINCRONIZAÇÃO EOD NASDAQ-100');
  console.log('='.repeat(70));
  console.log(`- Status:               ${result.syncStatus || result.status}`);
  console.log(`- Sucesso:              ${result.success ? 'SIM' : 'NÃO'}`);
  console.log(`- Ativos Sincronizados: ${result.syncedCount}/${result.totalAssets}`);
  console.log(`- Data-base de Mercado: ${result.baseDate || 'N/A'}`);
  console.log(`- Créditos Consumidos:  ${result.creditsUsed}`);
  console.log(`- Duração da Operação:  ${durationSec}s`);
  console.log(`- Mensagem do Sistema:  ${result.message}`);

  if (result.missingSymbols && result.missingSymbols.length > 0) {
    console.log(`- Ativos Faltantes (${result.missingSymbols.length}): ${result.missingSymbols.slice(0, 10).join(', ')}${result.missingSymbols.length > 10 ? '...' : ''}`);
  }

  if (Array.isArray(result.auditLogs) && result.auditLogs.length > 0) {
    console.log('\nTABELA DE AUDITORIA FORENSE POR ATIVO:');
    console.log('-'.repeat(85));
    console.log(
      'TICKER'.padEnd(8) + ' | ' +
      'STATUS'.padEnd(10) + ' | ' +
      'HTTP'.padEnd(6) + ' | ' +
      'CANDLES'.padEnd(8) + ' | ' +
      'DATA'.padEnd(12) + ' | ' +
      'ERROR'
    );
    console.log('-'.repeat(85));
    for (const log of result.auditLogs) {
      console.log(
        log.ticker.padEnd(8) + ' | ' +
        log.status.padEnd(10) + ' | ' +
        String(log.httpStatus || 200).padEnd(6) + ' | ' +
        String(log.candlesCount).padEnd(8) + ' | ' +
        (log.lastDate || 'N/A').padEnd(12) + ' | ' +
        (log.error || 'OK')
      );
    }
    console.log('-'.repeat(85));
  }

  process.exit(result.success ? 0 : 1);
}

main().catch(err => {
  console.error('[cli] ERRO CRÍTICO NA SINCRONIZAÇÃO:', err);
  process.exit(1);
});

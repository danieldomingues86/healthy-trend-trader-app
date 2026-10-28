-- Migration 040: Invalida simulações com entradas tardias (executadas em T+2 ou posterior)
-- A regra mandatória do método exige que todos os gatilhos sejam avaliados exclusivamente em T+1.
-- Se a entrada não ocorreu no pregão imediatamente seguinte ao sinal, o sinal expira e a ordem é cancelada.
UPDATE app.trade_simulations
SET status = 'NOT_TRIGGERED',
    executed_entry_price = NULL,
    result_r = NULL,
    exit_date = entry_date,
    exit_reason = 'Expirou sem acionamento no candle seguinte (T+1)',
    entry_date = NULL
WHERE entry_date IS NOT NULL
  AND signal_date IS NOT NULL
  AND entry_date > (signal_date + INTERVAL '4 days');

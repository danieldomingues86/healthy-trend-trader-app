const test = require('node:test');
const assert = require('node:assert/strict');
const database = require('../src/database');
const profitCelebration = require('../src/profit-celebration');

test('profitCelebration backend: listConquests retorna lista, stats e specialReward', async () => {
  const originalQuery = database.query;
  database.query = async (sql, values) => {
    if (sql.includes('SELECT * FROM app.profit_conquests')) {
      return {
        rows: [
          {
            id: 'c-1',
            user_id: 'user-1',
            trade_id: 't-1',
            event_id: 'e-1',
            ticker: 'WINFUT',
            direction: 'long',
            realized_amount: '1250.00',
            r_multiple: '2.0',
            target_reached: true,
            plan_adhered: 'yes',
            feeling: 'pride',
            reward_title: 'Tomar um café especial',
            reward_category: 'gastronomia',
            reward_icon: '☕',
            reward_status: 'pending',
            conquest_date: new Date('2026-10-14')
          }
        ]
      };
    }
    if (sql.includes('SELECT * FROM app.profit_special_reward')) {
      return { rows: [] };
    }
    return { rows: [] };
  };

  try {
    const res = await profitCelebration.listConquests('user-1');
    assert.equal(res.conquests.length, 1);
    assert.equal(res.conquests[0].ticker, 'WINFUT');
    assert.equal(res.conquests[0].realizedAmount, 1250);
    assert.equal(res.stats.totalPlansComplied, 1);
    assert.equal(res.stats.totalRealizedProfit, 1250);
    assert.ok(res.specialReward);
    assert.equal(res.specialReward.targetConquests, 20);
  } finally {
    database.query = originalQuery;
  }
});

test('profitCelebration backend: createConquest valida payload e previne duplicidade', async () => {
  const originalQuery = database.query;
  const store = [];
  const testTradeId = crypto.randomUUID();
  const testEventId = crypto.randomUUID();

  database.query = async (sql, values) => {
    if (sql.includes('FROM app.trades')) {
      return { rows: [{ id: values[0] }], rowCount: 1 };
    }
    if (sql.includes('FROM app.trade_events')) {
      return { rows: [{ id: values[0] }], rowCount: 1 };
    }
    if (sql.includes('FROM app.profit_conquests') && sql.includes('trade_id = $2')) {
      const found = store.find(s => s.user_id === values[0] && s.trade_id === values[1] && s.event_id === values[2]);
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }
    if (sql.includes('INSERT INTO app.profit_conquests')) {
      const row = {
        id: values[0],
        user_id: values[1],
        trade_id: values[2],
        event_id: values[3],
        ticker: values[4],
        direction: values[5],
        realized_amount: values[6],
        r_multiple: values[7],
        target_reached: values[8],
        plan_adhered: values[9],
        feeling: values[10],
        reward_id: values[11],
        reward_title: values[12],
        reward_category: values[13],
        reward_icon: values[14],
        reward_reason: values[15],
        reward_status: 'pending',
        conquest_date: values[20],
        notes: values[21]
      };
      store.push(row);
      return { rows: [row], rowCount: 1 };
    }
    return { rows: [] };
  };

  try {
    // 1. Rejeita sem ticker
    await assert.rejects(
      () => profitCelebration.createConquest('user-1', { realizedAmount: 100 }),
      /Ativo \(ticker\) é obrigatório/
    );

    // 2. Rejeita com lucro negativo ou zero
    await assert.rejects(
      () => profitCelebration.createConquest('user-1', { ticker: 'PETR4', realizedAmount: -50 }),
      /Lucro realizado deve ser um valor positivo/
    );

    // 3. Sucesso na criação com recompensa padrão (não-UUID) e tradeId/eventId válidos
    const payload = {
      tradeId: testTradeId,
      eventId: testEventId,
      ticker: 'PETR4',
      realizedAmount: 980.50,
      rMultiple: 1.5,
      targetReached: true,
      planAdhered: 'yes',
      feeling: 'relief',
      rewardId: 'default-filme',
      rewardTitle: 'Assistir a um filme',
      rewardCategory: 'lazer',
      rewardIcon: '🎬'
    };
    const res = await profitCelebration.createConquest('user-1', payload);
    assert.equal(res.created, true);
    assert.equal(res.conquest.ticker, 'PETR4');
    assert.equal(res.conquest.realizedAmount, 980.5);
    assert.equal(res.conquest.tradeId, testTradeId);
    assert.equal(res.conquest.eventId, testEventId);
    assert.equal(res.conquest.rewardId, null, 'Recompensa default-filme (não-UUID) deve mapear rewardId como null');
    assert.equal(res.conquest.rewardTitle, 'Assistir a um filme');

    // 4. Idempotência: re-tentar com os mesmos tradeId e eventId não duplica
    const dupRes = await profitCelebration.createConquest('user-1', payload);
    assert.equal(dupRes.created, false);
    assert.equal(dupRes.conquest.id, res.conquest.id);
    assert.equal(store.length, 1, 'Não deve criar linha duplicada no banco');
  } finally {
    database.query = originalQuery;
  }
});

test('profitCelebration backend: gerenciamento de recompensas customizadas', async () => {
  const originalQuery = database.query;
  const rewardsStore = [];

  database.query = async (sql, values) => {
    if (sql.includes('SELECT * FROM app.rewards_catalog')) {
      return { rows: [...rewardsStore] };
    }
    if (sql.includes('INSERT INTO app.rewards_catalog')) {
      const row = {
        id: values[0],
        user_id: values[1],
        title: values[2],
        category: values[3],
        icon: values[4],
        description: values[5],
        image_url: values[6],
        is_default: false
      };
      rewardsStore.push(row);
      return { rows: [row], rowCount: 1 };
    }
    if (sql.includes('DELETE FROM app.rewards_catalog')) {
      const idx = rewardsStore.findIndex(r => r.id === values[0] && r.user_id === values[1]);
      if (idx >= 0) {
        rewardsStore.splice(idx, 1);
        return { rows: [{ id: values[0] }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }
    return { rows: [] };
  };

  try {
    // 1. Listagem inclui 8 padrões quando usuário não tem customizados
    const allRewards = await profitCelebration.listRewards('user-1');
    assert.ok(allRewards.length >= 8);

    // 2. Criação de recompensa personalizada
    const created = await profitCelebration.createReward('user-1', {
      title: 'Comprar um tênis novo',
      category: 'lazer',
      icon: '👟',
      description: 'Presentear-me pela disciplina com um tênis esportivo.'
    });
    assert.equal(created.reward.title, 'Comprar um tênis novo');
    assert.equal(rewardsStore.length, 1);

    // 3. Exclusão de recompensa
    const del = await profitCelebration.deleteReward('user-1', created.reward.id);
    assert.equal(del.deleted, true);
    assert.equal(rewardsStore.length, 0);
  } finally {
    database.query = originalQuery;
  }
});

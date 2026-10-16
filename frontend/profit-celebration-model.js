/**
 * HEALTHY TREND TRADER - PROFIT CELEBRATION MODEL
 * 
 * Domínio e regras de negócio para celebração de lucro, rituais de vitória,
 * recompensas pessoais, marcos de disciplina e painel de conquistas.
 * 
 * Suporta navegador (window.ProfitCelebrationModel) e Node.js (module.exports).
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ProfitCelebrationModel = factory();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const REWARD_CATEGORIES = [
    { id: 'todas', label: 'Todas' },
    { id: 'lazer', label: 'Lazer' },
    { id: 'gastronomia', label: 'Gastronomia' },
    { id: 'bem-estar', label: 'Bem-estar' },
    { id: 'outras', label: 'Outras' }
  ];

  const DEFAULT_REWARDS = [
    {
      id: 'default-cafe',
      title: 'Tomar um café especial',
      category: 'gastronomia',
      icon: '☕',
      description: 'Uma pausa para aproveitar o momento e celebrar sua vitória.',
      imageUrl: 'assets/rewards/cafe.jpg',
      isDefault: true
    },
    {
      id: 'default-filme',
      title: 'Assistir a um filme',
      category: 'lazer',
      icon: '🎬',
      description: 'Desconectar do mercado e curtir o tempo livre com tranquilidade.',
      imageUrl: 'assets/rewards/filme.jpg',
      isDefault: true
    },
    {
      id: 'default-refeicao',
      title: 'Fazer uma refeição especial',
      category: 'gastronomia',
      icon: '🍽️',
      description: 'Comemorar com algo saboroso fora do horário de pregão.',
      imageUrl: 'assets/rewards/refeicao.jpg',
      isDefault: true
    },
    {
      id: 'default-passeio',
      title: 'Fazer um passeio',
      category: 'lazer',
      icon: '🌲',
      description: 'Sair, caminhar e aproveitar o dia ao ar livre.',
      imageUrl: 'assets/rewards/passeio.jpg',
      isDefault: true
    },
    {
      id: 'default-descanso',
      title: 'Descansar sem pensar no mercado',
      category: 'bem-estar',
      icon: '🛏️',
      description: 'Valorizar a tranquilidade depois da operação e descansar a mente.',
      imageUrl: 'assets/rewards/descanso.jpg',
      isDefault: true
    },
    {
      id: 'default-treino',
      title: 'Fazer um treino',
      category: 'bem-estar',
      icon: '🏋️',
      description: 'Cuidar da saúde, do corpo e renovar a energia positiva.',
      imageUrl: 'assets/rewards/treino.jpg',
      isDefault: true
    },
    {
      id: 'default-livro',
      title: 'Ler um livro',
      category: 'lazer',
      icon: '📖',
      description: 'Investir tempo em aprendizado e prazer longe das telas.',
      imageUrl: 'assets/rewards/livro.jpg',
      isDefault: true
    },
    {
      id: 'default-game',
      title: 'Jogar um game',
      category: 'lazer',
      icon: '🎮',
      description: 'Relaxar, se divertir e mudar o foco mental.',
      imageUrl: 'assets/rewards/game.jpg',
      isDefault: true
    }
  ];

  const DISCIPLINE_MILESTONES = [
    { target: 1, title: 'Primeira conquista', description: 'O primeiro lucro embolsado no plano.' },
    { target: 5, title: 'Consistência inicial', description: '5 saídas executadas com fidelidade.' },
    { target: 10, title: 'Disciplina em ação', description: '10 planos cumpridos com maestria.' },
    { target: 20, title: 'Próximo marco', description: '20 operações sem deixar a ganância decidir.' },
    { target: 50, title: 'Nível avançado', description: '50 vitórias no método profissional.' },
    { target: 100, title: 'Maestria', description: '100 rituais de disciplina consolidados.' }
  ];

  const FEELING_OPTIONS = [
    { id: 'pride', label: 'Orgulho e satisfação', icon: '🌟', hint: 'Sensação de dever cumprido e processo respeitado.' },
    { id: 'relief', label: 'Alívio e tranquilidade', icon: '🕊️', hint: 'Paz mental por tirar o risco da mesa.' },
    { id: 'greed_urge', label: 'Ainda sinto vontade de ganhar mais', icon: '⚠️', hint: 'Atenção ao overtrading. Hoje sua missão já foi concluída.' }
  ];

  const PLAN_ADHERENCE_OPTIONS = [
    { id: 'yes', label: 'Sim, respeitei 100%', badgeClass: 'good', desc: 'Saída realizada exatamente no alvo planejado.' },
    { id: 'partial', label: 'Parcialmente (ajuste previsto)', badgeClass: 'warn', desc: 'Ajuste conforme leitura de risco ou trailing stop.' },
    { id: 'no', label: 'Não respeitei o plano', badgeClass: 'bad', desc: 'Saída impulsiva ou fora dos critérios do método.' }
  ];

  function round2(val) {
    const num = Number(val);
    if (!Number.isFinite(num)) return 0;
    return Math.round((num + Number.EPSILON) * 100) / 100;
  }

  function formatMoneyBR(value) {
    const num = Number(value || 0);
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatMultipleR(value) {
    if (value == null || value === '' || !Number.isFinite(Number(value))) return '—';
    const num = Number(value);
    const sign = num > 0 ? '+' : '';
    return `${sign}${num.toFixed(1).replace('.', ',')} R`;
  }

  function formatDateBR(dateStr) {
    if (!dateStr) return '—';
    const clean = String(dateStr).slice(0, 10);
    const parts = clean.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return clean;
  }

  /**
   * Avalia os marcos de disciplina a partir do número de planos cumpridos.
   */
  function calculateMilestones(compliedCount = 0) {
    const count = Math.max(0, Number(compliedCount) || 0);
    let nextMilestone = null;
    let previousMilestoneTarget = 0;

    const milestonesWithState = DISCIPLINE_MILESTONES.map((m) => {
      const isReached = count >= m.target;
      return {
        ...m,
        isReached,
        isCurrent: false
      };
    });

    for (let i = 0; i < milestonesWithState.length; i++) {
      const m = milestonesWithState[i];
      if (!m.isReached) {
        nextMilestone = m;
        m.isCurrent = true;
        break;
      }
      previousMilestoneTarget = m.target;
    }

    if (!nextMilestone) {
      // Passou do último marco (ex: 100+)
      const last = milestonesWithState[milestonesWithState.length - 1];
      nextMilestone = {
        target: last.target,
        title: 'Maestria Total',
        description: 'Todos os marcos principais de disciplina foram conquistados!'
      };
    }

    const currentTarget = nextMilestone.target;
    const progressInMilestone = Math.min(count, currentTarget);
    const remaining = Math.max(0, currentTarget - count);
    const progressPct = currentTarget > 0 ? Math.min(100, round2((count / currentTarget) * 100)) : 100;

    return {
      milestones: milestonesWithState,
      nextMilestone,
      count,
      target: currentTarget,
      progressPct,
      remaining,
      summaryText: `${count}/${currentTarget}`,
      remainingText: remaining === 0 ? 'Marco alcançado!' : `Faltam ${remaining} conquista${remaining === 1 ? '' : 's'}`
    };
  }

  /**
   * Calcula sequência de dias consecutivos com disciplina.
   * Regra estrita: um dia conta na sequência se houver ao menos 1 conquista com plano cumprido
   * ('yes' ou 'partial') e NENHUMA violação ('no') no mesmo dia.
   */
  function calculateDisciplineStreak(conquests = []) {
    if (!Array.isArray(conquests) || conquests.length === 0) {
      return { currentStreakDays: 0, recordStreakDays: 0, activeDatesCount: 0 };
    }

    const dayMap = new Map();
    conquests.forEach((c) => {
      const dateKey = String(c.conquestDate || c.conquest_date || c.createdAt || c.created_at || '').slice(0, 10);
      if (!dateKey || dateKey.length !== 10) return;
      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, { complied: 0, violated: 0 });
      }
      const entry = dayMap.get(dateKey);
      const adhered = String(c.planAdhered || c.plan_adhered || 'yes').toLowerCase();
      if (adhered === 'yes' || adhered === 'partial') {
        entry.complied++;
      } else {
        entry.violated++;
      }
    });

    const sortedDates = Array.from(dayMap.keys()).sort(); // ascendente 'YYYY-MM-DD'
    if (sortedDates.length === 0) {
      return { currentStreakDays: 0, recordStreakDays: 0, activeDatesCount: 0 };
    }

    let recordStreak = 0;
    let tempStreak = 0;

    for (let i = 0; i < sortedDates.length; i++) {
      const d = sortedDates[i];
      const stats = dayMap.get(d);
      const isDayDisciplined = stats.complied > 0 && stats.violated === 0;

      if (!isDayDisciplined) {
        tempStreak = 0;
        continue;
      }

      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(sortedDates[i - 1] + 'T12:00:00Z');
        const currDate = new Date(d + 'T12:00:00Z');
        const diffDays = Math.round((currDate.getTime() - prevDate.getTime()) / (24 * 3600 * 1000));

        // Considera dias corridos ou fins de semana entre pregões
        if (diffDays <= 3) {
          tempStreak++;
        } else {
          tempStreak = 1;
        }
      }

      if (tempStreak > recordStreak) {
        recordStreak = tempStreak;
      }
    }

    // Sequência atual (a partir do último pregão/dia registrado)
    let currentStreak = 0;
    for (let i = sortedDates.length - 1; i >= 0; i--) {
      const d = sortedDates[i];
      const stats = dayMap.get(d);
      const isDayDisciplined = stats.complied > 0 && stats.violated === 0;

      if (!isDayDisciplined) {
        break;
      }

      if (currentStreak === 0) {
        currentStreak = 1;
      } else {
        const nextDate = new Date(sortedDates[i + 1] + 'T12:00:00Z');
        const currDate = new Date(d + 'T12:00:00Z');
        const diffDays = Math.round((nextDate.getTime() - currDate.getTime()) / (24 * 3600 * 1000));
        if (diffDays <= 3) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    return {
      currentStreakDays: currentStreak,
      recordStreakDays: Math.max(recordStreak, currentStreak),
      activeDatesCount: sortedDates.length
    };
  }

  /**
   * Consolida estatísticas gerais das conquistas separando explicitamente
   * resultado financeiro de disciplina comportamental.
   */
  function calculateConquestsStats(conquests = [], options = {}) {
    const list = Array.isArray(conquests) ? conquests : [];
    const now = options.referenceDate ? new Date(options.referenceDate) : new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    const filterYear = (options.filterYear != null && options.filterYear !== 'all') ? Number(options.filterYear) : null;
    const effectiveList = filterYear
      ? list.filter((c) => {
          const dateStr = String(c.conquestDate || c.conquest_date || c.createdAt || c.created_at || '').slice(0, 4);
          return Number(dateStr) === filterYear;
        })
      : list;

    let totalRealizedProfit = 0;
    let totalRealizedProfitThisMonth = 0;
    let totalRealizedProfitLastMonth = 0;

    let totalPlansComplied = 0;
    let plansCompliedThisMonth = 0;
    let plansViolated = 0;

    let sumR = 0;
    let countR = 0;

    const rewardUsageMap = new Map();
    const monthlyMap = new Map(); // 'YYYY-MM' -> { profit, count, complied }

    // Inicializa meses do período
    if (filterYear) {
      const targetYear = filterYear;
      const endMonth = targetYear === currentYear ? Math.max(currentMonth, 0) : 11;
      for (let m = 0; m <= endMonth; m++) {
        const mStr = String(m + 1).padStart(2, '0');
        const key = `${targetYear}-${mStr}`;
        monthlyMap.set(key, { key, year: targetYear, monthNum: m + 1, profit: 0, conquestsCount: 0, compliedCount: 0 });
      }
    } else {
      // Padrão: últimos 6 meses para garantir gráfico sem buracos
      for (let i = 5; i >= 0; i--) {
        const d = new Date(currentYear, currentMonth - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${y}-${m}`;
        monthlyMap.set(key, { key, year: y, monthNum: d.getMonth() + 1, profit: 0, conquestsCount: 0, compliedCount: 0 });
      }
    }

    effectiveList.forEach((c) => {
      const realized = Number(c.realizedAmount ?? c.realized_amount ?? 0);
      if (Number.isFinite(realized)) {
        totalRealizedProfit += realized;
      }

      const r = Number(c.rMultiple ?? c.r_multiple);
      if (Number.isFinite(r)) {
        sumR += r;
        countR++;
      }

      const adhered = String(c.planAdhered || c.plan_adhered || 'yes').toLowerCase();
      const isComplied = adhered === 'yes' || adhered === 'partial';
      if (isComplied) {
        totalPlansComplied++;
      } else {
        plansViolated++;
      }

      // Recompensa
      const rewardTitle = String(c.rewardTitle || c.reward_title || 'Recompensa pessoal').trim();
      const rewardIcon = String(c.rewardIcon || c.reward_icon || '🎁').trim();
      if (rewardTitle) {
        const rewardKey = rewardTitle;
        if (!rewardUsageMap.has(rewardKey)) {
          rewardUsageMap.set(rewardKey, { title: rewardTitle, icon: rewardIcon, count: 0 });
        }
        rewardUsageMap.get(rewardKey).count++;
      }

      // Análise temporal
      const dateStr = String(c.conquestDate || c.conquest_date || c.createdAt || c.created_at || '').slice(0, 10);
      if (dateStr && dateStr.length === 10) {
        const cDate = new Date(dateStr + 'T12:00:00Z');
        const cYear = cDate.getFullYear();
        const cMonth = cDate.getMonth();

        if (cYear === currentYear && cMonth === currentMonth) {
          totalRealizedProfitThisMonth += realized;
          if (isComplied) plansCompliedThisMonth++;
        } else if (
          (cYear === currentYear && cMonth === currentMonth - 1) ||
          (currentMonth === 0 && cYear === currentYear - 1 && cMonth === 11)
        ) {
          totalRealizedProfitLastMonth += realized;
        }

        const mKey = `${cYear}-${String(cMonth + 1).padStart(2, '0')}`;
        if (!monthlyMap.has(mKey)) {
          monthlyMap.set(mKey, { key: mKey, year: cYear, monthNum: cMonth + 1, profit: 0, conquestsCount: 0, compliedCount: 0 });
        }
        const mObj = monthlyMap.get(mKey);
        mObj.profit += realized;
        mObj.conquestsCount++;
        if (isComplied) mObj.compliedCount++;
      }
    });

    totalRealizedProfit = round2(totalRealizedProfit);
    const avgR = countR > 0 ? round2(sumR / countR) : 0;

    let profitGrowthPct = 0;
    if (totalRealizedProfitLastMonth > 0) {
      profitGrowthPct = round2(((totalRealizedProfitThisMonth - totalRealizedProfitLastMonth) / totalRealizedProfitLastMonth) * 100);
    }

    const streaks = calculateDisciplineStreak(effectiveList);
    const milestones = calculateMilestones(totalPlansComplied);

    // Ranking de recompensas mais escolhidas
    const topRewards = Array.from(rewardUsageMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Evolução mensal ordenada cronologicamente
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthlyEvolution = Array.from(monthlyMap.values())
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((item) => ({
        ...item,
        profit: round2(item.profit),
        profitFormatted: formatMoneyBR(item.profit),
        label: `${monthNames[item.monthNum - 1]}`
      }));

    const hasAnyMonthlyData = monthlyEvolution.some(m => m.profit > 0 || m.conquestsCount > 0);

    return {
      filterYear,
      totalConquests: effectiveList.length,
      totalPlansComplied,
      plansCompliedThisMonth,
      plansViolated,
      disciplineRatePct: effectiveList.length > 0 ? round2((totalPlansComplied / effectiveList.length) * 100) : 100,
      totalRealizedProfit,
      totalRealizedProfitFormatted: formatMoneyBR(totalRealizedProfit),
      totalRealizedProfitThisMonth: round2(totalRealizedProfitThisMonth),
      totalRealizedProfitThisMonthFormatted: formatMoneyBR(totalRealizedProfitThisMonth),
      profitGrowthPct,
      currentStreakDays: streaks.currentStreakDays,
      recordStreakDays: streaks.recordStreakDays,
      avgR,
      avgRFormatted: formatMultipleR(avgR),
      milestones,
      topRewards,
      monthlyEvolution,
      hasAnyMonthlyData
    };
  }

  /**
   * Valida payload de uma conquista antes de persistir
   */
  function validateConquestPayload(payload = {}) {
    const errors = [];
    if (!payload.ticker && !payload.asset) {
      errors.push('Ativo (ticker) é obrigatório.');
    }
    const amount = Number(payload.realizedAmount ?? payload.realized_amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      errors.push('Lucro realizado deve ser um valor positivo para celebrar vitória.');
    }
    const adhered = String(payload.planAdhered ?? payload.plan_adhered ?? 'yes').toLowerCase();
    if (!['yes', 'partial', 'no'].includes(adhered)) {
      errors.push('Cumprimento do plano deve ser: Sim, Parcialmente ou Não.');
    }
    const feeling = String(payload.feeling ?? 'pride').toLowerCase();
    if (!['pride', 'relief', 'greed_urge'].includes(feeling)) {
      errors.push('Sentimento informado inválido.');
    }
    const rewardTitle = String(payload.rewardTitle ?? payload.reward_title ?? '').trim();
    if (!rewardTitle || rewardTitle.length < 2) {
      errors.push('Recompensa escolhida é obrigatória (mínimo 2 caracteres).');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Valida payload de criação/edição de recompensa personalizada
   */
  function validateRewardPayload(payload = {}) {
    const errors = [];
    const title = String(payload.title || '').trim();
    if (!title || title.length < 2 || title.length > 120) {
      errors.push('Título da recompensa deve conter entre 2 e 120 caracteres.');
    }
    const category = String(payload.category || 'outras').toLowerCase();
    if (!['lazer', 'gastronomia', 'bem-estar', 'outras'].includes(category)) {
      errors.push('Categoria de recompensa inválida.');
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  return {
    REWARD_CATEGORIES,
    DEFAULT_REWARDS,
    DISCIPLINE_MILESTONES,
    FEELING_OPTIONS,
    PLAN_ADHERENCE_OPTIONS,
    round2,
    formatMoneyBR,
    formatMultipleR,
    formatDateBR,
    calculateMilestones,
    calculateDisciplineStreak,
    calculateConquestsStats,
    validateConquestPayload,
    validateRewardPayload
  };
});

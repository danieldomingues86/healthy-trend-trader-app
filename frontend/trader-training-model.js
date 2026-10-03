(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.TraderTrainingModel = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /*
   * Treinamento de Trader — lógica pura (sem DOM).
   * Um objetivo comportamental ativo por vez, medido pelos registros feitos
   * no Diário. "Não se aplicava" nunca entra no denominador da aderência.
   */

  // Superfícies onde o lembrete contextual pode aparecer.
  // journal = Diário (avaliação por operação) · newtrade = abertura/confirmação
  // risk = Position Sizing · positions = gestão da posição
  // dailyroutine = rotina de análise · charts = Gráficos
  const CATEGORIES = {
    execution: { id: 'execution', label: 'Execução', surfaces: ['newtrade', 'journal'] },
    psychology: { id: 'psychology', label: 'Psicologia', surfaces: ['journal'] },
    process: { id: 'process', label: 'Processo', surfaces: ['journal', 'dailyroutine'] },
    risk: { id: 'risk', label: 'Gestão de Risco', surfaces: ['newtrade', 'risk', 'positions', 'journal'] }
  };
  const CATEGORY_ORDER = ['execution', 'psychology', 'process', 'risk'];

  const CATALOG = [
    {
      id: 'exec-trigger',
      category: 'execution',
      title: 'Executar o gatilho da operação sempre corretamente.',
      focus: 'Execute o gatilho exatamente como definido no seu plano.',
      description: 'O gatilho técnico sinaliza o momento exato em que a vantagem probabilística se ativa. Entrar antes gera ansiedade; entrar depois prejudica a assimetria risco/retorno.',
      criteria: 'A entrada ocorreu estritamente no nível de gatilho validado pelo setup (ex: violação da máxima/mínima de referência).'
    },
    {
      id: 'exec-no-anticipate',
      category: 'execution',
      title: 'Não antecipar a entrada.',
      focus: 'Não antecipe a entrada. Aguarde o gatilho definido no seu plano.',
      description: 'Antecipar o rompimento ou confirmação transforma uma operação estatística em tentativa de adivinhação sem suporte do fluxo comprador.',
      criteria: 'Aguardou a ativação formal do gatilho sem comprar ou vender antes do preço atingir o patamar planejado.'
    },
    {
      id: 'exec-confirmation',
      category: 'execution',
      title: 'Não entrar sem confirmação.',
      focus: 'Aguarde a confirmação completa antes de executar.',
      description: 'A confirmação é o testemunho técnico de que os participantes dominantes estão dispostos a defender aquele nível de preço.',
      criteria: 'Todos os critérios de confirmação pré-definidos (fechamento de barra, volume ou tick) foram confirmados antes de enviar a ordem.'
    },
    {
      id: 'exec-entry-point',
      category: 'execution',
      title: 'Respeitar o ponto de entrada planejado.',
      focus: 'Entre somente no preço planejado. Não persiga o ativo.',
      description: 'Se o ativo já andou e se distanciou da entrada, perseguir o preço aumenta o stop financeiro em R e destrói o payoff do sistema.',
      criteria: 'A ordem foi preenchida na faixa estipulada de preço de entrada, sem tolerância a perseguição desenfreada.'
    },
    {
      id: 'exec-initial-stop',
      category: 'execution',
      title: 'Respeitar o stop inicial.',
      focus: 'Respeite o stop definido antes da entrada.',
      surfaces: ['newtrade', 'positions', 'journal'],
      description: 'O stop inicial é a muralha de proteção do capital contra a ruína matemática. Movê-lo para trás durante o trade destrói a disciplina.',
      criteria: 'O stop permaneceu no nível técnico planejado e foi honrado sem hesitação ou cancelamento manual se atingido.'
    },
    {
      id: 'exec-no-add',
      category: 'execution',
      title: 'Não aumentar posição fora da regra.',
      focus: 'Só aumente a posição quando a regra de Scale-In permitir.',
      surfaces: ['newtrade', 'positions', 'journal'],
      description: 'Fazer preço médio em posição perdedora é o comportamento número um de destruição de contas. Adições só podem ocorrer na força e com stop no zero.',
      criteria: 'Nenhum lote foi adicionado a posições negativas ou em desacordo com as regras de piramidação da política de risco.'
    },

    {
      id: 'psy-fomo',
      category: 'psychology',
      title: 'Não entrar por FOMO.',
      focus: 'Se a oportunidade passou, deixe ir. Outra virá dentro do seu plano.',
      surfaces: ['newtrade', 'journal'],
      description: 'O medo de ficar de fora (FOMO) seduz o trader a entrar no topo de impulsos esticados. O mercado opera em ciclos infinitos de oportunidades.',
      criteria: 'A decisão de entrar foi 100% fruto de planejamento sereno pré-mercado, sem impulsos gerados por barras repentinas.'
    },
    {
      id: 'psy-recover',
      category: 'psychology',
      title: 'Não tentar recuperar uma perda.',
      focus: 'O próximo trade não tem a missão de recuperar o anterior.',
      surfaces: ['newtrade', 'journal'],
      description: 'A pressa em anular uma perda recente gera superalavancagem e perda de critério. Cada trade é um evento probabilístico independente.',
      criteria: 'A postura e dimensionamento do trade foram neutros, desvinculados do saldo ou resultado da operação anterior.'
    },
    {
      id: 'psy-revenge',
      category: 'psychology',
      title: 'Não operar por vingança.',
      focus: 'Opere o plano, não a emoção do último resultado.',
      surfaces: ['newtrade', 'journal'],
      description: 'A vingança contra o ativo ou contra o mercado é uma ilusão egóica perigosa. O mercado é impessoal e não se importa com sua posição.',
      criteria: 'Não operou por frustração e respeitou uma pausa consciente antes de planejar nova intervenção no mercado.'
    },
    {
      id: 'psy-accept-loss',
      category: 'psychology',
      title: 'Aceitar uma operação perdedora.',
      focus: 'Perder dentro do plano faz parte do processo.',
      surfaces: ['positions', 'journal'],
      description: 'Stops são custos operacionais normais de um sistema de tendência. Aceitá-los em paz é o que permite lucrar alto nas grandes altas.',
      criteria: 'Aceitou a saída no stop sem irritação, sem alterar o humor e sem alterar o plano operacional do dia.'
    },
    {
      id: 'psy-interfere',
      category: 'psychology',
      title: 'Não interferir emocionalmente na operação.',
      focus: 'Deixe o plano trabalhar. Intervenha apenas pelas regras.',
      surfaces: ['positions', 'journal'],
      description: 'Ficar mexendo em ordens durante a flutuação intradiária por medo de devolução corrói o edge estatístico e aumenta a fadiga mental.',
      criteria: 'As saídas ocorreram unicamente pelos critérios pré-estabelecidos (alvo, stop técnico ou saída no fechamento), sem intervenção ansiosa.'
    },
    {
      id: 'psy-premature-profit',
      category: 'psychology',
      title: 'Não realizar lucro prematuramente por medo.',
      focus: 'Respeite seu plano de saída. Não realize lucro por medo.',
      surfaces: ['positions', 'journal'],
      description: 'Cortar lucros pequenos por alívio psicológico impede a captura de movimentos de 3R a 10R que pagam a série de stops.',
      criteria: 'Manteve a posição aberta até o gatilho de saída do sistema ser atingido, resistindo à tentação de realizar antes.'
    },

    {
      id: 'proc-checklist',
      category: 'process',
      title: 'Fazer o checklist antes da entrada.',
      focus: 'Complete o checklist antes de qualquer entrada.',
      surfaces: ['newtrade', 'journal', 'dailyroutine'],
      description: 'O checklist é o cinto de segurança do trader sistemático. Ele impede que o entusiasmo momentâneo passe por cima de falhas técnicas graves.',
      criteria: 'Todos os itens de tendência, ciclo de mercado e contexto foram formalmente conferidos antes da ordem ser disparada.'
    },
    {
      id: 'proc-register',
      category: 'process',
      title: 'Registrar a operação imediatamente.',
      focus: 'Registre a operação no Diário logo após executar.',
      surfaces: ['newtrade', 'journal'],
      description: 'O registro imediato captura os pensamentos e o contexto com fidelidade, antes que a mente comece a justificar ou esquecer detalhes.',
      criteria: 'A operação e suas motivações foram documentadas no Diário de Trades logo após a abertura.'
    },
    {
      id: 'proc-plan',
      category: 'process',
      title: 'Seguir o plano definido antes da entrada.',
      focus: 'Siga o plano que você definiu antes da entrada.',
      surfaces: ['newtrade', 'journal'],
      description: 'O plano elaborado fora do pregão é racional; improvisações no meio da batalha são quase sempre emocionais. Siga o roteiro.',
      criteria: 'A execução seguiu exatamente os preços, alvos, dimensionamento e regras traçadas no planejamento pré-trade.'
    },
    {
      id: 'proc-journal-analysis',
      category: 'process',
      title: 'Analisar somente no Diário.',
      focus: 'Faça sua análise no Diário, com calma e registro.',
      surfaces: ['journal', 'charts'],
      description: 'A avaliação analítica de erros e acertos deve ser feita no Diário com distanciamento temporal, não no calor do calor dos preços.',
      criteria: 'A análise da qualidade da decisão foi conduzida na ferramenta de Diário com anotações objetivas e sem julgamentos destrutivos.'
    },
    {
      id: 'proc-chart-watching',
      category: 'process',
      title: 'Não olhar o gráfico excessivamente.',
      focus: 'Você já tem um plano. Evite olhar o gráfico em excesso.',
      surfaces: ['journal', 'charts'],
      description: 'Vigiar cada oscilação de centavos sobrecarrega a dopamina e incita decisões intempestivas. Confie no seu alarme e no seu stop.',
      criteria: 'Monitorou os gráficos apenas nos momentos de tomada de decisão (ex: fechamento de barra diária ou alertas programados).'
    },
    {
      id: 'proc-routine',
      category: 'process',
      title: 'Respeitar minha rotina de análise.',
      focus: 'Cumpra sua rotina de análise antes de operar.',
      surfaces: ['dailyroutine', 'journal'],
      description: 'O sucesso no pregão é consequência direta do trabalho prévio de preparação do ambiente, revisão de notícias e estudo dos papéis.',
      criteria: 'Executou a rotina matinal completa de preparação antes de iniciar qualquer leitura ou envio de ordens.'
    },

    {
      id: 'risk-sizing',
      category: 'risk',
      title: 'Respeitar o Position Sizing.',
      focus: 'Use exatamente a quantidade calculada pelo Position Sizing.',
      description: 'O método de 3 camadas calcula o menor tamanho seguro entre Stop, ATR e Limite de Capital. Alterar a mão é violar a matemática da sobrevivência.',
      criteria: 'A quantidade executada foi exatamente a determinada pelo motor de risco, sem arredondamentos arbitrários para cima.'
    },
    {
      id: 'risk-per-trade',
      category: 'risk',
      title: 'Respeitar o risco por operação.',
      focus: 'Não ultrapasse o risco por operação definido na sua política.',
      description: 'O risco nominal por operação garante que uma sequência de 5 ou 10 perdas não comprometa irremediavelmente a capacidade financeira da conta.',
      criteria: 'O valor financeiro em risco na entrada não excedeu a porcentagem máxima estipulada pela sua Política de Risco.'
    },
    {
      id: 'risk-no-add',
      category: 'risk',
      title: 'Não aumentar posição fora da regra.',
      focus: 'Só aumente a posição quando a regra de Scale-In permitir.',
      description: 'Adicionar lote sem o trade ter atingido +1R e sem breakeven transforma uma operação controlada em uma bomba de risco desnecessário.',
      criteria: 'Seguiu rigidamente os critérios de elegibilidade para Scale-In aprovados pelo sistema.'
    },
    {
      id: 'risk-heat',
      category: 'risk',
      title: 'Respeitar o Heat máximo do portfólio.',
      focus: 'Confira o Heat da carteira antes de abrir uma nova posição.',
      description: 'O calor agregado da carteira protege contra choques sistêmicos de mercado que atingem simultaneamente vários ativos correlacionados.',
      criteria: 'Verificou se a abertura de mais uma posição manteria o Heat total da carteira dentro do teto seguro estabelecido.'
    },
    {
      id: 'risk-exit-plan',
      category: 'risk',
      title: 'Respeitar o plano de saída.',
      focus: 'Siga o plano de saída definido antes da entrada.',
      surfaces: ['positions', 'newtrade', 'journal'],
      description: 'Saber onde sair antes de entrar elimina a paralisia decisória no momento em que o mercado acelera a favor ou contra sua posição.',
      criteria: 'A saída foi executada em conformidade integral com a estratégia de encerramento desenhada no plano inicial.'
    }
  ];

  const DURATION_OPTIONS = [7, 14, 21, 30];
  const RECOMMENDED_DURATION = 21;
  const TARGET_OPTIONS = [70, 80, 90, 95];
  const RECOMMENDED_TARGET = 90;
  const DURATION_LIMITS = { min: 3, max: 180 };
  const TARGET_LIMITS = { min: 50, max: 100 };
  const ASSESSMENTS = ['correct', 'incorrect', 'not_applicable'];
  const OUTCOMES = ['gain', 'loss', 'breakeven', 'open'];
  const STATUSES = ['active', 'consolidated', 'developing', 'switched'];
  const DEFAULT_FOCUS_HINT = 'Antes de entrar, lembre-se do comportamento que você está treinando.';

  function invalid(message) {
    const error = new Error(message);
    error.status = 400;
    return error;
  }

  // ---------- Datas (sempre YYYY-MM-DD, aritmética em UTC) ----------
  const pad = (n) => String(n).padStart(2, '0');

  function toDateOnly(input) {
    if (!input) return null;
    if (input instanceof Date) {
      if (Number.isNaN(input.getTime())) return null;
      return `${input.getFullYear()}-${pad(input.getMonth() + 1)}-${pad(input.getDate())}`;
    }
    const match = String(input).trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!match) return null;
    const [, y, m, d] = match;
    const check = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
    if (check.getUTCFullYear() !== Number(y) || check.getUTCMonth() !== Number(m) - 1 || check.getUTCDate() !== Number(d)) return null;
    return `${y}-${m}-${d}`;
  }

  function todayIso(now = new Date()) {
    return toDateOnly(now);
  }

  function utc(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  }

  function addDays(iso, days) {
    const base = toDateOnly(iso);
    if (!base) return null;
    return new Date(utc(base) + days * 86400000).toISOString().slice(0, 10);
  }

  function daysBetween(fromIso, toIso) {
    const a = toDateOnly(fromIso);
    const b = toDateOnly(toIso);
    if (!a || !b) return 0;
    return Math.round((utc(b) - utc(a)) / 86400000);
  }

  function formatDate(iso, withYear = true) {
    const value = toDateOnly(iso);
    if (!value) return '—';
    const [y, m, d] = value.split('-');
    return withYear ? `${d}/${m}/${y}` : `${d}/${m}`;
  }

  // ---------- Catálogo ----------
  function catalogById(id) {
    return CATALOG.find((item) => item.id === id) || null;
  }

  function catalogByCategory(category) {
    return CATALOG.filter((item) => item.category === category);
  }

  function categoryLabel(category) {
    return CATEGORIES[category]?.label || 'Personalizado';
  }

  // ---------- Normalização ----------
  function integerInRange(value, { min, max }, message) {
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) throw invalid(message);
    return n;
  }

  function normalizeGoal(payload = {}, today = todayIso()) {
    const startDate = toDateOnly(today);
    if (!startDate) throw invalid('Data de início inválida.');
    const catalogId = String(payload.catalogId || '').trim();
    let title;
    let category;
    if (catalogId) {
      const entry = catalogById(catalogId);
      if (!entry) throw invalid('Objetivo de treinamento não reconhecido.');
      title = entry.title;
      category = entry.category;
    } else {
      title = String(payload.title || '').replace(/\s+/g, ' ').trim();
      if (title.length < 3) throw invalid('Descreva o comportamento que deseja treinar.');
      if (title.length > 160) throw invalid('O objetivo deve ter no máximo 160 caracteres.');
      category = String(payload.category || '').trim();
      if (!CATEGORIES[category]) throw invalid('Escolha a categoria do objetivo personalizado.');
    }
    const durationDays = integerInRange(payload.durationDays, DURATION_LIMITS, `O período deve ter entre ${DURATION_LIMITS.min} e ${DURATION_LIMITS.max} dias.`);
    const targetPct = integerInRange(payload.targetPct, TARGET_LIMITS, `A meta de consistência deve ficar entre ${TARGET_LIMITS.min}% e ${TARGET_LIMITS.max}%.`);
    return { catalogId, title, category, startDate, endDate: addDays(startDate, durationDays), durationDays, targetPct };
  }

  function normalizeRecord(payload = {}) {
    const sourceRef = String(payload.sourceRef || '').trim();
    if (!/^[A-Za-z0-9_.:-]{1,120}$/.test(sourceRef)) throw invalid('Operação do Diário inválida.');
    const recordDate = toDateOnly(payload.recordDate);
    if (!recordDate) throw invalid('Data da operação inválida.');
    const assessment = String(payload.assessment || '').trim();
    if (!ASSESSMENTS.includes(assessment)) throw invalid('Escolha como você se saiu nesta operação.');
    const outcome = OUTCOMES.includes(payload.outcome) ? payload.outcome : 'open';
    const rMultiple = parseRMultiple(payload.rMultiple);
    const ticker = String(payload.ticker || '').toUpperCase().replace(/[^A-Z0-9.]/g, '').slice(0, 12);
    const note = String(payload.note || '').trim().slice(0, 500);
    return { sourceRef, recordDate, ticker, outcome, rMultiple, assessment, note };
  }

  function isRecordInPeriod(goal, recordDate) {
    const date = toDateOnly(recordDate);
    if (!goal || !date) return false;
    return date >= goal.startDate && date <= goal.endDate;
  }

  // ---------- Resultado financeiro (informativo, nunca entra na aderência) ----------
  function parseRMultiple(value) {
    if (value == null || value === '') return null;
    const n = typeof value === 'number' ? value : Number(String(value).replace(/\s|R|r|\+/g, '').replace(',', '.'));
    if (!Number.isFinite(n) || Math.abs(n) > 1000) return null;
    return Math.round(n * 100) / 100;
  }

  function outcomeFromR(r) {
    if (r == null || !Number.isFinite(r)) return 'open';
    if (r > 0.0001) return 'gain';
    if (r < -0.0001) return 'loss';
    return 'breakeven';
  }

  /**
   * Resolve resultado/R de uma operação do Diário:
   * 1) R registrado na própria operação do Diário;
   * 2) posição real encerrada do mesmo ativo no mesmo dia (via analyzer);
   * 3) posição real aberta → "Em aberto".
   */
  function resolveOutcome({ journalTrade, recordDate, realTrades = [], analyze, entryDate, closeDate } = {}) {
    const journalR = parseRMultiple(journalTrade?.management?.rMultiple);
    if (journalR != null) return { outcome: outcomeFromR(journalR), rMultiple: journalR };
    const ticker = String(journalTrade?.ticker || '').toUpperCase();
    if (ticker && Array.isArray(realTrades)) {
      const match = realTrades.find((trade) => {
        if (String(trade?.ticker || '').toUpperCase() !== ticker || trade?.status === 'planned') return false;
        const opened = typeof entryDate === 'function' ? entryDate(trade) : null;
        const closed = typeof closeDate === 'function' ? closeDate(trade) : null;
        return opened === recordDate || closed === recordDate;
      });
      if (match) {
        if (match.status === 'closed' && typeof analyze === 'function') {
          const analyzed = analyze(match);
          const r = analyzed?.r == null ? null : Math.round(analyzed.r * 100) / 100;
          if (r != null) return { outcome: outcomeFromR(r), rMultiple: r };
          if (Number.isFinite(analyzed?.result)) return { outcome: outcomeFromR(analyzed.result), rMultiple: null };
        }
        return { outcome: 'open', rMultiple: null };
      }
    }
    return { outcome: 'open', rMultiple: null };
  }

  // ---------- Medição ----------
  function computeAdherence(records = []) {
    const counts = { correct: 0, incorrect: 0, notApplicable: 0 };
    records.forEach((record) => {
      if (record?.assessment === 'correct') counts.correct += 1;
      else if (record?.assessment === 'incorrect') counts.incorrect += 1;
      else if (record?.assessment === 'not_applicable') counts.notApplicable += 1;
    });
    const applicable = counts.correct + counts.incorrect;
    const pct = applicable ? Math.round((counts.correct / applicable) * 1000) / 10 : null;
    return { ...counts, applicable, total: applicable + counts.notApplicable, pct };
  }

  function weeklyEvolution(goal, records = []) {
    if (!goal?.startDate || !goal?.endDate) return [];
    const totalDays = Math.max(1, daysBetween(goal.startDate, goal.endDate));
    const weekCount = Math.max(1, Math.ceil(totalDays / 7));
    const buckets = Array.from({ length: weekCount }, () => []);
    records.forEach((record) => {
      if (!isRecordInPeriod(goal, record?.recordDate)) return;
      const index = Math.min(weekCount - 1, Math.floor(daysBetween(goal.startDate, record.recordDate) / 7));
      buckets[index].push(record);
    });
    return buckets.map((items, index) => {
      const startDate = addDays(goal.startDate, index * 7);
      const lastDay = addDays(startDate, 6);
      return {
        index,
        label: `Semana ${index + 1}`,
        startDate,
        endDate: lastDay > goal.endDate ? goal.endDate : lastDay,
        ...computeAdherence(items)
      };
    });
  }

  function formatPct(value) {
    if (value == null) return '—';
    return `${Number.isInteger(value) ? value : value.toFixed(1).replace('.', ',')}%`;
  }

  function evolutionInsight(weeks = []) {
    const measured = weeks.filter((week) => week.pct != null);
    if (!measured.length) {
      return { tone: 'empty', deltaPp: null, title: 'Seu treinamento começou', message: 'Registre seu comportamento no Diário para acompanhar sua evolução.' };
    }
    if (measured.length === 1) {
      const only = measured[0];
      return { tone: 'single', deltaPp: null, title: 'Primeira medição registrada', message: `Sua aderência na ${only.label} foi de ${formatPct(only.pct)}. Continue registrando para comparar a evolução semana a semana.` };
    }
    const first = measured[0];
    const last = measured[measured.length - 1];
    const deltaPp = Math.round((last.pct - first.pct) * 10) / 10;
    const abs = Math.abs(deltaPp);
    const ppLabel = `${Number.isInteger(abs) ? abs : abs.toFixed(1).replace('.', ',')} ${abs === 1 ? 'ponto percentual' : 'pontos percentuais'}`;
    if (deltaPp > 0) return { tone: 'up', deltaPp, title: 'Você está evoluindo!', message: `Sua aderência aumentou ${ppLabel} desde o início do treinamento.`, highlight: ppLabel };
    if (deltaPp < 0) return { tone: 'down', deltaPp, title: 'Atenção ao comportamento', message: `Sua aderência caiu ${ppLabel} desde o início do treinamento. Revise as operações marcadas como incorretas.`, highlight: ppLabel };
    return { tone: 'flat', deltaPp, title: 'Consistência estável', message: `Sua aderência se manteve em ${formatPct(last.pct)} desde o início do treinamento.` };
  }

  function periodProgress(goal, today = todayIso()) {
    if (!goal?.startDate || !goal?.endDate) return { totalDays: 0, elapsed: 0, remaining: 0, pct: 0, ended: false, notStarted: false };
    const totalDays = Math.max(0, daysBetween(goal.startDate, goal.endDate));
    const raw = daysBetween(goal.startDate, today);
    const elapsed = Math.min(totalDays, Math.max(0, raw));
    const remaining = Math.max(0, totalDays - elapsed);
    return {
      totalDays,
      elapsed,
      remaining,
      pct: totalDays ? Math.round((elapsed / totalDays) * 1000) / 10 : 100,
      ended: toDateOnly(today) > goal.endDate,
      notStarted: raw < 0
    };
  }

  function motivation(adherence, targetPct) {
    if (!adherence || adherence.pct == null) {
      return { tone: 'neutral', icon: '🎯', title: 'Comece a medir', message: 'Registre seu comportamento no Diário a cada operação.' };
    }
    if (adherence.pct >= targetPct) {
      return { tone: 'good', icon: '🏆', title: 'Mantenha o foco!', message: 'Você está no caminho para alcançar sua meta.' };
    }
    if (adherence.pct >= targetPct - 10) {
      return { tone: 'warn', icon: '💪', title: 'Você está perto da meta', message: 'Cada operação conta. Releia seu objetivo antes de entrar.' };
    }
    return { tone: 'warn', icon: '🔄', title: 'Retome o foco', message: 'Treinar é repetir. Releia seu objetivo antes de cada entrada.' };
  }

  function conclusion(goal, records = [], today = todayIso()) {
    if (!goal || goal.status !== 'active') return null;
    if (!periodProgress(goal, today).ended) return null;
    const adherence = computeAdherence(records);
    return { reached: adherence.pct != null && adherence.pct >= goal.targetPct, adherence, targetPct: goal.targetPct };
  }

  // Status final atribuído quando o objetivo deixa de ser o ativo.
  function finalStatus(goal, records = [], today = todayIso()) {
    if (!periodProgress(goal, today).ended) return 'switched';
    const adherence = computeAdherence(records);
    return adherence.pct != null && adherence.pct >= goal.targetPct ? 'consolidated' : 'developing';
  }

  // ---------- Contexto (onde e o que lembrar) ----------
  function surfacesFor(goal) {
    if (!goal) return [];
    const entry = goal.catalogId ? catalogById(goal.catalogId) : null;
    if (entry?.surfaces) return entry.surfaces.slice();
    return (CATEGORIES[goal.category]?.surfaces || ['journal']).slice();
  }

  function shouldShowOn(goal, surface) {
    return Boolean(goal && goal.status === 'active' && surfacesFor(goal).includes(surface));
  }

  function focusMessageFor(goal) {
    if (!goal) return '';
    const entry = goal.catalogId ? catalogById(goal.catalogId) : null;
    return entry?.focus || goal.title;
  }

  // ---------- Rótulos ----------
  const OUTCOME_LABELS = { gain: 'Lucro', loss: 'Perda', breakeven: 'Zero a zero', open: 'Em aberto' };
  const ASSESSMENT_LABELS = { correct: 'Correto', incorrect: 'Incorreto', not_applicable: 'Não se aplicava' };
  const STATUS_LABELS = { active: 'Em treinamento', consolidated: 'Consolidado', developing: 'Em desenvolvimento', switched: 'Interrompido' };

  const outcomeLabel = (value) => OUTCOME_LABELS[value] || OUTCOME_LABELS.open;
  const assessmentLabel = (value) => ASSESSMENT_LABELS[value] || '—';
  const statusLabel = (value) => STATUS_LABELS[value] || '—';

  function formatR(value) {
    if (value == null || !Number.isFinite(Number(value))) return '—';
    const n = Number(value);
    return `${n > 0 ? '+' : ''}${n.toFixed(1).replace('.', ',')}R`;
  }

  return {
    CATEGORIES,
    CATEGORY_ORDER,
    CATALOG,
    DURATION_OPTIONS,
    RECOMMENDED_DURATION,
    TARGET_OPTIONS,
    RECOMMENDED_TARGET,
    DURATION_LIMITS,
    TARGET_LIMITS,
    ASSESSMENTS,
    OUTCOMES,
    STATUSES,
    DEFAULT_FOCUS_HINT,
    toDateOnly,
    todayIso,
    addDays,
    daysBetween,
    formatDate,
    catalogById,
    catalogByCategory,
    categoryLabel,
    normalizeGoal,
    normalizeRecord,
    isRecordInPeriod,
    parseRMultiple,
    outcomeFromR,
    resolveOutcome,
    computeAdherence,
    weeklyEvolution,
    evolutionInsight,
    periodProgress,
    motivation,
    conclusion,
    finalStatus,
    surfacesFor,
    shouldShowOn,
    focusMessageFor,
    outcomeLabel,
    assessmentLabel,
    statusLabel,
    formatPct,
    formatR
  };
});

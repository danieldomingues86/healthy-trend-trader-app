(function () {
  'use strict';
  const root = document.getElementById('emotionalintelligence'), M = window.EmotionalIntelligenceModel;
  if (!root || !M) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const en = () => window.appLanguage === 'en-US', t = (pt, english) => en() ? english : pt;
  const format = (value, digits = 1) => value == null ? '—' : Number(value).toLocaleString(en() ? 'en-US' : 'pt-BR', { maximumFractionDigits: digits });
  const pct = value => value == null ? '—' : `${format(value * 100, 0)}%`;
  const rLabel = value => value == null ? t('R não disponível', 'R unavailable') : `${value > 0 ? '+' : ''}${format(value, 2)}R`;
  const dateLabel = (date, short = false) => new Date(`${date}T12:00:00`).toLocaleDateString(en() ? 'en-US' : 'pt-BR', short ? { day: '2-digit', month: '2-digit' } : { day: '2-digit', month: 'long', year: 'numeric' });
  const stateNames = { Calmo: 'Calm', Paciente: 'Patient', Disciplinado: 'Disciplined', Ansioso: 'Anxious', Confiante: 'Confident', Frustrado: 'Frustrated', Impulsivo: 'Impulsive', 'Raiva / Irritado': 'Angry / Irritated', Medroso: 'Fearful', Ganancioso: 'Greedy' };
  const statesLabel = states => states.map(s => en() ? stateNames[s] || s : s).join(' + ');
  const periods = [['7', 'Últimos 7 dias', 'Last 7 days'], ['30', 'Últimos 30 dias', 'Last 30 days'], ['90', 'Últimos 90 dias', 'Last 90 days'], ['180', '6 meses', '6 months'], ['365', '1 ano', '1 year'], ['all', 'Todo o histórico', 'All history']];
  const icons = {
    brain: '<path d="M10 4a3 3 0 0 0-5 2 3 3 0 0 0-2 5 4 4 0 0 0 2 6 3 3 0 0 0 5 3V4m4 0a3 3 0 0 1 5 2 3 3 0 0 1 2 5 4 4 0 0 1-2 6 3 3 0 0 1-5 3V4M7 8h3m-4 6h4m7-6h-3m4 6h-4"/>',
    leaf: '<path d="M12 19C4 19 2 14 2 9c4 0 8 2 10 6 2-4 6-6 10-6 0 5-2 10-10 10Zm0 0c-4-6-4-10 0-16 4 6 4 10 0 16Z"/>',
    target: '<circle cx="11" cy="13" r="8"/><circle cx="11" cy="13" r="4"/><path d="m11 13 9-10m-5 0h5v5"/>',
    trend: '<path d="M3 20V11h4v9m4 0V7h4v13m4 0V3h3v17"/>',
    trophy: '<path d="M8 3h8v8a4 4 0 0 1-8 0V3ZM8 5H3v3a5 5 0 0 0 5 5m8-8h5v3a5 5 0 0 1-5 5M12 15v5m-5 1h10"/>',
    warning: '<path d="m12 3 10 18H2L12 3Zm0 6v5m0 3h.01"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4m10-4v4M3 11h18"/>',
    compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5 5-3Z"/>'
  };
  const icon = name => `<svg class="ei-icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.brain}</svg>`;
  const confidenceLabel = value => ({ high: t('Alta', 'High'), medium: t('Média', 'Medium'), low: t('Baixa', 'Low') })[value];
  let period = '90', sessions = [], sourceStatus = '', analysis, requestId = 0, accessState = 'idle', usageMode = 'days', showAllPatterns = false, tradesReady = true, dataReady = true;
  let activePsychologyTab = (function () {
    try { return sessionStorage.getItem('healthyTrendPsychologyTab') || 'emotions'; } catch (_) { return 'emotions'; }
  })();
  window.selectPsychologyTab = function (tab) {
    activePsychologyTab = tab;
    try { sessionStorage.setItem('healthyTrendPsychologyTab', tab); } catch (_) {}
    render();
  };
  const patternTitles = { 'anxiety-access': 'Anxiety and monitoring frequency', 'calm-plan': 'Calm and plan adherence', 'calm-execution': 'Calm and execution quality', 'market-emotion': 'Healthy market and emotional activation', 'access-execution': 'Monitoring and execution', 'access-trades': 'Access frequency and new trades', 'access-plan': 'Access frequency and adherence', 'loss-after-access': 'Activity after losing exits', 'loss-reentry': 'New trades after losing exits', 'loss-streak-emotion': 'Loss streaks and emotional activation', 'win-streak-activity': 'Win streaks and activity', 'weekday-execution': 'Early week and execution' };
  Object.assign(patternTitles, { 'anxiety-monitoring': 'Anxiety and monitoring area visits', 'market-calm-execution': 'Healthy market, calm and execution', 'trade-count-plan': 'Trade count and plan adherence' });
  Object.assign(patternTitles, { 'declared-anxiety-execution': 'Recorded anxiety and execution quality', 'declared-calm-execution': 'Recorded calm and execution quality', 'declared-confidence-execution': 'Recorded confidence and execution quality' });
  const patternTitle = p => en() ? patternTitles[p.id] || p.title : p.title;

  const emotionsList = [
    {
      id: '01',
      badgeClass: 'num-01',
      name: 'Medo',
      icon: '😨',
      img: 'assets/emotion-medo.jpg',
      desc: 'Paralisia ou hesitação',
      trigger: 'Perda recente, tamanho de lote excessivo ou medo de devolver lucros acumulados.',
      signals: [
        'Hesitação para puxar o gatilho',
        'Apertar o stop cedo demais',
        'Paralisia diante de setups A+'
      ],
      antidote: [
        'Diminuir o tamanho da posição',
        'Focar em executar 100 trades de processo',
        'Aceitar a perda como custo operacional'
      ]
    },
    {
      id: '02',
      badgeClass: 'num-02',
      name: 'Ansiedade',
      icon: '😟',
      img: 'assets/emotion-ansiedade.jpg',
      desc: 'Incerteza e agitação',
      trigger: 'Ficar olhando cotações tick a tick ou operar com tamanho acima do suportado.',
      signals: [
        'Taquicardia e inquietação física',
        'Checar celular compulsivamente',
        'Dificuldade para aguardar o candle'
      ],
      antidote: [
        'Afastar-se da tela após enviar a ordem',
        'Deixar os stops na corretora (não mexer)',
        '3 min de respiração consciente no Zen'
      ]
    },
    {
      id: '03',
      badgeClass: 'num-03',
      name: 'Euforia',
      icon: '🥳',
      img: 'assets/emotion-euforia.jpg',
      desc: 'Falsa invencibilidade',
      trigger: 'Sequência de 3 ou mais trades vencedores gerando excesso de confiança.',
      signals: [
        'Aumento arbitrário de lote',
        'Desdém pelo risco e stop loss',
        'Sensação de "dominar o mercado"'
      ],
      antidote: [
        'Pausa obrigatória de 30 minutos',
        'Manter o Position Sizing invariável',
        'Reconhecer a variância estatística'
      ]
    },
    {
      id: '04',
      badgeClass: 'num-04',
      name: 'Ganância',
      icon: '🤑',
      img: 'assets/emotion-ganancia.jpg',
      desc: 'Ambição descontrolada',
      trigger: 'Lucro expressivo na tela superando as expectativas do planejamento.',
      signals: [
        'Ignorar a realização parcial técnica',
        'Mudar alvos no meio da operação',
        'Querer "o trade da vida"'
      ],
      antidote: [
        'Executar venda parcial no alvo técnico',
        'Conduzir restante com stop no breakeven',
        'Proteger o capital acumulado'
      ]
    },
    {
      id: '05',
      badgeClass: 'num-05',
      name: 'Frustração',
      icon: '😤',
      img: 'assets/emotion-frustracao.jpg',
      desc: 'Revolta contra o mercado',
      trigger: 'Ser violinado (stop acionado e logo depois o preço atinge o alvo planejado).',
      signals: [
        'Sentimento de injustiça e raiva',
        'Vontade de operar por vingança',
        'Discutir mentalmente com o gráfico'
      ],
      antidote: [
        'Intervalo de 15 min longe do terminal',
        'Aceitar o ruído estatístico inerente',
        'Lembrar: o stop protegeu seu capital'
      ]
    },
    {
      id: '06',
      badgeClass: 'num-06',
      name: 'Impaciência',
      icon: '⌛',
      img: 'assets/emotion-impaciencia.jpg',
      desc: 'Pressa e falta de foco',
      trigger: 'Mercado lateral, sem tendência ou sem setups claros por dias seguidos.',
      signals: [
        'Buscar operações em papéis ilíquidos',
        'Forçar entradas em setups Grade D',
        'Operar apenas pelo tédio de estar fora'
      ],
      antidote: [
        'Estar em caixa também é uma posição',
        'Desligar o terminal e ler Trader Wisdom',
        'Preservar capital para tendências reais'
      ]
    }
  ];

  const biasesList = [
    {
      id: '01',
      badgeClass: 'num-01',
      name: 'Loss Aversion',
      ptName: '(Aversão à Perda)',
      img: 'assets/bias-loss-aversion.jpg',
      icon: '📉',
      desc: 'Viés evolutivo de sofrimento',
      trap: 'A dor psicológica de perder R$ 1.000 é duas vezes maior que o prazer de ganhar R$ 1.000.',
      impact: 'Segurar posições perdedoras na esperança de voltar ao zero, transformando pequenas perdas em grandes catástrofes.',
      defense: [
        'Tratar o stop loss como custo fixo de empresa',
        'O primeiro prejuízo é sempre o menor prejuízo',
        'Ordem OCO enviada direto para a corretora'
      ]
    },
    {
      id: '02',
      badgeClass: 'num-02',
      name: 'FOMO',
      ptName: '(Fear of Missing Out)',
      img: 'assets/bias-fomo.jpg',
      icon: '🏃',
      desc: 'Medo de ficar de fora',
      trap: 'Ver um ativo disparando sem você e sentir urgência imediata de entrar na euforia.',
      impact: 'Comprar no topo de candles esticados longe das médias com risco/retorno desfavorável.',
      defense: [
        'Nunca comprar após 3 candles de alta longe da MM20',
        'Se perdeu o movimento, aguardar contração',
        'O mercado abre todos os dias com novas chances'
      ]
    },
    {
      id: '03',
      badgeClass: 'num-03',
      name: 'Overconfidence',
      ptName: '(Excesso de Confiança)',
      img: 'assets/bias-overconfidence.jpg',
      icon: '👑',
      desc: 'Ilusão de maestria',
      trap: 'Acreditar que os ganhos recentes derivam de genialidade pessoal e não de um mercado em tendência.',
      impact: 'Aumentar o percentual de risco por trade e ignorar filtros de qualidade do Rubric.',
      defense: [
        'Position Sizing invariável por Grade de setup',
        'Respeitar o teto de 6 posições simultâneas',
        'Humildade estatística perante a variância'
      ]
    },
    {
      id: '04',
      badgeClass: 'num-04',
      name: 'Recency Bias',
      ptName: '(Viés de Recência)',
      img: 'assets/bias-recency-bias.jpg',
      icon: '🔄',
      desc: 'Miopia do último pregão',
      trap: 'Julgar a qualidade do seu método com base nos últimos 2 ou 3 trades recentes.',
      impact: 'Abandonar um sistema lucrativo durante um drawdown natural ou mudar de estratégia toda semana.',
      defense: [
        'Avaliar consistência em blocos de 20 trades',
        'Foco na expectativa matemática de longo prazo',
        'Registrar métricas no Diário do Trader'
      ]
    },
    {
      id: '05',
      badgeClass: 'num-05',
      name: 'Need to Be Right',
      ptName: '(Necessidade de Estar Certo)',
      img: 'assets/bias-need-to-be-right.jpg',
      icon: '🎯',
      desc: 'Ego versus Lucro',
      trap: 'Priorizar o ego e a vaidade sobre o lucro real. Tentar provar que o mercado está errado.',
      impact: 'Remover stops ou fazer preço médio contra a tendência para não admitir o erro da análise.',
      defense: [
        'Você quer estar certo ou ganhar dinheiro?',
        'O mercado tem sempre razão soberana',
        'Errar pequeno para vencer grande nas tendências'
      ]
    },
    {
      id: '06',
      badgeClass: 'num-06',
      name: 'Revenge Trading',
      ptName: '(Operação por Vingança)',
      img: 'assets/bias-revenge-trading.jpg',
      icon: '⚔️',
      desc: 'Reação emocional destrutiva',
      trap: 'Tentar "dar o troco" no ativo ou recuperar o prejuízo no mesmo pregão após um stop doloroso.',
      impact: 'Operações impulsivas sem setup, com lote dobrado e violação total do plano.',
      defense: [
        'Intervalo obrigatório de 15 min após stop',
        'Limite máximo de 2 perdas por pregão',
        'Fazer check-in no Meu Estado Mental'
      ]
    }
  ];

  const behaviorsList = [
    {
      title: 'Perseguir preço esticado',
      icon: '🏃‍♂️',
      bad: 'Comprar quando o ativo já esticou longe das médias móveis, assumindo stop longo e risco desproporcional.',
      good: 'Aguardar contração de volatilidade ou pullback nas médias móveis de 20 períodos com gatilho claro.'
    },
    {
      title: 'Aumentar risco após perda',
      icon: '💣',
      bad: 'Dobrar o tamanho do lote após um loss para tentar zerar o prejuízo rapidamente no mesmo dia.',
      good: 'Em fases de drawdown, reduzir para o perfil Risk Ramp-Up (risco 0,15% e máx 3 posições) ou pausar.'
    },
    {
      title: 'Sair cedo do trade vencedor',
      icon: '✂️',
      bad: 'Zerar a posição inteira com lucro mínimo no primeiro candle de recuo por medo de devolver.',
      good: 'Executar a venda parcial programada no alvo técnico e conduzir o restante com stop na MM20/MM50.'
    },
    {
      title: 'Interferência contínua na ordem',
      icon: '🕹️',
      bad: 'Ficar mexendo em ordens, cancelando stops manualmente ou mudando alvos a cada oscilação.',
      good: 'Planejar entrada, stop e alvo antes do mercado abrir e deixar o plano agir sem interferência.'
    },
    {
      title: 'Operar sem setup catalogado',
      icon: '🎲',
      bad: 'Entrar por "sensação", notícia em rede social, dicas de terceiros ou intuição de momento.',
      good: 'Operar estritamente oportunidades catalogadas no Trading Rubric com Grade A+ ou Grade A.'
    },
    {
      title: 'Operar por tédio ou adrenalina',
      icon: '⌛',
      bad: 'Abrir operações aleatórias apenas para sentir a emoção de estar no jogo ou passar o tempo.',
      good: 'Aceitar ficar em caixa quando o mercado não oferece contexto saudável. Caixa é posição.'
    },
    {
      title: 'Operar sob estresse emocional',
      icon: '⚡',
      bad: 'Operar sob estresse pessoal, cansaço físico, raiva ou distração familiar/profissional.',
      good: 'Fazer o check-in no Meu Estado Mental. Se estiver agitado ou ansioso, não operar no dia.'
    }
  ];

  const habitsSections = [
    {
      title: 'Rotina Pré-Mercado · Preparação e Clareza',
      icon: '🌅',
      time: '08:30 – 09:45',
      desc: 'Construa sua clareza operacional antes do primeiro tick do dia.',
      steps: [
        { label: 'Check-in Mental', desc: 'Avalie seu estado emocional no módulo Mentalidade. Se agitado, faça 5 min no Trader Zen.' },
        { label: 'Contexto de Mercado', desc: 'Verifique a Permissão de Mercado (Saudável, Transição ou Defensivo) no dashboard.' },
        { label: 'Revisão da Watchlist', desc: 'Identifique ativos em contração de volatilidade com gatilhos confirmados para o dia.' },
        { label: 'Cálculo de Position Sizing', desc: 'Defina a quantidade de ações com base na política de risco e no stop planejado.' }
      ]
    },
    {
      title: 'Rotina Durante o Mercado · Execução e Foco',
      icon: '🎯',
      time: '10:00 – 17:00',
      desc: 'Proteja seu capital com execução disciplinada e zero interferência emocional.',
      steps: [
        { label: 'Ordens na Pedra', desc: 'Envie as ordens de entrada e stop simultaneamente. Nunca opere sem stop cadastrado.' },
        { label: 'Afaste-se do Monitor', desc: 'Evite olhar cotações tick a tick. O ruído intradiário desgasta seu capital psicológico.' },
        { label: 'Execução Sem Debate', desc: 'Se o stop for acionado, aceite sem questionar. O stop preserva sua sobrevivência.' },
        { label: 'Pausa Obrigatória', desc: 'Após qualquer encerramento (gain ou loss), faça uma pausa de 15 minutos longe das telas.' }
      ]
    },
    {
      title: 'Rotina Pós-Mercado · Processamento e Evolução',
      icon: '🌙',
      time: '17:30 – 18:30',
      desc: 'Transforme a experiência de cada pregão em aprendizado acumulado para amanhã.',
      steps: [
        { label: 'Preenchimento do Diário', desc: 'Registre a execução, aderência ao plano e emoções sentidas durante a sessão.' },
        { label: 'Revisão de Padrões', desc: 'Consulte o Analisador de Padrões para checar se houve gatilhos recorrentes.' },
        { label: 'Leitura de Sabedoria', desc: 'Leia 1 card reflexivo no Trader Wisdom para desacelerar a mente antes do descanso.' },
        { label: 'Desconexão Total', desc: 'Feche as plataformas e viva sua vida fora do mercado. O descanso consolida a disciplina.' }
      ]
    }
  ];

  const mindsetPrinciples = [
    {
      num: '01',
      title: 'Pensamento Probabilístico',
      icon: '🎲',
      summary: 'Qualquer coisa pode acontecer no próximo trade individual.',
      desc: 'O resultado de uma operação individual é puramente aleatório. A consistência real reside na execução repetida de um padrão estatístico ao longo de centenas de operações sem hesitar ou violar as regras.'
    },
    {
      num: '02',
      title: 'Desapego do Resultado Imediato',
      icon: '🏔️',
      summary: 'Bom trade é trade bem executado, não necessariamente com lucro.',
      desc: 'Você pode fazer tudo certo e tomar um stop natural. Você pode fazer tudo errado e ter lucro por pura sorte. Traders profissionais medem seu sucesso pela fidelidade ao processo, nunca pelo P&L diário.'
    },
    {
      num: '03',
      title: 'A Regra dos 100 Trades',
      icon: '📊',
      summary: 'Sua vantagem matemática só se manifesta em grandes amostras.',
      desc: 'Nunca julgue sua capacidade em um único pregão ou semana. Pense em blocos de 100 trades de alta qualidade (Grade A/A+). O tempo e os juros compostos trabalham a favor de quem segue o método.'
    },
    {
      num: '04',
      title: 'Capital Psicológico como Ativo Mais Valioso',
      icon: '🧠',
      summary: 'Dinheiro perdido se recupera; a confiança destruída leva meses.',
      desc: 'Quando seu estado mental estiver instável ou abalado, parar de operar é a decisão mais inteligente e lucrativa. Preservar sua clareza mental e serenidade é o alicerce de qualquer operador de elite.'
    }
  ];
  function readInput() {
    const storage = window.healthyTrendWorkspace?.storage;
    const records = storage && window.JournalV2Model ? window.JournalV2Model.load(storage, []).records : [];
    const local = typeof operationalState === 'undefined' ? [] : [...(operationalState.positions || []), ...(operationalState.closedPositions || [])];
    const remote = typeof synchronizedTrades === 'undefined' ? [] : synchronizedTrades;
    return { records, sessions, trades: tradesReady ? [...remote, ...local] : [], activity: window.readBehaviorActivity?.() || [], period };
  }
  function delta(current, previous, type, higherBetter) {
    if (current == null || previous == null || (type === 'relative' && previous === 0)) return `<small>${t('Sem base comparável anterior', 'No comparable prior baseline')}</small>`;
    const diff = current - previous, display = type === 'percentage' ? `${format(Math.abs(diff) * 100, 0)} ${t('p.p.', 'pp')}` : type === 'relative' ? `${format(Math.abs(diff / previous) * 100, 0)}%` : format(Math.abs(diff));
    const good = higherBetter == null || (higherBetter ? diff >= 0 : diff <= 0);
    return `<small class="ei-delta ${good ? '' : 'attention'}">${diff === 0 ? '→' : diff > 0 ? '↑' : '↓'} ${display} ${t('vs. período anterior', 'vs. previous period')}</small>`;
  }
  function empty(message, link = false) { return `<div class="ei-empty">${icon('compass')}<span>${message}</span>${link ? `<button class="ei-button" type="button" data-action="journal">${t('Continuar meu Diário →', 'Continue my Journal →')}</button>` : ''}</div>`; }
  function metricValue(p, value) {
    if (['calm-plan', 'access-plan', 'loss-reentry', 'trade-count-plan'].includes(p.id)) return pct(value);
    if (['calm-execution', 'access-execution', 'weekday-execution', 'market-calm-execution'].includes(p.id) || p.id.startsWith('declared-')) return `${format(value)}/10`;
    return format(value);
  }
  function patternCopy(p) {
    if (p.id === 'loss-reentry') return t(`Seu histórico mostra novas operações após perdas em ${p.count} dias. Abra as ocorrências para estudar essa sequência.`, `Your history shows new entries after losses on ${p.count} days. Open the evidence to study this sequence.`);
    const unit = ['anxiety-access', 'access-trades', 'loss-after-access', 'win-streak-activity'].includes(p.id) ? t(p.id === 'access-trades' ? 'operações/dia' : 'acessos/dia', p.id === 'access-trades' ? 'trades/day' : 'accesses/day') : '';
    return t(`Associação observada: ${metricValue(p, p.value)} ${unit} neste contexto, contra ${metricValue(p, p.baseline)} ${unit} no grupo de comparação. Esses fatores apareceram juntos no seu histórico.`, `Observed association: ${metricValue(p, p.value)} ${unit} in this context versus ${metricValue(p, p.baseline)} ${unit} in the comparison group. These factors appeared together in your history.`);
  }
  function contextMarkup(context, attention) {
    const title = attention ? t('Seu Estado de Maior Atenção', 'Your Context Requiring Attention') : t('Seu Melhor Estado de Execução', 'Your Best Execution Context');
    return `<section class="ei-context ${attention ? 'attention' : ''}"><h2>${icon(attention ? 'warning' : 'trophy')}${title}</h2>${context ? `<ul><li>${esc(statesLabel(context.title.split(" + ")))}</li><li>${t('Intensidade', 'Intensity')} ${context.band}</li><li>${pct(context.adherence)} ${t('de aderência ao plano', 'plan adherence')}</li><li>${t('Execução média', 'Average execution')}: <b>${format(context.execution)}/10</b></li>${attention && context.access !== null ? `<li>${format(context.access)} ${t('acessos/dia registrados', 'recorded accesses/day')}</li>` : ''}<li>${t('Resultado médio', 'Average result')}: <b>${rLabel(context.resultR)}</b></li></ul><p>${context.count} ${t('dias', 'days')} · ${t('Confiança', 'Confidence')}: ${confidenceLabel(context.confidence)}.<br>${t('Associação observada no seu histórico.', 'Observed association in your history.')}</p><button class="ei-button" type="button" data-context="${attention ? 'attention' : 'best'}">${t('Estudar evidências →', 'Study evidence →')}</button>` : empty(t('Precisamos de pelo menos 3 dias com o mesmo conjunto de estados e intensidade, e execução informada.', 'We need at least 3 days with the same states and intensity band, and a recorded execution score.'))}</section>`;
  }
  function scatterChart() {
    if (!analysis.scatter.length) return empty(t(`O mapa precisa cruzar intensidade emocional e qualidade da execução no mesmo dia. Neste período: ${analysis.current.intensityCount} dia(s) com intensidade e ${analysis.current.executionCount} com execução; ainda não há dias com os dois dados.`, `The map needs emotional intensity and execution quality recorded on the same day. In this period: ${analysis.current.intensityCount} day(s) with intensity and ${analysis.current.executionCount} with execution; there are no days with both values yet.`), true);
    const W = 460, H = 340, x = value => 62 + (value - 1) / 4 * 355, y = value => 278 - value / 10 * 238;
    return `<svg class="ei-chart ei-scatter" viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('Mapa de estados: ativação emocional versus execução', 'State map: emotional activation versus execution')}">${[1, 2, 3, 4, 5].map(v => `<line class="ei-gridline" x1="${x(v)}" y1="40" x2="${x(v)}" y2="278"/>`).join('')}${[0, 2, 4, 6, 8, 10].map(v => `<line class="ei-gridline" x1="62" y1="${y(v)}" x2="417" y2="${y(v)}"/>`).join('')}<path class="ei-axis" d="M62 35v243h361"/><line class="ei-guide" x1="${x(3)}" y1="40" x2="${x(3)}" y2="278"/><line class="ei-guide" x1="62" y1="${y(5)}" x2="417" y2="${y(5)}"/><text x="57" y="24" text-anchor="end">${t('Disciplinado', 'Disciplined')}</text><text x="57" y="278" text-anchor="end">${t('Impulsivo', 'Impulsive')}</text><text x="62" y="295">${t('Calmo', 'Calm')}</text><text x="417" y="295" text-anchor="end">${t('Muito ativado', 'Highly activated')}</text><text x="235" y="314" text-anchor="middle">${t('Ativação emocional', 'Emotional activation')}</text><text transform="translate(17 167) rotate(-90)" text-anchor="middle">${t('Qualidade da execução', 'Execution quality')}</text>${analysis.scatter.map(d => `<g tabindex="0" role="button" data-day="${d.date}" aria-label="${esc(dateLabel(d.date))}: ${esc(statesLabel(d.states))}, ${d.intensity}, ${d.execution}/10"><circle cx="${x(d.intensity)}" cy="${y(d.execution)}" r="4.5" fill="${d.resultR === null ? '#c39b2e' : d.resultR < 0 ? '#d75a49' : '#269a6a'}" stroke="#fff4d5" stroke-width=".8" opacity=".82"/><title>${esc(dayTooltip(d))}</title></g>`).join('')}</svg><div class="ei-legend"><span><i class="ei-dot"></i>${t('Resultado positivo / neutro', 'Positive / flat result')}</span><span><i class="ei-dot loss"></i>${t('Resultado negativo', 'Negative result')}</span><span><i class="ei-dot none"></i>${t('Sem resultado realizado', 'No realised result')}</span></div><p class="ei-soft-note">${analysis.scatter.length} ${t('dias com os dois indicadores. Pontos iguais podem se sobrepor. As faixas dos eixos descrevem a escala, não classificam sua personalidade.', 'days with both indicators. Identical points can overlap. Axis labels describe the scale, not your personality.')}</p>`;
  }
  function dayTooltip(d) { return `${dateLabel(d.date)}\n${statesLabel(d.states) || t('Estado não informado', 'State not recorded')} (${d.intensity ?? '—'})\n${d.access ?? '—'} ${t('acessos registrados', 'recorded accesses')}\n${t('Execução', 'Execution')}: ${format(d.execution)}/10\n${t('Resultado', 'Result')}: ${rLabel(d.resultR)}`; }
  function lineChart() {
    const rows = analysis.days.filter(d => d.intensity !== null || d.execution !== null);
    if (!rows.length) return empty(t('Todo registro deixa uma pista. Continue registrando para revelar seus padrões.', 'Every entry leaves a clue. Keep recording to reveal your patterns.'));
    const start = new Date(`${analysis.bounds.start}T12:00:00Z`).getTime(), end = new Date(`${analysis.bounds.end}T12:00:00Z`).getTime();
    const x = d => 27 + (new Date(`${d.date}T12:00:00Z`).getTime() - start) / Math.max(86400000, end - start) * 523, y = v => 108 - v / 10 * 85;
    const series = (field, scale, color) => {
      let path = '', last = null;
      rows.forEach(d => { const value = d[field]; if (value === null) { last = null; return; } const moment = new Date(`${d.date}T12:00:00Z`).getTime(); path += `${last !== null && moment - last <= 86400000 ? 'L' : 'M'}${x(d).toFixed(1)},${y(value * scale).toFixed(1)} `; last = moment; });
      return `<path d="${path}" fill="none" stroke="${color}" stroke-width="1.7"/>${rows.filter(d => d[field] !== null).map(d => `<circle cx="${x(d)}" cy="${y(d[field] * scale)}" r="2.5" fill="${color}"><title>${esc(dayTooltip(d))}</title></circle>`).join('')}`;
    };
    return `<svg class="ei-chart" viewBox="0 0 580 144" role="img" aria-label="${t('Evolução da intensidade e da execução', 'Intensity and execution over time')}">${[0, 2, 4, 6, 8, 10].map(v => `<line class="ei-gridline" x1="27" y1="${y(v)}" x2="550" y2="${y(v)}"/><text x="19" y="${y(v) + 3}" text-anchor="end">${v / 2}</text><text x="557" y="${y(v) + 3}">${v}</text>`).join('')}<path class="ei-axis" d="M27 18v90h523"/>${series('intensity', 2, '#bc922d')}${series('execution', 1, '#268762')}<text x="27" y="130">${dateLabel(analysis.bounds.start, true)}</text><text x="550" y="130" text-anchor="end">${dateLabel(analysis.bounds.end, true)}</text></svg>`;
  }
  function usageChart() {
    if (analysis.current.access === null) return empty(t('O histórico de acessos aparecerá quando houver sessões registradas em Uso da Plataforma.', 'Access history appears when Platform Usage has recorded sessions.'));
    const hourly = usageMode === 'hours';
    const days = new Map(analysis.days.map(d => [d.date, d]));
    const start = new Date(`${analysis.bounds.start}T12:00:00Z`).getTime(), cutoff = analysis.accessStart > analysis.bounds.start ? analysis.accessStart : analysis.bounds.start;
    let rows = hourly ? analysis.hourly.map(h => ({ label: `${h.hour}h`, value: h.count })) : Array.from({ length: analysis.bounds.length }, (_, i) => { const date = new Date(start + i * 86400000).toISOString().slice(0, 10); return { label: date, value: date < cutoff ? null : days.get(date)?.access || 0 }; });
    // Preserve totals while grouping a long history into at most 100 bins.
    const bin = Math.max(1, Math.ceil(rows.length / 100));
    if (bin > 1) rows = Array.from({ length: Math.ceil(rows.length / bin) }, (_, i) => { const group = rows.slice(i * bin, (i + 1) * bin), values = group.map(d => d.value).filter(v => v !== null); return { label: group[0].label, value: values.length ? values.reduce((a, b) => a + b, 0) : null }; });
    const max = Math.max(1, ...rows.map(r => r.value || 0)), width = 500 / rows.length;
    return `<svg class="ei-chart" viewBox="0 0 550 144" role="img" aria-label="${t('Acessos registrados', 'Recorded accesses')}">${[0, .5, 1].map(v => `<line class="ei-gridline" x1="30" y1="108-${v * 85}" x2="530" y2="108-${v * 85}"/>`.replace(/108-([\d.]+)/g, (_, n) => 108 - Number(n))).join('')}${rows.map((r, i) => r.value === null ? '' : `<rect x="${30 + i * width}" y="${108 - r.value / max * 85}" width="${Math.max(.8, width * .65)}" height="${r.value / max * 85}" rx=".4" fill="#288866"><title>${esc(hourly ? r.label : dateLabel(r.label))}: ${r.value} ${t('acessos', 'accesses')}</title></rect>`).join('')}<text x="23" y="26" text-anchor="end">${format(max, 0)}</text><text x="23" y="111" text-anchor="end">0</text><text x="30" y="130">${hourly ? '0h' : dateLabel(analysis.bounds.start, true)}</text><text x="530" y="130" text-anchor="end">${hourly ? '23h' : dateLabel(analysis.bounds.end, true)}</text></svg><p class="ei-soft-note">${hourly ? t('Horários de Brasília. Aberturas reais de sessões.', 'São Paulo time. Actual session openings.') : bin > 1 ? t(`Cada barra reúne até ${bin} dias; acessos somados.`, `Each bar groups up to ${bin} days; accesses are summed.`) : t('Acessos por dia. Antes do primeiro acesso disponível, não inferimos zeros.', 'Accesses per day. No zeros are inferred before the first available access.')} ${analysis.current.accessDays} ${t('dias na base de acessos do período.', 'days in the access baseline for this period.')}</p>`;
  }
  function comparisonMarkup() {
    if (!analysis.previous) return '';
    const a = analysis.current, b = analysis.previous;
    const items = [[t('Ativação emocional', 'Emotional activation'), 'intensity', false, 'absolute'], [t('Aderência ao plano', 'Plan adherence'), 'adherence', true, 'percentage'], [t('Acessos registrados / dia', 'Recorded accesses / day'), 'access', null, 'relative'], [t('Qualidade da execução', 'Execution quality'), 'execution', true, 'absolute']];
    return `<section class="ei-paper ei-comparison"><h2>${t('Sua evolução entre períodos', 'Your progress between periods')}</h2><p class="ei-soft-note">${dateLabel(analysis.bounds.previousStart, true)} – ${dateLabel(analysis.bounds.previousEnd, true)} → ${dateLabel(analysis.bounds.start, true)} – ${dateLabel(analysis.bounds.end, true)}. ${t('Cada indicador usa apenas os registros em que ele foi informado.', 'Each metric only uses entries where it was recorded.')}</p><div class="ei-comparison-grid">${items.map(([label, field, better, type]) => `<article><span>${label}</span><b>${field === 'adherence' ? pct(b[field]) : format(b[field])} → ${field === 'adherence' ? pct(a[field]) : format(a[field])}</b>${delta(a[field], b[field], type, better)}</article>`).join('')}</div></section>`;
  }
  function renderEmotionsGuide() {
    return `
      <div class="ei-section-header">
        <div class="ei-section-title-wrap">
          <h1 class="ei-section-title">Emoções do <span class="ei-accent-text">Trader</span></h1>
          <p class="ei-section-subtitle">Identifique os gatilhos, reconheça os sinais e aplique antídotos práticos para operar com mais equilíbrio.</p>
        </div>
        <aside class="ei-quote-box">
          <span class="ei-quote-mark">“</span>
          <p class="ei-quote-text">O controle das emoções é uma vantagem competitiva.</p>
          <span class="ei-quote-author">HEALTHY TREND TRADER</span>
        </aside>
      </div>

      <div class="emotion-cards-list">
        ${emotionsList.map(e => `
          <article class="emotion-horizontal-card">
            <div class="emotion-img-col">
              <img src="${e.img}" alt="${e.name}" class="emotion-card-img" loading="lazy" />
              <span class="emotion-badge-num ${e.badgeClass}">${e.id}</span>
            </div>
            <div class="emotion-title-col">
              <div class="emotion-title-header">
                <span class="emotion-icon">${e.icon}</span>
                <h3 class="emotion-name">${e.name}</h3>
              </div>
              <span class="emotion-desc">${e.desc}</span>
            </div>
            <div class="emotion-trigger-col">
              <div class="emotion-col-eyebrow">
                <span class="eyebrow-icon">⚡</span>
                <span>GATILHO</span>
              </div>
              <p class="emotion-col-text">${e.trigger}</p>
            </div>
            <div class="emotion-signals-col">
              <div class="emotion-col-eyebrow">
                <span class="eyebrow-icon">🔴</span>
                <span>SINAIS</span>
              </div>
              <ul class="emotion-signals-list">
                ${e.signals.map(s => `<li>${s}</li>`).join('')}
              </ul>
            </div>
            <div class="emotion-antidote-col">
              <div class="antidote-card-inner">
                <div class="antidote-eyebrow">
                  <span class="antidote-icon">🎯</span>
                  <span>ANTÍDOTO PRÁTICO</span>
                </div>
                <ul class="antidote-checklist">
                  ${e.antidote.map(a => `<li><span class="check-icon">☑</span><span>${a}</span></li>`).join('')}
                </ul>
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }

  function renderBiasesGuide() {
    return `
      <div class="ei-section-header">
        <div class="ei-section-title-wrap">
          <h1 class="ei-section-title">Vieses <span class="ei-accent-text">Cognitivos</span></h1>
          <p class="ei-section-subtitle">Armadilhas mentais evolutivas que sabotam a execução do trader e como neutralizá-las no pregão.</p>
        </div>
        <aside class="ei-quote-box">
          <span class="ei-quote-mark">“</span>
          <p class="ei-quote-text">O primeiro prejuízo é sempre o menor prejuízo.</p>
          <span class="ei-quote-author">REGRA DE OURO</span>
        </aside>
      </div>

      <div class="emotion-cards-list">
        ${biasesList.map(b => `
          <article class="emotion-horizontal-card bias-card">
            <div class="emotion-img-col">
              <span class="emotion-badge-num ${b.badgeClass}">${b.id}</span>
              <img src="${b.img}" alt="${b.name}" class="emotion-card-img" />
            </div>
            <div class="emotion-title-col bias-title-col">
              <h3 class="bias-card-title">
                <span class="bias-title-primary">${b.name}</span>
                <span class="bias-title-secondary">${b.ptName}</span>
              </h3>
              <span class="emotion-desc bias-card-desc">${b.desc}</span>
            </div>
            <div class="emotion-trigger-col bias-trap-col">
              <div class="emotion-col-eyebrow bias-trap-eyebrow">
                <span class="eyebrow-icon">🧠</span>
                <span>ARMADILHA EVOLUTIVA</span>
              </div>
              <p class="emotion-col-text bias-trap-text">${b.trap}</p>
            </div>
            <div class="emotion-signals-col bias-impact-col">
              <div class="emotion-col-eyebrow bias-impact-eyebrow">
                <span class="eyebrow-icon">⚠️</span>
                <span>IMPACTO NO TRADE</span>
              </div>
              <p class="emotion-col-text bias-impact-text">${b.impact}</p>
            </div>
            <div class="emotion-antidote-col bias-defense-col">
              <div class="bias-defense-panel">
                <div class="bias-defense-head">
                  <span class="bias-defense-icon">🛡️</span>
                  <span class="bias-defense-label">DEFESA SISTEMÁTICA</span>
                </div>
                <ul class="bias-defense-list">
                  ${b.defense.map(rule => `
                    <li class="bias-defense-item">
                      <span class="bias-check-icon">✓</span>
                      <span class="bias-rule-text">${rule}</span>
                    </li>
                  `).join('')}
                </ul>
              </div>
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }

  function renderBehaviorsGuide() {
    return `
      <div class="ei-section-header">
        <div class="ei-section-title-wrap">
          <h1 class="ei-section-title">Padrões de <span class="ei-accent-text">Comportamento</span></h1>
          <p class="ei-section-subtitle">Mapeamento claro dos impulsos tóxicos versus a execução disciplinada do método Healthy Trend Trader.</p>
        </div>
        <aside class="ei-quote-box">
          <span class="ei-quote-mark">“</span>
          <p class="ei-quote-text">Disciplina é a ponte entre seus objetivos e suas realizações.</p>
          <span class="ei-quote-author">MÉTODO HEALTHY</span>
        </aside>
      </div>

      <div class="behavior-cards-list">
        ${behaviorsList.map(b => `
          <article class="behavior-compare-card">
            <div class="behavior-title-box">
              <span class="behavior-icon">${b.icon}</span>
              <h3 class="behavior-title">${b.title}</h3>
            </div>
            <div class="behavior-toxic-box">
              <div class="behavior-box-tag toxic">
                <span>🔴</span> COMPORTAMENTO TÓXICO
              </div>
              <p class="behavior-box-text">${b.bad}</p>
            </div>
            <div class="behavior-healthy-box">
              <div class="behavior-box-tag healthy">
                <span>🟢</span> PADRÃO SAUDÁVEL
              </div>
              <p class="behavior-box-text">${b.good}</p>
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }

  function renderHabitsGuide() {
    return `
      <div class="ei-section-header">
        <div class="ei-section-title-wrap">
          <h1 class="ei-section-title">Rotinas e <span class="ei-accent-text">Hábitos</span></h1>
          <p class="ei-section-subtitle">A consistência nos resultados decorre de processos estruturados antes, durante e após cada sessão de mercado.</p>
        </div>
        <aside class="ei-quote-box">
          <span class="ei-quote-mark">“</span>
          <p class="ei-quote-text">Você cai ao nível dos seus sistemas de treino diário.</p>
          <span class="ei-quote-author">PROCESSO SUSTENTÁVEL</span>
        </aside>
      </div>

      <div class="habits-sections-grid">
        ${habitsSections.map(h => `
          <article class="habit-phase-card">
            <div class="habit-phase-header">
              <div class="habit-phase-title-wrap">
                <span class="habit-phase-icon">${h.icon}</span>
                <div>
                  <h3 class="habit-phase-title">${h.title}</h3>
                  <span class="habit-phase-time">${h.time}</span>
                </div>
              </div>
              <p class="habit-phase-desc">${h.desc}</p>
            </div>
            <div class="habit-steps-list">
              ${h.steps.map((s, idx) => `
                <div class="habit-step-item">
                  <span class="habit-step-num">0${idx + 1}</span>
                  <div class="habit-step-content">
                    <strong class="habit-step-label">${s.label}</strong>
                    <p class="habit-step-desc">${s.desc}</p>
                  </div>
                </div>
              `).join('')}
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }

  function renderMindsetSuccessGuide() {
    return `
      <div class="ei-section-header">
        <div class="ei-section-title-wrap">
          <h1 class="ei-section-title">Mindset do <span class="ei-accent-text">Sucesso</span></h1>
          <p class="ei-section-subtitle">Modelos mentais e princípios fundamentais adotados pelos operadores de maior longevidade no mercado.</p>
        </div>
        <aside class="ei-quote-box">
          <span class="ei-quote-mark">“</span>
          <p class="ei-quote-text">Operar com vantagem é pensar em probabilidades, não em certezas.</p>
          <span class="ei-quote-author">MARK DOUGLAS</span>
        </aside>
      </div>

      <div class="mindset-pillars-grid">
        ${mindsetPrinciples.map(p => `
          <article class="mindset-pillar-card">
            <div class="mindset-pillar-badge">${p.num}</div>
            <div class="mindset-pillar-head">
              <span class="mindset-pillar-icon">${p.icon}</span>
              <h3 class="mindset-pillar-title">${p.title}</h3>
            </div>
            <strong class="mindset-pillar-summary">${p.summary}</strong>
            <p class="mindset-pillar-desc">${p.desc}</p>
          </article>
        `).join('')}
      </div>
    `;
  }

  function renderSelfKnowledgeGuide() {
    const commitment = localStorage.getItem('healthyTrendSelfCommitment') || '';
    return `
      <div class="ei-section-header">
        <div class="ei-section-title-wrap">
          <h1 class="ei-section-title">Autoconhecimento e <span class="ei-accent-text">Compromisso</span></h1>
          <p class="ei-section-subtitle">O trader que você é sob pressão é o trader que você precisa aprender a gerenciar.</p>
        </div>
        <aside class="ei-quote-box">
          <span class="ei-quote-mark">“</span>
          <p class="ei-quote-text">Conhece a ti mesmo e vencerás mil batalhas.</p>
          <span class="ei-quote-author">SUN TZU</span>
        </aside>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="antidote-card-inner" style="padding:22px;border-radius:14px;background:#ffffff">
          <h3 style="margin:0 0 10px;font-size:18px;color:#122d23">🧭 Diagnóstico de Padrões Pessoais</h3>
          <p style="line-height:1.6;font-size:13.5px;color:#475549">Responda para si mesmo com honestidade absoluta:</p>
          <ul style="margin:12px 0;padding-left:20px;font-size:13px;color:#3f5247;line-height:1.7">
            <li>Qual emoção antecede a maioria dos seus trades perdedores?</li>
            <li>Você tende mais a sair cedo de trades vencedores ou segurar perdedores?</li>
            <li>O que você sente no estômago quando o mercado faz um pullback de 2%?</li>
            <li>Você opera para ter razão ou para acumular capital com disciplina?</li>
          </ul>
          <p style="font-size:12px;color:#196a4a;font-weight:600;margin-top:12px">Recomendação: utilize os Testes de Perfil e anote suas respostas no Diário após cada sessão.</p>
        </div>
        <div class="antidote-card-inner" style="padding:22px;border-radius:14px;background:#ffffff">
          <h3 style="margin:0 0 10px;font-size:18px;color:#122d23">✍️ Meu Compromisso Inegociável</h3>
          <p style="font-size:13px;color:#55665d">Escreva uma regra inegociável para a sua mente antes do próximo pregão:</p>
          <textarea id="selfCommitmentInput" rows="5" style="width:100%;margin-top:10px;padding:12px;border:1px solid #d4cbb3;border-radius:10px;background:#fbfaf6;font:inherit;font-size:13px;line-height:1.5" placeholder="Ex: Se eu tomar 2 stops no mesmo dia, fecho a plataforma imediatamente e vou caminhar ao ar livre...">${esc(commitment)}</textarea>
          <button class="ei-button" type="button" style="margin-top:12px;padding:9px 18px;font-weight:700" onclick="saveSelfCommitment()">Salvar Compromisso</button>
        </div>
      </div>
    `;
  }

  window.saveSelfCommitment = function () {
    const input = document.getElementById('selfCommitmentInput');
    if (input) {
      localStorage.setItem('healthyTrendSelfCommitment', input.value.trim());
      if (typeof showToast === 'function') showToast('Compromisso de autoconhecimento salvo.');
    }
  };

  function render() {
    const topNav = `
      <div class="ei-top-navigation">
        <div class="ei-nav-left">
          <button class="mindset-sub-back" type="button" onclick="go('mindset')">← Voltar para Mentalidade</button>
        </div>
        <nav class="psychology-tabs" aria-label="Abas de Psicologia do Trader">
          <button class="psychology-tab ${activePsychologyTab === 'emotions' ? 'active' : ''}" type="button" onclick="selectPsychologyTab('emotions')">🧠 Emoções do Trader</button>
          <button class="psychology-tab ${activePsychologyTab === 'biases' ? 'active' : ''}" type="button" onclick="selectPsychologyTab('biases')">🧩 Vieses Cognitivos</button>
          <button class="psychology-tab ${activePsychologyTab === 'behaviors' ? 'active' : ''}" type="button" onclick="selectPsychologyTab('behaviors')">📊 Padrões de Comportamento</button>
          <button class="psychology-tab ${activePsychologyTab === 'habits' ? 'active' : ''}" type="button" onclick="selectPsychologyTab('habits')">⚙️ Rotinas e Hábitos</button>
          <button class="psychology-tab ${activePsychologyTab === 'mindset_success' ? 'active' : ''}" type="button" onclick="selectPsychologyTab('mindset_success')">🎯 Mindset do Sucesso</button>
          <button class="psychology-tab ${activePsychologyTab === 'analyzer' ? 'active' : ''}" type="button" onclick="selectPsychologyTab('analyzer')">📈 Analisador de Padrões</button>
        </nav>
      </div>
    `;

    if (activePsychologyTab === 'emotions') {
      root.innerHTML = `<div class="ei-shell">${topNav}<div class="ei-main-sheet">${renderEmotionsGuide()}</div></div>`;
      return;
    }
    if (activePsychologyTab === 'biases') {
      root.innerHTML = `<div class="ei-shell">${topNav}<div class="ei-main-sheet">${renderBiasesGuide()}</div></div>`;
      return;
    }
    if (activePsychologyTab === 'behaviors') {
      root.innerHTML = `<div class="ei-shell">${topNav}<div class="ei-main-sheet">${renderBehaviorsGuide()}</div></div>`;
      return;
    }
    if (activePsychologyTab === 'habits') {
      root.innerHTML = `<div class="ei-shell">${topNav}<div class="ei-main-sheet">${renderHabitsGuide()}</div></div>`;
      return;
    }
    if (activePsychologyTab === 'mindset_success') {
      root.innerHTML = `<div class="ei-shell">${topNav}<div class="ei-main-sheet">${renderMindsetSuccessGuide()}</div></div>`;
      return;
    }
    if (activePsychologyTab === 'selfknowledge') {
      root.innerHTML = `<div class="ei-shell">${topNav}<div class="ei-main-sheet">${renderSelfKnowledgeGuide()}</div></div>`;
      return;
    }

    if (!dataReady) { root.innerHTML = `<div class="ei-shell">${topNav}<div class="ei-source-status">${t('Conectando o histórico da sua conta…', 'Connecting your account history…')}</div></div>`; return; }
    try { analysis = M.analyze(readInput()); }
    catch (_) { root.innerHTML = `<div class="ei-shell">${topNav}${empty(t('Não foi possível ler seu Diário. Seus registros foram preservados; consulte o Diário para recuperar os dados.', 'Your Journal could not be read. Entries were preserved; open the Journal to recover them.'), true)}</div>`; return; }
    const a = analysis.current, b = analysis.previous || {}, patternList = showAllPatterns ? analysis.patterns : analysis.patterns.slice(0, 4), selectedPeriod = periods.find(p => p[0] === period);
    const improvement = b.execution !== null && b.execution !== undefined && a.execution !== null && a.execution - b.execution >= .5 || b.adherence !== null && b.adherence !== undefined && a.adherence !== null && a.adherence - b.adherence >= .1;
    root.innerHTML = `<div class="ei-shell">${topNav}<header class="ei-hero"><div class="ei-hero-icon">${icon('brain')}</div><div class="ei-hero-copy"><h1>${t('Psicologia do Trader · Analisador Emocional', 'Trader Psychology · Emotional Analyzer')}</h1><p>${t('Seus dados revelam padrões. Conheça a si mesmo e evolua todos os dias.', 'Your data reveals patterns. Know yourself and evolve every day.')}</p></div><blockquote>“${t('O mercado muda.<br>Seus padrões deixam rastros.', 'The market changes.<br>Your patterns leave traces.')}”</blockquote><label class="ei-period">${icon('calendar')}<select id="ei-period" aria-label="${t('Período da análise', 'Analysis period')}">${periods.map(([id, pt, english]) => `<option value="${id}" ${period === id ? 'selected' : ''}>${t(pt, english)}</option>`).join('')}</select></label></header>${sourceStatus ? `<div class="ei-source-status" role="status">${esc(sourceStatus)}</div>` : ''}<div class="ei-overview"><section class="ei-paper ei-state-panel"><div class="ei-heading"><div><h2>${t('Seu Estado Atual', 'Your Current State')}</h2><p>${t(selectedPeriod[1], selectedPeriod[2])} · ${a.records} ${t('registros do Diário', 'Journal entries')}</p></div></div><div class="ei-state-grid"><div class="ei-dominant"><div class="ei-seal">${icon('leaf')}</div><div><strong>${a.dominant ? esc(statesLabel([a.dominant])) : t('Em descoberta', 'Discovering')}</strong><small>${t('Estado predominante', 'Predominant state')}</small><br><span class="ei-badge">${improvement ? t('Tendência positiva', 'Positive trend') : t('Histórico em observação', 'History under observation')}</span></div></div><article class="ei-stat"><strong>${a.trades}</strong><span>${t('Trades abertos no período', 'Trades opened in this period')}</span>${delta(a.trades, analysis.previous && b.records ? b.trades : null, 'relative', null)}</article><article class="ei-stat"><strong>${format(a.access)}</strong><span>${t('Acessos registrados (média/dia)', 'Recorded accesses (daily average)')}</span>${delta(a.access, b.access, 'relative', null)}</article><article class="ei-stat"><strong>${pct(a.adherence)}</strong><span>${t('Aderência integral ao plano', 'Full plan adherence')}</span>${delta(a.adherence, b.adherence, 'percentage', true)}</article><article class="ei-stat"><strong>${format(a.execution)}<span>/10</span></strong><span>${t('Qualidade média da execução', 'Average execution quality')}</span>${delta(a.execution, b.execution, 'absolute', true)}</article></div><p class="ei-soft-note">${a.adherenceCount} ${t('dias com plano avaliado', 'days with plan ratings')} · ${a.executionCount} ${t('dias com execução avaliada', 'days with execution ratings')}. ${t('Resultados usam encerramentos e risco inicial documentado. Conta real e Paper são identificados nas evidências.', 'Results use exits and documented initial risk. Real and Paper accounts are identified in the evidence.')}</p></section><aside class="ei-quote"><p>${t('Autoconhecimento<br>é uma vantagem<br>competitiva.', 'Self-knowledge<br>is a competitive<br>advantage.')}</p></aside></div><div class="ei-main-grid"><section class="ei-paper"><div class="ei-heading"><div><h2>${t('Padrões Identificados', 'Identified Patterns')}</h2><p>${t('Baseado no seu histórico e nas relações recorrentes entre comportamento, emoção e execução.', 'Based on your history and recurring relationships between behaviour, emotion and execution.')}</p></div>${analysis.patterns.length > 4 ? `<button class="ei-button" data-action="patterns">${showAllPatterns ? t('Ver destaques', 'Show highlights') : t('Ver todos', 'View all')} →</button>` : ''}</div><div class="ei-pattern-list">${patternList.length ? patternList.map(p => `<button class="ei-pattern ${p.kind}" data-pattern="${p.id}"><span class="ei-pattern-icon">${icon(p.kind === 'positive' ? 'target' : p.kind === 'attention' ? 'brain' : 'trend')}</span><span class="ei-pattern-copy"><b>${esc(patternTitle(p))}</b><small>${t('Detectado em', 'Detected on')} ${p.count} ${t('ocasiões', 'occasions')} | ${t('Confiança', 'Confidence')}: ${confidenceLabel(p.confidence)}</small><p>${esc(patternCopy(p))}</p></span><span class="ei-chevron">›</span></button>`).join('') : empty(t('Ainda estamos conhecendo seus padrões. Continue registrando seu Diário do Trader para construir uma análise mais confiável.', 'We are still getting to know your patterns. Keep recording your Trader Journal to build a more reliable analysis.'), true)}</div><p class="ei-soft-note">${t('Associações exploratórias, não causalidade. Confiança reflete repetição e tamanho do grupo de comparação, não diagnóstico nem certeza estatística.', 'Exploratory associations, not causation. Confidence reflects repetition and comparison group size, not a diagnosis or statistical certainty.')}</p></section><section class="ei-paper"><div class="ei-heading"><div><h2>${t('Mapa de Estados', 'State Map')}</h2><p>${t('Cada ponto representa um dia do seu histórico.', 'Each point represents one day of your history.')}</p></div><span class="ei-button">${t(selectedPeriod[1], selectedPeriod[2])}</span></div>${scatterChart()}</section><aside class="ei-paper ei-contexts">${contextMarkup(analysis.contexts.best, false)}${contextMarkup(analysis.contexts.attention, true)}</aside></div><div class="ei-bottom-grid"><section class="ei-paper"><div class="ei-heading"><div><h2>${t('Linha do Tempo Emocional', 'Emotional Timeline')}</h2><p>${t('Evolução dos seus estados e da sua execução ao longo do tempo', 'Your states and execution over time')}</p></div></div><div class="ei-legend"><span><i class="ei-dot none"></i>${t('Ativação (1–5, eixo esquerdo)', 'Activation (1–5, left axis)')}</span><span><i class="ei-dot"></i>${t('Execução (0–10, eixo direito)', 'Execution (0–10, right axis)')}</span></div>${lineChart()}</section><section class="ei-paper"><div class="ei-heading"><div><h2>${t('Uso da Plataforma', 'Platform Usage')}</h2><p>${t('Seus hábitos de utilização', 'Your usage habits')} · ${t('Média diária', 'Daily average')}: <b>${format(a.access)}</b></p></div><button class="ei-button" data-action="usage">${usageMode === 'days' ? t('Por horário', 'By hour') : t('Por dia', 'By day')}</button></div>${usageChart()}</section><section class="ei-paper ei-relations"><div class="ei-heading"><div><h2>${t('Associação de Fatores', 'Factor Associations')}</h2><p>${t('Como diferentes fatores aparecem relacionados no seu histórico.', 'How different factors appear related in your history.')}</p></div></div>${analysis.relationships.map(r => `<button class="ei-relation" data-relation="${r.id}"><span>${esc(en() ? ({ 'emotion-access': 'Activation × Accesses', 'emotion-execution': 'Activation × Execution', 'access-trades': 'Accesses × Trade count', 'access-plan': 'Accesses × Adherence', 'market-emotion': 'Market × Activation' })[r.id] : r.label)}</span><span class="ei-relation-track"><i style="width:${r.value === null ? 0 : Math.abs(r.value) * 100}%"></i></span><small>${r.value === null ? t('Poucos dados', 'Sparse data') : `${r.value < 0 ? '↘' : '↗'} ${format(Math.abs(r.value), 2)}`}</small></button>`).join('')}<button class="ei-relation" data-action="weekday"><span>${t('Dia da semana × Resultado', 'Weekday × Result')}</span><span class="ei-relation-track"></span><small>${t('Estudar', 'Explore')} →</small></button><p class="ei-soft-note">${t('Sono × Execução: sono ainda não é registrado. Barras medem a intensidade da associação; setas indicam a direção. São necessários 7 pares válidos e variação nos dois fatores.', 'Sleep × Execution: sleep is not yet recorded. Bars show association strength; arrows indicate direction. At least 7 valid pairs and variation in both factors are required.')}</p></section></div>${comparisonMarkup()}<footer class="ei-footer"><span>${t('Diário: registrar → Biblioteca: estudar trades → Inteligência Emocional: descobrir padrões.', 'Journal: record → Library: study trades → Emotional Intelligence: discover patterns.')}</span><em>${t('Pequenas melhorias. Grandes resultados.', 'Small improvements. Great results.')}</em></footer></div><div class="ei-tooltip" hidden></div>`;
  }
  function evidenceEvents(days) {
    return [...days].sort((a, b) => b.date.localeCompare(a.date)).map(d => `<article class="ei-event"><h3>${dateLabel(d.date)}</h3><b>${esc(statesLabel(d.states) || t('Emoção não informada', 'Emotion not recorded'))}</b><div class="ei-event-stats"><span>${t('Intensidade', 'Intensity')}: ${d.intensity ?? '—'}</span><span>${d.access ?? '—'} ${t('acessos registrados', 'recorded accesses')}</span><span>${t('Execução', 'Execution')}: ${format(d.execution)}/10</span><span>${t('Plano', 'Plan')}: ${pct(d.adherence)}</span><span>${t('Resultado', 'Result')}: ${rLabel(d.resultR)}</span><span>${d.entries.length} ${t('novas operações', 'new entries')}</span></div>${d.note ? `<p>“${esc(d.note)}”</p>` : ''}${d.observations ? `<details><summary>${t('Observações do Diário', 'Journal observations')}</summary><p>${esc(d.observations)}</p></details>` : ''}${d.trades.length ? `<p>${d.trades.map(trade => `${esc(trade.asset)} · ${esc(trade.setup || '—')} · ${trade.mode === 'paper' ? 'Paper' : t('Real', 'Real')} · ${rLabel(trade.closedDate && trade.closedDate <= analysis.bounds.end ? trade.resultR : null)}`).join('<br>')}</p>` : ''}${d.areas && Object.keys(d.areas).length ? `<details><summary>${t("Áreas consultadas", "Areas visited")}</summary><p>${Object.entries(d.areas).map(([area, count]) => `${esc(typeof titles !== "undefined" ? titles[area] || area : area)}: ${count}`).join(" · ")}</p></details>` : ""}${d.sessions.length ? `<details><summary>${t('Horários de acesso', 'Access times')}</summary><p>${d.sessions.map(s => new Date(s.openedAt).toLocaleTimeString(en() ? 'en-US' : 'pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })).join(' · ')} (${t('Brasília', 'São Paulo time')})</p></details>` : ''}${d.recordId ? `<button data-journal-record="${esc(d.recordId)}">${t('Abrir o registro original no Diário →', 'Open the original Journal entry →')}</button>` : ''}</article>`).join('');
  }
  function showEvidence(title, days, method, controls = []) {
    document.querySelector('.ei-evidence-dialog')?.remove();
    const dialog = document.createElement('dialog'); dialog.className = 'ei-evidence-dialog';
    dialog.innerHTML = `<header><div><small>${t('Evidências do padrão', 'Pattern evidence')}</small><h2>${esc(title)}</h2><span>${days.length} ${t('ocorrências encontradas', 'occurrences found')}</span></div><button class="ei-close" aria-label="${t('Fechar', 'Close')}">×</button></header><div class="ei-evidence-body"><div class="ei-method">${esc(method)}</div>${evidenceEvents(days)}${controls.length ? `<details><summary>${controls.length} ${t('dias do grupo de comparação', 'comparison group days')}</summary>${evidenceEvents(controls)}</details>` : ''}</div><div class="ei-evidence-footer">${t('O Diário registra. A Inteligência Emocional analisa. Associações observadas não estabelecem causalidade nem diagnóstico psicológico.', 'The Journal records. Emotional Intelligence analyses. Observed associations do not establish causation or a psychological diagnosis.')}</div>`;
    document.body.append(dialog); dialog.querySelector('.ei-close').onclick = () => dialog.close();
    dialog.addEventListener('close', () => dialog.remove());
    dialog.addEventListener('click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) dialog.close(); } const button = event.target.closest('[data-journal-record]'); if (button) { dialog.close(); window.openJournalRecord?.(button.dataset.journalRecord); } });
    dialog.showModal();
  }
  async function loadAccess() {
    const id = ++requestId;
    if (!window.healthyTrendApi?.isAuthenticated?.()) { accessState = 'idle'; sessions = []; sourceStatus = t('Entre na sua conta para conectar o histórico de acessos. A análise do Diário disponível já aparece abaixo.', 'Sign in to connect access history. Available Journal analysis is shown below.'); render(); return; }
    accessState = 'loading'; sourceStatus = t('Conectando seu histórico de acessos…', 'Connecting your access history…'); render();
    try { const response = await window.healthyTrendApi.request('/api/platform-access/sessions?days=all'); if (id !== requestId) return; sessions = response.sessions || []; accessState = 'loaded'; sourceStatus = sessions.length ? '' : t('Ainda não há sessões registradas em Uso da Plataforma. As associações de acesso aparecerão conforme o histórico for construído.', 'Platform Usage has no recorded sessions yet. Access associations appear as history accumulates.'); }
    catch (_) { if (id !== requestId) return; sessions = []; accessState = 'error'; sourceStatus = t('Não foi possível conectar Uso da Plataforma. Emoções, execução e trades continuam disponíveis; métricas de acesso não foram estimadas.', 'Platform Usage could not be connected. Emotions, execution and trades remain available; no access metrics were estimated.'); }
    render();
  }
  root.addEventListener('change', event => { if (event.target.id === 'ei-period') { period = event.target.value; showAllPatterns = false; render(); } });
  root.addEventListener('click', event => {
    const button = event.target.closest('button,[data-day]'); if (!button) return;
    if (button.dataset.action === 'journal') window.go('journal');
    if (button.dataset.action === 'patterns') { showAllPatterns = !showAllPatterns; render(); }
    if (button.dataset.action === 'usage') { usageMode = usageMode === 'days' ? 'hours' : 'days'; render(); }
    if (button.dataset.pattern) { const p = analysis.patterns.find(p => p.id === button.dataset.pattern); showEvidence(patternTitle(p), p.days, `${en() ? patternCopy(p) : p.explanation} ${t('Confiança', 'Confidence')}: ${confidenceLabel(p.confidence)} · ${p.count} / ${p.controlCount} ${t('dias nos grupos. Baixa: ≥3; média: ≥7 ocorrências e ≥5 controles; alta: ≥15 e ≥8 controles. Exploração estatística, sem teste de causalidade.', 'days in the groups. Low: ≥3; medium: ≥7 occurrences and ≥5 controls; high: ≥15 and ≥8 controls. Statistical exploration, no causality test.')}`, p.control); }
    if (button.dataset.context) { const c = analysis.contexts[button.dataset.context]; showEvidence(statesLabel(c.title.split(' + ')), c.days, t('Agrupamento por estados selecionados e faixa de intensidade. Contextos exigem pelo menos 3 dias com execução informada. Resultado médio usa apenas trades encerrados com R calculável.', 'Grouped by selected states and intensity band. Contexts require at least 3 days with execution scores. Average result uses only exited trades with calculable R.')); }
    if (button.dataset.day) { const d = analysis.days.find(d => d.date === button.dataset.day); showEvidence(dateLabel(d.date), [d], t('Este ponto é um registro real do seu histórico. Os números abaixo vêm do Diário, dos acessos e dos trades conectados por data.', 'This point is an actual historical entry. Values come from the Journal, recorded accesses and trades connected by date.')); }
    if (button.dataset.relation) { const relation = analysis.relationships.find(r => r.id === button.dataset.relation); const fields = { 'emotion-access': ['intensity', 'access'], 'emotion-execution': ['intensity', 'execution'], 'access-trades': ['access', null], 'access-plan': ['access', 'adherence'], 'market-emotion': ['market', 'intensity'] }[relation.id]; const rows = analysis.days.filter(d => fields.every(field => !field || d[field] != null)); showEvidence(button.querySelector('span').textContent, rows, t(`Associação de Pearson: ${format(relation.value, 2)}; ${relation.count} pares válidos. Valores próximos de zero indicam associação linear fraca; positivos caminham juntos, negativos em direções opostas. Mercado: down=0, transição=1, saudável=2. Não prova causalidade.`, `Pearson association: ${format(relation.value, 2)}; ${relation.count} valid pairs. Near zero means weak linear association; positive values move together, negative values in opposite directions. Market: down=0, transition=1, healthy=2. This does not prove causality.`)); }
    if (button.dataset.action === 'weekday') { const weekday = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'], english = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']; const method = analysis.weekday.map(d => `${en() ? english[d.day] : weekday[d.day]}: ${rLabel(d.resultR)} (${d.resultsCount} ${t('trades com R', 'trades with R')})`).join(' · '); showEvidence(t('Dia da semana × Resultado', 'Weekday × Result'), analysis.days.filter(d => d.results.length), method || t('Sem resultados disponíveis.', 'No results available.')); }
  });
  root.addEventListener('keydown', event => { const point = event.target.closest('[data-day]'); if (point && ['Enter', ' '].includes(event.key)) { event.preventDefault(); point.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
  root.addEventListener('pointermove', event => { const point = event.target.closest('[data-day]'), tooltip = root.querySelector('.ei-tooltip'); if (!tooltip) return; tooltip.hidden = !point; if (point) { tooltip.textContent = dayTooltip(analysis.days.find(d => d.date === point.dataset.day)); tooltip.style.left = `${Math.min(event.clientX + 14, window.innerWidth - 260)}px`; tooltip.style.top = `${Math.min(event.clientY + 12, window.innerHeight - 170)}px`; } });
  root.addEventListener('pointerleave', () => { const tooltip = root.querySelector('.ei-tooltip'); if (tooltip) tooltip.hidden = true; });
  const previousGo = window.go;
  window.go = function (id) { previousGo(id); if (id === 'emotionalintelligence' && root.classList.contains('active')) { render(); if (accessState !== 'loading') loadAccess(); } };
  window.renderEmotionalIntelligence = render;
  window.addEventListener('healthyTrend:authenticated', () => { sessions = []; requestId++; accessState = 'idle'; tradesReady = false; dataReady = false; document.querySelector('.ei-evidence-dialog')?.remove(); root.innerHTML = ''; });
  window.addEventListener('healthyTrend:tradesUpdated', () => { tradesReady = true; if (root.classList.contains('active')) render(); });
  window.addEventListener('healthyTrend:workspaceLoaded', () => { dataReady = true; sessions = []; requestId++; accessState = 'idle'; sourceStatus = ''; render(); if (root.classList.contains('active')) loadAccess(); });
  window.addEventListener('healthyTrend:logout', () => { sessions = []; requestId++; accessState = 'idle'; sourceStatus = ''; document.querySelector('.ei-evidence-dialog')?.remove(); render(); });
  if (typeof window.signOutWorkspace === 'function') { const signOut = window.signOutWorkspace; window.signOutWorkspace = async function () { sessions = []; requestId++; accessState = 'idle'; tradesReady = false; document.querySelector('.ei-evidence-dialog')?.remove(); root.innerHTML = ''; return signOut(); }; }
  render();
}());

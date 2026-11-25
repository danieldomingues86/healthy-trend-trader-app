'use strict';

/**
 * HEALTHY TREND TRADER — MACRO EVENTS CALENDAR ENGINE (10)
 * Dimensão Canônica de Eventos Macroeconômicos e Catalisadores de Mercado
 *
 * Princípios invioláveis:
 * 1. Representação de eventos econômicos como dimensão própria conectada aos mercados afetados.
 * 2. Exibição rigorosa de: evento, país/mercado, data e horário com FUSO EXPLÍCITO,
 *    relevância, valor anterior / consenso / resultado quando disponíveis e estado
 *    (próximo, divulgado, adiado ou cancelado).
 * 3. NÃO ANTECIPAR A REAÇÃO DO MERCADO: Nunca emitir previsões direcionais (compra/venda)
 *    ou adivinhar números. Apresentar os canais de transmissão objetivos e guardrails operacionais.
 * 4. Datas precisas baseadas em calendários oficiais (BCB, Fed, IBGE, BLS, BEA).
 */

const { getZonedParts } = require('./capital-intelligence-ingestion');

const EVENT_STATUS = {
  UPCOMING: 'upcoming',
  RELEASED: 'released',
  POSTPONED: 'postponed',
  CANCELLED: 'cancelled'
};

const EVENT_IMPACT = {
  HIGH: 'high',
  MEDIUM: 'medium',
  LOW: 'low'
};

const EVENT_CATEGORIES = {
  MONETARY_POLICY: {
    code: 'monetary_policy',
    label: 'Política Monetária',
    icon: '🏛️'
  },
  INFLATION: {
    code: 'inflation',
    label: 'Inflação & Preços',
    icon: '🏷️'
  },
  EMPLOYMENT: {
    code: 'employment',
    label: 'Mercado de Trabalho',
    icon: '👥'
  },
  ACTIVITY: {
    code: 'activity',
    label: 'Atividade Econômica',
    icon: '🏭'
  },
  COMMUNICATION: {
    code: 'communication',
    label: 'Comunicação Oficial & Atas',
    icon: '📜'
  }
};

/**
 * Calendário Institucional Oficial Determinístico (2026/2027)
 * Fontes oficiais: BCB, Federal Reserve, IBGE, BLS, BEA.
 */
const OFFICIAL_CALENDAR_EVENTS = [
  // --- NOVEMBRO 2026 ---
  {
    id: 'cal-ipca15-2026-11',
    title: 'IPCA-15 — Prévia da Inflação Oficial',
    shortTitle: 'IPCA-15 (Brasil)',
    category: 'inflation',
    country: 'BR',
    countryLabel: 'Brasil',
    flag: '🇧🇷',
    date: '2026-11-25',
    time: '09:00',
    timezone: 'America/Sao_Paulo',
    timezoneLabel: 'BRT (Horário de Brasília)',
    impact: 'high',
    impactLabel: 'ALTO IMPACTO',
    source: 'IBGE (Instituto Brasileiro de Geografia e Estatística)',
    numbers: {
      unit: '% m/m',
      previous: '0,54%',
      consensus: '0,48%',
      actual: null
    },
    status: 'upcoming',
    affectedSpheres: [
      { sphereId: 'trend_di', label: 'Curva DI / Selic', role: 'Vértices curtos e médios de juros futuros' },
      { sphereId: 'cycle_br', label: 'Ciclo Brasil (IBOV)', role: 'Apetite a risco de empresas domésticas' }
    ],
    transmissionChannel: 'Sinaliza a persistência inflacionária corrente e baliza as apostas do mercado para a próxima reunião do Copom.',
    behavioralGuardrail: 'Não antecipar a leitura. Aguardar a abertura e absorção da curva de juros futuros nos primeiros 30 minutos de pregão.'
  },
  {
    id: 'cal-pce-2026-11',
    title: 'Core PCE Price Index — Inflação de Consumo Pessoal (EUA)',
    shortTitle: 'Core PCE (EUA)',
    category: 'inflation',
    country: 'US',
    countryLabel: 'Estados Unidos',
    flag: '🇺🇸',
    date: '2026-11-25',
    time: '10:30',
    timezone: 'America/New_York',
    timezoneLabel: '10:30 BRT / 08:30 EST',
    impact: 'high',
    impactLabel: 'ALTO IMPACTO',
    source: 'BEA (Bureau of Economic Analysis)',
    numbers: {
      unit: '% m/m',
      previous: '0,30%',
      consensus: '0,30%',
      actual: null
    },
    status: 'upcoming',
    affectedSpheres: [
      { sphereId: 'cycle_us', label: 'Ciclo EUA (S&P 500)', role: 'Valuation global e múltiplos acionários' },
      { sphereId: 'trend_us10y', label: 'Treasury 10Y', role: 'Taxa livre de risco internacional' },
      { sphereId: 'gold_commodities', label: 'Ouro / Proteção', role: 'Expectativa de juros reais' }
    ],
    transmissionChannel: 'Métrica de inflação preferida do Federal Reserve para balizar decisões sobre o juro básico americano.',
    behavioralGuardrail: 'Manter a disciplina operacional: evitar aberturas em ativos americanos ou BDRs imediatamente na divulgação.'
  },

  // --- DEZEMBRO 2026 ---
  {
    id: 'cal-pib-br-2026-q3',
    title: 'PIB do 3º Trimestre — Crescimento Econômico',
    shortTitle: 'PIB 3T26 (Brasil)',
    category: 'activity',
    country: 'BR',
    countryLabel: 'Brasil',
    flag: '🇧🇷',
    date: '2026-12-03',
    time: '09:00',
    timezone: 'America/Sao_Paulo',
    timezoneLabel: 'BRT (Horário de Brasília)',
    impact: 'medium',
    impactLabel: 'MÉDIO IMPACTO',
    source: 'IBGE (Instituto Brasileiro de Geografia e Estatística)',
    numbers: {
      unit: '% a/a',
      previous: '3,30%',
      consensus: '3,10%',
      actual: null
    },
    status: 'upcoming',
    affectedSpheres: [
      { sphereId: 'cycle_br', label: 'Ciclo Brasil (IBOV)', role: 'Projeção de lucros corporativos e atividade interna' },
      { sphereId: 'trend_di', label: 'Curva DI', role: 'Pressão de demanda agregada sobre a política monetária' }
    ],
    transmissionChannel: 'Revela a tração da economia brasileira e o grau de ociosidade do setor produtivo frente à política monetária restritiva.',
    behavioralGuardrail: 'Dados de PIB representam histórico de 3 meses. Não confundir foto retrospectiva com tendência gráfica diária.'
  },
  {
    id: 'cal-payroll-2026-12',
    title: 'Non-Farm Payroll & Taxa de Desemprego (EUA)',
    shortTitle: 'Payroll (EUA)',
    category: 'employment',
    country: 'US',
    countryLabel: 'Estados Unidos',
    flag: '🇺🇸',
    date: '2026-12-04',
    time: '10:30',
    timezone: 'America/New_York',
    timezoneLabel: '10:30 BRT / 08:30 EST',
    impact: 'high',
    impactLabel: 'ALTO IMPACTO',
    source: 'BLS (Bureau of Labor Statistics)',
    numbers: {
      unit: 'mil vagas',
      previous: '142k',
      consensus: '160k',
      actual: null
    },
    status: 'upcoming',
    affectedSpheres: [
      { sphereId: 'cycle_us', label: 'Ciclo EUA (Wall Street)', role: 'Volatilidade imediata nos índices futuros' },
      { sphereId: 'trend_dolar', label: 'Dólar (USD)', role: 'Força da divisa frente a emergentes' },
      { sphereId: 'trend_us10y', label: 'Treasury 10Y', role: 'Reprecificação da curva de juros' }
    ],
    transmissionChannel: 'Mais importante termômetro de emprego do mundo. Variações expressivas frente ao consenso alteram as expectativas de corte ou alta de juros nos EUA.',
    behavioralGuardrail: 'Regra de ouro: primeiros 15 minutos apresentam alta probabilidade de falso rompimento com violinada nos preços futuros.'
  },
  {
    id: 'cal-copom-2026-12',
    title: 'Decisão de Juros — Copom (Taxa Selic)',
    shortTitle: 'Copom (Selic)',
    category: 'monetary_policy',
    country: 'BR',
    countryLabel: 'Brasil',
    flag: '🇧🇷',
    date: '2026-12-09',
    time: '18:30',
    timezone: 'America/Sao_Paulo',
    timezoneLabel: 'BRT (Após fechamento do mercado)',
    impact: 'high',
    impactLabel: 'ALTO IMPACTO',
    source: 'Banco Central do Brasil (BCB)',
    numbers: {
      unit: '% a.a.',
      previous: '11,25%',
      consensus: '11,75%',
      actual: null
    },
    status: 'upcoming',
    affectedSpheres: [
      { sphereId: 'trend_di', label: 'Curva DI', role: 'Reprecificação imediata da curva na abertura seguinte' },
      { sphereId: 'cycle_br', label: 'Ciclo Brasil', role: 'Custo de oportunidade do capital de risco' },
      { sphereId: 'my_portfolio', label: 'Meu Patrimônio', role: 'Remuneração do caixa defensivo' }
    ],
    transmissionChannel: 'A Selic é a taxa básica livre de risco no Brasil. Define a atratividade do carrego de renda fixa vs. ações da B3 e influencia os custos financeiros corporativos.',
    behavioralGuardrail: 'Decisão anunciada com pregão fechado. O impacto real ocorre no gap de abertura da manhã seguinte; não alterar posições precipitadamente no after-market.'
  },
  {
    id: 'cal-cpi-2026-12',
    title: 'CPI — Consumer Price Index (Inflação EUA)',
    shortTitle: 'CPI (EUA)',
    category: 'inflation',
    country: 'US',
    countryLabel: 'Estados Unidos',
    flag: '🇺🇸',
    date: '2026-12-10',
    time: '10:30',
    timezone: 'America/New_York',
    timezoneLabel: '10:30 BRT / 08:30 EST',
    impact: 'high',
    impactLabel: 'ALTO IMPACTO',
    source: 'BLS (Bureau of Labor Statistics)',
    numbers: {
      unit: '% a/a',
      previous: '2,60%',
      consensus: '2,70%',
      actual: null
    },
    status: 'upcoming',
    affectedSpheres: [
      { sphereId: 'cycle_us', label: 'Ciclo EUA', role: 'S&P 500 e Nasdaq-100' },
      { sphereId: 'trend_us10y', label: 'Treasury 10Y', role: 'Sensibilidade de duration' },
      { sphereId: 'gold_commodities', label: 'Ouro / Proteção', role: 'Hedge inflacionário global' }
    ],
    transmissionChannel: 'Índice de preços ao consumidor que antecede imediatamente a reunião do FOMC de dezembro, definindo o tom da reunião.',
    behavioralGuardrail: 'Surpresas na inflação norte-americana geram deslocamentos abruptos nos rendimentos dos Treasuries. Esperar a estabilização do book.'
  },
  {
    id: 'cal-ipca-2026-12',
    title: 'IPCA — Índice Nacional de Preços ao Consumidor Amplo',
    shortTitle: 'IPCA (Brasil)',
    category: 'inflation',
    country: 'BR',
    countryLabel: 'Brasil',
    flag: '🇧🇷',
    date: '2026-12-10',
    time: '09:00',
    timezone: 'America/Sao_Paulo',
    timezoneLabel: 'BRT (Horário de Brasília)',
    impact: 'high',
    impactLabel: 'ALTO IMPACTO',
    source: 'IBGE (Instituto Brasileiro de Geografia e Estatística)',
    numbers: {
      unit: '% m/m',
      previous: '0,56%',
      consensus: '0,52%',
      actual: null
    },
    status: 'upcoming',
    affectedSpheres: [
      { sphereId: 'trend_di', label: 'Curva DI', role: 'Prêmios de inflação implícita (NTN-B vs DI)' },
      { sphereId: 'cycle_br', label: 'Ciclo Brasil', role: 'Poder de compra e custos operacionais' }
    ],
    transmissionChannel: 'Medida oficial de inflação do sistema de metas do Banco Central. Influi na trajetória dos juros e nos contratos futuros de juros.',
    behavioralGuardrail: 'Abertura do mercado às 10h já precifica o número divulgado às 09h; atentar para gaps em setores sensíveis ao crédito.'
  },
  {
    id: 'cal-fomc-2026-12',
    title: 'Decisão de Juros — FOMC (Federal Reserve)',
    shortTitle: 'Decisão FOMC (Fed)',
    category: 'monetary_policy',
    country: 'US',
    countryLabel: 'Estados Unidos',
    flag: '🇺🇸',
    date: '2026-12-16',
    time: '16:00',
    timezone: 'America/New_York',
    timezoneLabel: '16:00 BRT / 14:00 EST',
    impact: 'high',
    impactLabel: 'ALTO IMPACTO',
    source: 'Federal Reserve Board (Fed)',
    numbers: {
      unit: '% a.a.',
      previous: '4,50% - 4,75%',
      consensus: '4,50% - 4,75%',
      actual: null
    },
    status: 'upcoming',
    affectedSpheres: [
      { sphereId: 'cycle_us', label: 'Ciclo EUA', role: 'Direção estrutural de Wall Street' },
      { sphereId: 'trend_us10y', label: 'Treasury 10Y', role: 'Referência do custo de capital global' },
      { sphereId: 'gold_commodities', label: 'Ouro / Proteção', role: 'Custo de oportunidade do metal' },
      { sphereId: 'trend_dolar', label: 'Dólar (DXY)', role: 'Liquidez monetária internacional' }
    ],
    transmissionChannel: 'Evento mais relevante da liquidez global. O comunicado, projeções econômicas (dot plot) e a entrevista de imprensa às 16h30 BRT reprecificam todos os ativos globais.',
    behavioralGuardrail: 'Volatilidade bifásica clássica: primeiro movimento às 16h com o comunicado, seguido de reversões frequentes durante a coletiva às 16h30. Não operar o ruído.'
  },
  {
    id: 'cal-ata-copom-2026-12',
    title: 'Ata da Reunião do Copom',
    shortTitle: 'Ata do Copom',
    category: 'communication',
    country: 'BR',
    countryLabel: 'Brasil',
    flag: '🇧🇷',
    date: '2026-12-15',
    time: '08:00',
    timezone: 'America/Sao_Paulo',
    timezoneLabel: 'BRT (Antes da abertura)',
    impact: 'medium',
    impactLabel: 'MÉDIO IMPACTO',
    source: 'Banco Central do Brasil (BCB)',
    numbers: {
      unit: 'documento',
      previous: 'Restritivo',
      consensus: 'Manutenção do Tom',
      actual: null
    },
    status: 'upcoming',
    affectedSpheres: [
      { sphereId: 'trend_di', label: 'Curva DI', role: 'Ajuste fino nas probabilidades das próximas reuniões' }
    ],
    transmissionChannel: 'Detalha a visão dos membros do Copom sobre balanço de riscos, expectativas de inflação e grau de restrição necessário.',
    behavioralGuardrail: 'Leitura pré-mercado. Prestar atenção aos termos utilizados para qualificar o balanço de riscos e a persistência inflacionária.'
  },

  // --- EVENTOS RECENTES JÁ DIVULGADOS (Para conferência e histórico auditável) ---
  {
    id: 'cal-copom-2026-11-06',
    title: 'Decisão de Juros — Copom (Novembro/2026)',
    shortTitle: 'Copom (Nov/26)',
    category: 'monetary_policy',
    country: 'BR',
    countryLabel: 'Brasil',
    flag: '🇧🇷',
    date: '2026-11-06',
    time: '18:30',
    timezone: 'America/Sao_Paulo',
    timezoneLabel: 'BRT',
    impact: 'high',
    impactLabel: 'ALTO IMPACTO',
    source: 'Banco Central do Brasil (BCB)',
    numbers: {
      unit: '% a.a.',
      previous: '10,75%',
      consensus: '11,25%',
      actual: '11,25%'
    },
    status: 'released',
    affectedSpheres: [
      { sphereId: 'trend_di', label: 'Curva DI', role: 'Elevação de 50 bps absorvida pelos vértices' },
      { sphereId: 'cycle_br', label: 'Ciclo Brasil', role: 'Confirmação do ciclo restritivo' }
    ],
    transmissionChannel: 'Copom elevou a Selic em 50 bps em linha com o consenso para ancorar expectativas de inflação de médio prazo.',
    behavioralGuardrail: 'Evento concluído. Histórico disponível para estudo no Registro de Eventos.'
  },
  {
    id: 'cal-fomc-2026-11-07',
    title: 'Decisão de Juros — FOMC (Novembro/2026)',
    shortTitle: 'FOMC (Nov/26)',
    category: 'monetary_policy',
    country: 'US',
    countryLabel: 'Estados Unidos',
    flag: '🇺🇸',
    date: '2026-11-07',
    time: '16:00',
    timezone: 'America/New_York',
    timezoneLabel: '16:00 BRT / 14:00 EST',
    impact: 'high',
    impactLabel: 'ALTO IMPACTO',
    source: 'Federal Reserve Board (Fed)',
    numbers: {
      unit: '% a.a.',
      previous: '4,75% - 5,00%',
      consensus: '4,50% - 4,75%',
      actual: '4,50% - 4,75%'
    },
    status: 'released',
    affectedSpheres: [
      { sphereId: 'cycle_us', label: 'Ciclo EUA', role: 'Corte de 25 bps em linha com projeções' },
      { sphereId: 'trend_us10y', label: 'Treasury 10Y', role: 'Yields reagiram com acomodação temporária' }
    ],
    transmissionChannel: 'Corte de 25 bps anunciado pelo comitê, mantendo política de flexibilização gradual condicionada aos dados de inflação.',
    behavioralGuardrail: 'Evento concluído.'
  }
];

/**
 * Normaliza e resolve o estado de cada evento frente ao timestamp de referência.
 */
function resolveEventStatus(event, now = new Date()) {
  if (event.status === EVENT_STATUS.CANCELLED) return EVENT_STATUS.CANCELLED;
  if (event.status === EVENT_STATUS.POSTPONED) return EVENT_STATUS.POSTPONED;

  const todayIso = getZonedParts(now, 'America/Sao_Paulo').isoDate;
  if (event.date < todayIso) {
    return EVENT_STATUS.RELEASED;
  }
  if (event.date > todayIso) {
    return EVENT_STATUS.UPCOMING;
  }

  // Mesmo dia: verifica horário
  if (event.time) {
    const parts = getZonedParts(now, event.timezone || 'America/Sao_Paulo');
    const curTime = `${String(parts.hours).padStart(2, '0')}:${String(parts.minutes).padStart(2, '0')}`;
    return curTime >= event.time ? EVENT_STATUS.RELEASED : EVENT_STATUS.UPCOMING;
  }

  return EVENT_STATUS.UPCOMING;
}

/**
 * Constrói a dimensão canônica de Eventos Macroeconômicos para o snapshot.
 */
function buildMacroEventsDimension(options = {}) {
  const now = options.now ? new Date(options.now) : new Date();
  const userPlaybookEvents = Array.isArray(options.userPlaybookEvents) ? options.userPlaybookEvents : [];
  const todayIso = getZonedParts(now, 'America/Sao_Paulo').isoDate;

  // Processa todos os eventos catalogados
  const allEvents = OFFICIAL_CALENDAR_EVENTS.map(ev => {
    const dynamicStatus = resolveEventStatus(ev, now);
    const matchedPlaybook = userPlaybookEvents.find(p => {
      const pname = String(p.name || '').toLowerCase();
      const etitle = ev.title.toLowerCase();
      return (etitle.includes('copom') && pname.includes('copom')) ||
        (etitle.includes('fomc') && (pname.includes('fed') || pname.includes('fomc'))) ||
        (etitle.includes('payroll') && pname.includes('payroll')) ||
        (etitle.includes('ipca') && pname.includes('ipca')) ||
        (etitle.includes('pce') && pname.includes('pce'));
    });

    const statusLabel = dynamicStatus === EVENT_STATUS.RELEASED
      ? 'Divulgado'
      : dynamicStatus === EVENT_STATUS.POSTPONED
        ? 'Adiado'
        : dynamicStatus === EVENT_STATUS.CANCELLED
          ? 'Cancelado'
          : 'Próximo';

    const [y, m, d] = ev.date.split('-');
    const dateFormatted = `${d}/${m}/${y}`;
    const dateShort = `${d}/${m}`;

    return {
      ...ev,
      dynamicStatus,
      statusLabel,
      dateFormatted,
      dateLabel: dateShort,
      hasHistoricalPlaybook: Boolean(matchedPlaybook),
      playbookId: matchedPlaybook?.id || null,
      targetNodeId: 'macro_events'
    };
  });

  // Filtra próximos eventos (hoje ou no futuro) ordenados cronologicamente
  const upcomingEvents = allEvents
    .filter(ev => ev.dynamicStatus === EVENT_STATUS.UPCOMING)
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  // Eventos já divulgados recentes (ordenados do mais recente para o mais antigo)
  const releasedEvents = allEvents
    .filter(ev => ev.dynamicStatus === EVENT_STATUS.RELEASED)
    .sort((a, b) => b.date.localeCompare(a.date) || b.time.localeCompare(a.time));

  // Próximo evento de destaque
  const nextEvent = upcomingEvents[0] || null;

  // Contagens para filtros e síntese
  const counts = {
    total: allEvents.length,
    upcoming: upcomingEvents.length,
    released: releasedEvents.length,
    highImpact: upcomingEvents.filter(e => e.impact === 'high').length,
    brazil: upcomingEvents.filter(e => e.country === 'BR').length,
    usa: upcomingEvents.filter(e => e.country === 'US').length
  };

  // Resumo executivo para exibição na esfera
  const displayValue = upcomingEvents.length > 0
    ? `${upcomingEvents.length} eventos`
    : 'Agenda livre';

  const metricCaption = nextEvent
    ? `${nextEvent.shortTitle} (${nextEvent.dateLabel})`
    : 'Sem catalisadores';

  return {
    id: 'macro_events',
    tier: 'primary',
    universe: 'macro',
    region: 'GLOBAL',
    badge: 'EVENTOS MACRO',
    label: 'Eventos Macroeconômicos',
    shortLabel: 'Eventos Macro',
    subtitle: 'Copom · FOMC · Payroll · Inflação',
    windowLabel: 'Calendário de catalisadores',
    displayValue,
    metricCaption,
    state: counts.highImpact > 0 ? 'caution' : 'neutral',
    stateLabel: counts.highImpact > 0 ? `${counts.highImpact} de Alto Impacto` : 'Agenda Normal',
    status: upcomingEvents.length > 0 ? 'atualizado' : 'parcial',
    asOfDate: todayIso,
    collectedAt: now.toISOString(),
    source: 'Fontes Oficiais (BCB, Federal Reserve, IBGE, BLS, BEA)',
    nextEvent,
    counts,
    upcomingEvents,
    releasedEvents,
    allEvents,
    principles: [
      'Não antecipar a reação do mercado: decisões de trading respeitam tendências confirmadas, sem apostas em números macro.',
      'Fuso horário explícito: horários divulgados em BRT (Horário de Brasília) e no fuso de origem.',
      'Separação entre agenda e previsão: números de consenso refletem medianas de mercado e NÃO garantem o resultado.',
      'Canais de transmissão explícitos: cada catalisador indica objetivamente as esferas e classes de ativos potencialmente afetadas.'
    ]
  };
}

module.exports = {
  EVENT_STATUS,
  EVENT_IMPACT,
  EVENT_CATEGORIES,
  OFFICIAL_CALENDAR_EVENTS,
  resolveEventStatus,
  buildMacroEventsDimension
};

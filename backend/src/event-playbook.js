'use strict';

const crypto = require('node:crypto');
const database = require('./database');

const CATEGORIES = [
  'Todos',
  'Política',
  'Macro',
  'Geopolítica',
  'Earnings',
  'Tarifas',
  'Banco Central',
  'Commodities',
  'Black Swan',
  'Outros'
];

const DEFAULT_SEEDS = [
  {
    id: 'evt-payroll',
    name: 'Payroll (EUA)',
    eventDate: '2026-10-07',
    eventTime: '09:30',
    timezone: 'America/Sao_Paulo',
    category: 'Macro',
    impact: 5,
    impactLevel: 'ALTO',
    country: 'EUA',
    relatedAssets: 'EUA / Dólar / Índices',
    affectedAssets: 'SPX, NDX, DXY, DI1F29',
    description: 'Relatório mensal de criação de empregos e taxa de desemprego nos Estados Unidos.',
    whatHappened: 'Criação de vagas acima do esperado provocou repique inicial dos yields dos Treasuries e correção pontual nos índices futuros.',
    marketReaction: 'Abertura volátil com absorção compradora após 30 minutos de negociação.',
    volatilityBehavior: 'Expansão rápida seguida de absorção',
    initialDirection: 'Baixa',
    gap: '-0.4%',
    volume: '2.1x média',
    atr: '1.8x ATR diário',
    impactDuration: '2 a 4 horas',
    tradingImplications: 'Aguardar 30 minutos após a divulgação antes de abrir novas posições. Não antecipar o número.',
    lessonsLearned: 'Evitar antecipar número de emprego. A primeira vela de 15m quase sempre tem falso rompimento com violinada.',
    tags: ['Emprego', 'Fed', 'Macro EUA', 'Dólar'],
    sources: ['Bureau of Labor Statistics (BLS)', 'Investing.com'],
    screenshots: [],
    source: 'Oficial'
  },
  {
    id: 'evt-fed-rate',
    name: 'Decisão de Juros (EUA - Fed)',
    eventDate: '2026-10-08',
    eventTime: '15:00',
    timezone: 'America/Sao_Paulo',
    category: 'Banco Central',
    impact: 5,
    impactLevel: 'ALTO',
    country: 'EUA',
    relatedAssets: 'Índices / Dólar / Juros',
    affectedAssets: 'SPX, NDX, DXY, IBOV',
    description: 'Decisão do comitê FOMC sobre a taxa de juros básica americana e coletiva de imprensa.',
    whatHappened: 'Corte de 25 bps confirmado com coletiva indicando cautela na velocidade dos próximos cortes.',
    marketReaction: 'Movimento unidirecional de alta nos índices de tecnologia.',
    volatilityBehavior: 'Volatilidade unidirecional sem retorno',
    initialDirection: 'Alta',
    gap: '+0.8%',
    volume: '2.5x média',
    atr: '2.2x ATR diário',
    impactDuration: 'Sessão inteira e dias seguintes',
    tradingImplications: 'Não operar durante a entrevista coletiva do presidente do Fed.',
    lessonsLearned: 'O comunicado gera o primeiro spike, mas a direção definitiva só se consolida durante as respostas aos jornalistas na coletiva.',
    tags: ['FOMC', 'Taxa de Juros', 'Jerome Powell', 'Wall Street'],
    sources: ['Federal Reserve', 'Bloomberg'],
    screenshots: [],
    source: 'Oficial'
  },
  {
    id: 'evt-ipca',
    name: 'IPCA (Brasil)',
    eventDate: '2026-10-10',
    eventTime: '09:00',
    timezone: 'America/Sao_Paulo',
    category: 'Macro',
    impact: 3,
    impactLevel: 'MÉDIO',
    country: 'Brasil',
    relatedAssets: 'IBOV / Juros / Bancos',
    affectedAssets: 'IBOV, DI1F29, Bancos',
    description: 'Índice Nacional de Preços ao Consumidor Amplo medido pelo IBGE.',
    whatHappened: 'IPCA veio dentro das projeções de mercado (0,32%), sem estresse na curva futura de DI.',
    marketReaction: 'Mercado abriu estável e respeitou suportes técnicos nos principais papéis.',
    volatilityBehavior: 'Reação fraca / neutra',
    initialDirection: 'Neutra',
    gap: '0.0%',
    volume: '1.0x média',
    atr: '1.0x ATR diário',
    impactDuration: 'Menos de 1 hora',
    tradingImplications: 'Mercado livre para seguir tendências técnicas dos ativos individuais.',
    lessonsLearned: 'Quando a inflação vem em linha com o consenso, o foco volta 100% para os setups gráficos de continuidade e Trend Following.',
    tags: ['Inflação', 'IBGE', 'IBOV', 'Curva de DI'],
    sources: ['IBGE', 'Valor Econômico'],
    screenshots: [],
    source: 'Oficial'
  },
  {
    id: 'evt-china-pmi',
    name: 'Produção Industrial (China)',
    eventDate: '2026-10-12',
    eventTime: '11:00',
    timezone: 'America/Sao_Paulo',
    category: 'Commodities',
    impact: 3,
    impactLevel: 'MÉDIO',
    country: 'China',
    relatedAssets: 'Commodities / Mineração',
    affectedAssets: 'VALE3, CSNA3, GGBR4',
    description: 'Indicadores de atividade e demanda de manufatura da maior compradora mundial de commodities.',
    whatHappened: 'PMI industrial da China indicou ligeira expansão, impulsionando minério de ferro e siderurgia na B3.',
    marketReaction: 'Gap de alta nas ações de mineração com absorção suave ao longo do pregão.',
    volatilityBehavior: 'Expansão rápida seguida de absorção',
    initialDirection: 'Alta',
    gap: '+1.1%',
    volume: '1.4x média',
    atr: '1.3x ATR diário',
    impactDuration: 'Pregão diário',
    tradingImplications: 'Buscar entradas em setups de rompimento e continuação nos ativos ligados a commodities metálicas.',
    lessonsLearned: 'Dados de atividade da China têm impacto direto na abertura de mineradoras e siderúrgicas brasileiras.',
    tags: ['China', 'PMI', 'Minério de Ferro', 'VALE3'],
    sources: ['National Bureau of Statistics China', 'Reuters'],
    screenshots: [],
    source: 'Oficial'
  },
  {
    id: 'evt-copom',
    name: 'Decisão de Juros (Brasil - Copom)',
    eventDate: '2026-10-13',
    eventTime: '10:00',
    timezone: 'America/Sao_Paulo',
    category: 'Banco Central',
    impact: 5,
    impactLevel: 'ALTO',
    country: 'Brasil',
    relatedAssets: 'IBOV / Juros / Bancos',
    affectedAssets: 'IBOV, DI1F29, Imobiliário, Consumo',
    description: 'Divulgação da taxa Selic pelo Banco Central do Brasil com comunicado oficial de diretrizes.',
    whatHappened: 'Manutenção da taxa Selic com tom hawkish no comunicado, elevando inclinação da curva de juros.',
    marketReaction: 'Queda acentuada em Small Caps de consumo e construção civil; estabilidade em bancos e exportadoras.',
    volatilityBehavior: 'Volatilidade unidirecional sem retorno',
    initialDirection: 'Baixa',
    gap: '-0.9%',
    volume: '1.8x média',
    atr: '1.7x ATR diário',
    impactDuration: 'Múltiplos pregões',
    tradingImplications: 'Reduzir exposição em setores sensíveis a juros altos (construção civil e varejo alavancado).',
    lessonsLearned: 'Comunicados com viés de juros restritivos punem Small Caps domésticas e favorecem empresas descorrelacionadas ou exportadoras.',
    tags: ['Copom', 'Selic', 'Banco Central', 'DI Futuro'],
    sources: ['Banco Central do Brasil', 'InfoMoney'],
    screenshots: [],
    source: 'Oficial'
  },
  {
    id: 'evt-eleicao-eua',
    name: 'Eleição Presidencial EUA',
    eventDate: '2024-11-05',
    eventTime: '20:00',
    timezone: 'America/Sao_Paulo',
    category: 'Política',
    impact: 5,
    impactLevel: 'ALTO',
    country: 'EUA',
    relatedAssets: 'S&P 500, Russell 2000, Dólar, Bitcoin',
    affectedAssets: 'SPX, NDX, BTC, DXY, IBOV',
    description: 'Eleição presidencial americana com desfecho eleitoral e definição das bancadas legislativas.',
    whatHappened: 'Vitória republicana confirmada com reação imediata pró-desregulamentação e forte rali em ações de pequena capitalização e criptoativos.',
    marketReaction: 'Abertura em gap de alta em todos os índices de risco com rali sustentado durante vários dias.',
    volatilityBehavior: 'Volatilidade unidirecional sem retorno',
    initialDirection: 'Alta',
    gap: '+2.4%',
    volume: '2.8x média',
    atr: '2.6x ATR diário',
    impactDuration: 'Semanas',
    tradingImplications: 'Reduzir posições na véspera da eleição. Aguardar confirmação da apuração antes de aumentar risco.',
    lessonsLearned: 'Eventos eleitorais podem gerar expansão extrema de volatilidade. Esperar a reação inicial e procurar oportunidades somente depois que o mercado começar a estabilizar.',
    tags: ['Eleições EUA', 'Trump Trade', 'Russell 2000', 'Bitcoin', 'Dólar'],
    sources: ['Associated Press', 'Bloomberg', 'Wall Street Journal'],
    screenshots: [],
    source: 'Histórico'
  },
  {
    id: 'evt-msft-earnings',
    name: 'Earnings Microsoft (MSFT)',
    eventDate: '2024-10-30',
    eventTime: '17:00',
    timezone: 'America/Sao_Paulo',
    category: 'Earnings',
    impact: 4,
    impactLevel: 'ALTO',
    country: 'EUA',
    relatedAssets: 'MSFT, NDX, Big Tech, Nuvem',
    affectedAssets: 'MSFT, AAPL, QQQ, NDX',
    description: 'Divulgação dos resultados trimestrais com foco nas receitas da divisão Azure e despesas de capital com inteligência artificial.',
    whatHappened: 'Receita veio acima do consenso, porém o guidance de Capex acelerado provocou realização defensiva de curto prazo.',
    marketReaction: 'Queda de 4% no after-market, contaminando o setor de tecnologia na abertura seguinte.',
    volatilityBehavior: 'Expansão rápida seguida de absorção',
    initialDirection: 'Baixa',
    gap: '-3.8%',
    volume: '2.2x média',
    atr: '1.9x ATR diário',
    impactDuration: '2 a 3 pregões',
    tradingImplications: 'Nunca carregar posição cheia comprada através de balanço de Big Tech sem proteção de lucros.',
    lessonsLearned: 'Mesmo com lucro recorde, a reação de curto prazo em empresas líderes é ditada pelas projeções de despesas de capital futuras.',
    tags: ['Big Tech', 'Balanços', 'Azure', 'Inteligência Artificial'],
    sources: ['Microsoft Investor Relations', 'CNBC'],
    screenshots: [],
    source: 'Histórico'
  },
  {
    id: 'evt-conflito-oriente',
    name: 'Conflito Israel x Irã',
    eventDate: '2024-10-01',
    eventTime: '14:30',
    timezone: 'America/Sao_Paulo',
    category: 'Geopolítica',
    impact: 5,
    impactLevel: 'ALTO',
    country: 'Global',
    relatedAssets: 'Petróleo WTI, Ouro, VIX, Ações Aéreas',
    affectedAssets: 'WTI, BRENT, GOLD, VIX, PETR4',
    description: 'Escalada militar com disparos de mísseis no Oriente Médio e temores sobre interrupção no Estreito de Ormuz.',
    whatHappened: 'Spike imediato de 5% nas cotações de barril de petróleo e forte procura por proteção em títulos e metais preciosos.',
    marketReaction: 'Índices de ações despencaram na primeira hora, mas absorveram as perdas nos dias seguintes com descompressão do risco.',
    volatilityBehavior: 'Expansão rápida seguida de absorção',
    initialDirection: 'Alta',
    gap: '+4.2%',
    volume: '3.1x média',
    atr: '2.5x ATR diário',
    impactDuration: '48 a 72 horas',
    tradingImplications: 'Não comprar rompimento de topo em petróleo gerado exclusivamente por choque geopolítico de curto prazo.',
    lessonsLearned: 'Picos de volatilidade causados por choques geopolíticos tendem a arrefecer em 48 a 72 horas se a infraestrutura física de produção não for interrompida.',
    tags: ['Geopolítica', 'Petróleo', 'Ouro', 'VIX', 'Conflito'],
    sources: ['Reuters', 'Al Jazeera', 'Financial Times'],
    screenshots: [],
    source: 'Histórico'
  },
  {
    id: 'evt-svb-crisis',
    name: 'Crise Bancária — Silicon Valley Bank (SVB)',
    eventDate: '2023-03-10',
    eventTime: '11:00',
    timezone: 'America/Sao_Paulo',
    category: 'Black Swan',
    impact: 5,
    impactLevel: 'EXTREMO',
    country: 'EUA',
    relatedAssets: 'Bancos Regionais (KRE), Juros dos Treasuries, Ouro',
    affectedAssets: 'KRE, XLF, Treasuries 2Y, GOLD, IBOV',
    description: 'Corrida bancária relâmpago provocada por perdas não realizadas em carteiras de títulos públicos e intervenção da FDIC.',
    whatHappened: 'Falência relâmpago do 16º maior banco dos EUA em menos de 48 horas, gerando pânico sistêmico nos bancos médios.',
    marketReaction: 'Colapso de até 60% em bancos regionais, queda recorde nos yields de 2 anos dos EUA e voo imediato para liquidez.',
    volatilityBehavior: 'Volatilidade unidirecional sem retorno',
    initialDirection: 'Baixa',
    gap: '-5.1%',
    volume: '4.2x média',
    atr: '3.4x ATR diário',
    impactDuration: 'Semanas',
    tradingImplications: 'Encerrar imediatamente posições em bancos médios e ativar modo defensivo sem discutir com o mercado.',
    lessonsLearned: 'Crises de solvência bancária na era digital se propagam com velocidade extrema. Respeitar o stop loss sem qualquer hesitação.',
    tags: ['Black Swan', 'Bancos Regionais', 'FDIC', 'Pânico Sistêmico'],
    sources: ['FDIC', 'Wall Street Journal', 'Bloomberg'],
    screenshots: [],
    source: 'Histórico'
  },
  {
    id: 'evt-tarifas-china',
    name: 'Tarifas Comerciais sobre Produtos Chineses',
    eventDate: '2024-05-14',
    eventTime: '10:00',
    timezone: 'America/Sao_Paulo',
    category: 'Tarifas',
    impact: 4,
    impactLevel: 'ALTO',
    country: 'EUA',
    relatedAssets: 'Semicondutores, Veículos Elétricos, Cobre',
    affectedAssets: 'TSLA, NVDA, BDRs de tecnologia',
    description: 'Anúncio de elevação de tarifas alfandegárias de 100% para veículos elétricos e 50% para semicondutores importados da China.',
    whatHappened: 'Impacto inflacionário setorial e proteção para fabricantes domésticos americanos.',
    marketReaction: 'Reação mista com rotação entre setores beneficiados e cadeias de suprimentos dependentes de insumos externos.',
    volatilityBehavior: 'Expansão rápida seguida de absorção',
    initialDirection: 'Neutra',
    gap: '-0.3%',
    volume: '1.2x média',
    atr: '1.2x ATR diário',
    impactDuration: 'Múltiplos pregões',
    tradingImplications: 'Evitar comprar rompimentos em cadeias de suprimentos dependentes até o alinhamento das margens operacionais.',
    lessonsLearned: 'Tarifas provocam reprecificação lenta de custos ao longo de semanas. Focar em empresas com poder comprovado de repasse de preços.',
    tags: ['Tarifas', 'Guerra Comercial', 'Veículos Elétricos', 'China'],
    sources: ['White House Press Office', 'Reuters'],
    screenshots: [],
    source: 'Histórico'
  },
  {
    id: 'evt-us-cpi',
    name: 'Inflação EUA — CPI',
    eventDate: '2024-06-12',
    eventTime: '09:30',
    timezone: 'America/Sao_Paulo',
    category: 'Macro',
    impact: 4,
    impactLevel: 'ALTO',
    country: 'EUA',
    relatedAssets: 'S&P 500, Nasdaq, Treasuries, Dólar',
    affectedAssets: 'SPX, NDX, DXY, Treasuries 10Y',
    description: 'Divulgação do Índice de Preços ao Consumidor nos EUA mostrando desinflação em serviços essenciais.',
    whatHappened: 'CPI abaixo do esperado confirmando desaceleração inflacionária e antecipando apostas de afrouxamento monetário.',
    marketReaction: 'Forte rali instantâneo em Wall Street com queda de mais de 10 bps nas taxas dos Treasuries.',
    volatilityBehavior: 'Volatilidade unidirecional sem retorno',
    initialDirection: 'Alta',
    gap: '+1.5%',
    volume: '2.0x média',
    atr: '1.8x ATR diário',
    impactDuration: 'Pregão inteiro',
    tradingImplications: 'Acompanhar a direção inicial com confiança quando a surpresa do dado apoia a tendência dominante.',
    lessonsLearned: 'Dados de CPI que surpreendem a favor da tendência pré-existente geram os melhores dias de expansão de ganhos em Trend Following.',
    tags: ['CPI', 'Inflação EUA', 'Treasuries', 'Nasdaq'],
    sources: ['Bureau of Labor Statistics (BLS)', 'CNBC'],
    screenshots: [],
    source: 'Histórico'
  },
  {
    id: 'evt-russia-ucrania',
    name: 'Invasão da Ucrânia',
    eventDate: '2022-02-24',
    eventTime: '03:00',
    timezone: 'America/Sao_Paulo',
    category: 'Geopolítica',
    impact: 5,
    impactLevel: 'EXTREMO',
    country: 'Global',
    relatedAssets: 'Trigo, Petróleo WTI, Ouro, Bolsas Europeias',
    affectedAssets: 'WTI, BRENT, WHEAT, GOLD, DAX',
    description: 'Início da invasão militar na Ucrânia com sanções internacionais imediatas e choque em cadeias de suprimentos.',
    whatHappened: 'Petróleo ultrapassou US$ 100 por barril, disparada no preço de grãos e colapso nos mercados acionários europeus.',
    marketReaction: 'Pânico inicial seguido de forte volatilidade e reconfiguração estrutural das commodities mundiais.',
    volatilityBehavior: 'Volatilidade unidirecional sem retorno',
    initialDirection: 'Alta',
    gap: '+6.5%',
    volume: '3.8x média',
    atr: '3.2x ATR diário',
    impactDuration: 'Meses',
    tradingImplications: 'Zerar posições vulneráveis a cadeias globais de fertilizantes e focar em commodities de energia e proteção.',
    lessonsLearned: 'Grandes eventos de cisne geopolítico criam tendências plurianuais em commodities. Seguir o trend sem tentar adivinhar topos.',
    tags: ['Geopolítica', 'Guerra', 'Commodities Agrícolas', 'Petróleo'],
    sources: ['UN Security Council', 'BBC', 'Reuters'],
    screenshots: [],
    source: 'Histórico'
  }
];

function invalid(message, status = 400) {
  const err = new Error(message);
  err.status = status;
  return err;
}

function normalizeImpact(value) {
  if (typeof value === 'number') {
    return Math.max(1, Math.min(5, Math.round(value)));
  }
  const str = String(value || '').toUpperCase().trim();
  if (str === 'EXTREMO' || str === '5') return 5;
  if (str === 'ALTO' || str === '4') return 4;
  if (str === 'MÉDIO' || str === 'MEDIO' || str === '3') return 3;
  if (str === 'BAIXO' || str === '2') return 2;
  if (str === 'MUITO BAIXO' || str === '1') return 1;
  return 3;
}

function impactToLevel(impactNum) {
  switch (impactNum) {
    case 5: return 'EXTREMO';
    case 4: return 'ALTO';
    case 3: return 'MÉDIO';
    case 2: return 'BAIXO';
    case 1:
    default:
      return 'BAIXO';
  }
}

function normalizeRow(row) {
  if (!row) return null;
  const impactNum = normalizeImpact(row.impact);
  let tags = [];
  try {
    tags = Array.isArray(row.tags) ? row.tags : (typeof row.tags === 'string' ? JSON.parse(row.tags) : []);
  } catch (_) { tags = []; }

  let sources = [];
  try {
    sources = Array.isArray(row.sources) ? row.sources : (typeof row.sources === 'string' ? JSON.parse(row.sources) : []);
  } catch (_) { sources = []; }

  let screenshots = [];
  try {
    screenshots = Array.isArray(row.screenshots) ? row.screenshots : (typeof row.screenshots === 'string' ? JSON.parse(row.screenshots) : []);
  } catch (_) { screenshots = []; }

  return {
    id: row.id,
    userId: row.user_id || null,
    name: row.name,
    date: row.event_date ? (typeof row.event_date === 'string' ? row.event_date.slice(0, 10) : new Date(row.event_date).toISOString().slice(0, 10)) : '',
    eventDate: row.event_date ? (typeof row.event_date === 'string' ? row.event_date.slice(0, 10) : new Date(row.event_date).toISOString().slice(0, 10)) : '',
    time: row.event_time || '10:00',
    eventTime: row.event_time || '10:00',
    timezone: row.timezone || 'America/Sao_Paulo',
    category: row.category || 'Macro',
    impact: impactNum,
    impactLevel: row.impact_level || impactToLevel(impactNum),
    country: row.country || 'Brasil',
    relatedAssets: row.related_assets || '',
    affectedAssets: row.affected_assets || '',
    description: row.description || '',
    whatHappened: row.what_happened || '',
    marketReaction: row.market_reaction || '',
    volatilityBehavior: row.volatility_behavior || '',
    initialDirection: row.initial_direction || 'Neutra',
    gap: row.gap || '',
    volume: row.volume || '',
    atr: row.atr || '',
    impactDuration: row.impact_duration || '',
    tradingImplications: row.trading_implications || '',
    lessonsLearned: row.lessons_learned || '',
    coverImage: row.cover_image || '',
    tags,
    sources,
    screenshots,
    source: row.source || 'Manual (Usuário)',
    notes: row.notes || '',
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString()
  };
}

async function list(userId, query = {}, persistence = database) {
  if (!persistence.configured()) {
    return filterItems(DEFAULT_SEEDS, query);
  }

  const result = await persistence.query(
    `SELECT * FROM app.event_playbook WHERE user_id = $1 ORDER BY event_date DESC, created_at DESC`,
    [userId]
  );

  let items = result.rows.map(normalizeRow);

  // Se o usuário ainda não tiver nenhum registro persistido, popula com os seeds para o usuário!
  if (items.length === 0) {
    for (const seed of DEFAULT_SEEDS) {
      try {
        await persistence.query(
          `INSERT INTO app.event_playbook (
            id, user_id, name, event_date, event_time, timezone, category, impact, impact_level,
            country, related_assets, affected_assets, description, what_happened, market_reaction,
            volatility_behavior, initial_direction, gap, volume, atr, impact_duration,
            trading_implications, lessons_learned, cover_image, tags, sources, screenshots, source, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
          ON CONFLICT (id) DO NOTHING`,
          [
            seed.id, userId, seed.name, seed.eventDate, seed.eventTime, seed.timezone, seed.category,
            seed.impact, seed.impactLevel, seed.country, seed.relatedAssets, seed.affectedAssets,
            seed.description, seed.whatHappened, seed.marketReaction, seed.volatilityBehavior,
            seed.initialDirection, seed.gap, seed.volume, seed.atr, seed.impactDuration,
            seed.tradingImplications, seed.lessonsLearned, seed.coverImage || '',
            JSON.stringify(seed.tags || []), JSON.stringify(seed.sources || []),
            JSON.stringify(seed.screenshots || []), seed.source || 'Oficial', ''
          ]
        );
      } catch (_) {}
    }

    const recheck = await persistence.query(
      `SELECT * FROM app.event_playbook WHERE user_id = $1 ORDER BY event_date DESC, created_at DESC`,
      [userId]
    );
    items = recheck.rows.length ? recheck.rows.map(normalizeRow) : DEFAULT_SEEDS;
  }

  return filterItems(items, query);
}

function filterItems(items, query = {}) {
  let filtered = [...items];

  // Filtro por Categoria
  if (query.category && query.category !== 'Todos') {
    const cat = String(query.category).toLowerCase().trim();
    filtered = filtered.filter(it => String(it.category || '').toLowerCase().trim() === cat);
  }

  // Filtro por Impacto
  if (query.impact) {
    const imp = normalizeImpact(query.impact);
    filtered = filtered.filter(it => it.impact === imp);
  }

  // Filtro por Ativo
  if (query.asset) {
    const sym = String(query.asset).toUpperCase().trim();
    filtered = filtered.filter(it =>
      String(it.affectedAssets || '').toUpperCase().includes(sym) ||
      String(it.relatedAssets || '').toUpperCase().includes(sym) ||
      (Array.isArray(it.tags) && it.tags.some(t => String(t).toUpperCase().includes(sym)))
    );
  }

  // Filtro por Período
  if (query.period) {
    const now = new Date();
    if (query.period === 'today') {
      const todayStr = now.toISOString().slice(0, 10);
      filtered = filtered.filter(it => it.eventDate === todayStr);
    } else if (query.period === '30d') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      filtered = filtered.filter(it => it.eventDate >= past);
    } else if (query.period === '1y') {
      const past = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      filtered = filtered.filter(it => it.eventDate >= past);
    }
  }

  // Busca textual
  if (query.search) {
    const q = String(query.search).toLowerCase().trim();
    filtered = filtered.filter(it =>
      String(it.name || '').toLowerCase().includes(q) ||
      String(it.description || '').toLowerCase().includes(q) ||
      String(it.whatHappened || '').toLowerCase().includes(q) ||
      String(it.lessonsLearned || '').toLowerCase().includes(q) ||
      String(it.tradingImplications || '').toLowerCase().includes(q) ||
      String(it.affectedAssets || '').toLowerCase().includes(q) ||
      String(it.relatedAssets || '').toLowerCase().includes(q) ||
      (Array.isArray(it.tags) && it.tags.some(t => String(t).toLowerCase().includes(q)))
    );
  }

  return filtered;
}

async function get(userId, id, persistence = database) {
  if (!persistence.configured()) {
    const item = DEFAULT_SEEDS.find(e => e.id === id);
    if (!item) throw invalid('Evento não encontrado.', 404);
    return item;
  }

  const result = await persistence.query(
    `SELECT * FROM app.event_playbook WHERE user_id = $1 AND id = $2`,
    [userId, id]
  );

  const row = result.rows[0];
  if (!row) {
    const item = DEFAULT_SEEDS.find(e => e.id === id);
    if (item) return item;
    throw invalid('Evento não encontrado.', 404);
  }
  return normalizeRow(row);
}

async function create(userId, data, persistence = database) {
  if (!data || !String(data.name || '').trim()) {
    throw invalid('O nome do evento é obrigatório.');
  }

  const id = data.id || ('evt-' + crypto.randomUUID());
  const name = String(data.name).trim().slice(0, 200);
  const eventDate = String(data.date || data.eventDate || new Date().toISOString().slice(0, 10));
  const eventTime = String(data.time || data.eventTime || '10:00');
  const timezone = String(data.timezone || 'America/Sao_Paulo');
  const category = String(data.category || 'Macro');
  const impact = normalizeImpact(data.impact);
  const impactLevel = data.impactLevel || impactToLevel(impact);
  const country = String(data.country || 'Brasil');
  const relatedAssets = String(data.relatedAssets || 'Geral');
  const affectedAssets = String(data.affectedAssets || '');
  const description = String(data.description || '');
  const whatHappened = String(data.whatHappened || '');
  const marketReaction = String(data.marketReaction || '');
  const volatilityBehavior = String(data.volatilityBehavior || 'Expansão rápida seguida de absorção');
  const initialDirection = String(data.initialDirection || 'Neutra');
  const gap = String(data.gap || '');
  const volume = String(data.volume || '');
  const atr = String(data.atr || '');
  const impactDuration = String(data.impactDuration || '');
  const tradingImplications = String(data.tradingImplications || '');
  const lessonsLearned = String(data.lessonsLearned || '');
  const coverImage = String(data.coverImage || '');
  const source = String(data.source || 'Manual (Usuário)');
  const notes = String(data.notes || '');

  const tags = Array.isArray(data.tags) ? data.tags : [];
  const sources = Array.isArray(data.sources) ? data.sources : [];
  const screenshots = Array.isArray(data.screenshots) ? data.screenshots : [];

  if (!persistence.configured()) {
    const newSeed = {
      id, userId, name, eventDate, eventTime, timezone, category, impact, impactLevel,
      country, relatedAssets, affectedAssets, description, whatHappened, marketReaction,
      volatilityBehavior, initialDirection, gap, volume, atr, impactDuration,
      tradingImplications, lessonsLearned, coverImage, tags, sources, screenshots,
      source, notes, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
    };
    DEFAULT_SEEDS.unshift(newSeed);
    return newSeed;
  }

  const result = await persistence.query(
    `INSERT INTO app.event_playbook (
      id, user_id, name, event_date, event_time, timezone, category, impact, impact_level,
      country, related_assets, affected_assets, description, what_happened, market_reaction,
      volatility_behavior, initial_direction, gap, volume, atr, impact_duration,
      trading_implications, lessons_learned, cover_image, tags, sources, screenshots, source, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29)
    RETURNING *`,
    [
      id, userId, name, eventDate, eventTime, timezone, category, impact, impactLevel,
      country, relatedAssets, affectedAssets, description, whatHappened, marketReaction,
      volatilityBehavior, initialDirection, gap, volume, atr, impactDuration,
      tradingImplications, lessonsLearned, coverImage,
      JSON.stringify(tags), JSON.stringify(sources), JSON.stringify(screenshots), source, notes
    ]
  );

  return normalizeRow(result.rows[0]);
}

async function update(userId, id, data, persistence = database) {
  if (!id) throw invalid('Identificador do evento é obrigatório.');

  if (!persistence.configured()) {
    const existing = DEFAULT_SEEDS.find(e => e.id === id);
    if (!existing) throw invalid('Evento não encontrado.', 404);
    Object.assign(existing, data, { updatedAt: new Date().toISOString() });
    return existing;
  }

  // Busca registro atual
  const currentRes = await persistence.query(
    `SELECT * FROM app.event_playbook WHERE user_id = $1 AND id = $2`,
    [userId, id]
  );

  let existing = currentRes.rows[0];
  if (!existing) {
    // Se não existia no banco, mas é um default seed, insere primeiro
    const seed = DEFAULT_SEEDS.find(s => s.id === id);
    if (seed) {
      await create(userId, { ...seed, ...data, id }, persistence);
      return get(userId, id, persistence);
    }
    throw invalid('Evento não encontrado para atualização.', 404);
  }

  const name = data.name !== undefined ? String(data.name).trim().slice(0, 200) : existing.name;
  const eventDate = data.date || data.eventDate || existing.event_date;
  const eventTime = data.time || data.eventTime || existing.event_time;
  const timezone = data.timezone || existing.timezone;
  const category = data.category || existing.category;
  const impact = data.impact !== undefined ? normalizeImpact(data.impact) : existing.impact;
  const impactLevel = data.impactLevel || (data.impact !== undefined ? impactToLevel(impact) : existing.impact_level);
  const country = data.country !== undefined ? String(data.country) : existing.country;
  const relatedAssets = data.relatedAssets !== undefined ? String(data.relatedAssets) : existing.related_assets;
  const affectedAssets = data.affectedAssets !== undefined ? String(data.affectedAssets) : existing.affected_assets;
  const description = data.description !== undefined ? String(data.description) : existing.description;
  const whatHappened = data.whatHappened !== undefined ? String(data.whatHappened) : existing.what_happened;
  const marketReaction = data.marketReaction !== undefined ? String(data.marketReaction) : existing.market_reaction;
  const volatilityBehavior = data.volatilityBehavior !== undefined ? String(data.volatilityBehavior) : existing.volatility_behavior;
  const initialDirection = data.initialDirection !== undefined ? String(data.initialDirection) : existing.initial_direction;
  const gap = data.gap !== undefined ? String(data.gap) : existing.gap;
  const volume = data.volume !== undefined ? String(data.volume) : existing.volume;
  const atr = data.atr !== undefined ? String(data.atr) : existing.atr;
  const impactDuration = data.impactDuration !== undefined ? String(data.impactDuration) : existing.impact_duration;
  const tradingImplications = data.tradingImplications !== undefined ? String(data.tradingImplications) : existing.trading_implications;
  const lessonsLearned = data.lessonsLearned !== undefined ? String(data.lessonsLearned) : existing.lessons_learned;
  const coverImage = data.coverImage !== undefined ? String(data.coverImage) : existing.cover_image;
  const source = data.source !== undefined ? String(data.source) : existing.source;
  const notes = data.notes !== undefined ? String(data.notes) : existing.notes;

  const tags = data.tags !== undefined ? (Array.isArray(data.tags) ? data.tags : []) : (existing.tags || []);
  const sources = data.sources !== undefined ? (Array.isArray(data.sources) ? data.sources : []) : (existing.sources || []);
  const screenshots = data.screenshots !== undefined ? (Array.isArray(data.screenshots) ? data.screenshots : []) : (existing.screenshots || []);

  const result = await persistence.query(
    `UPDATE app.event_playbook SET
      name = $1, event_date = $2, event_time = $3, timezone = $4, category = $5,
      impact = $6, impact_level = $7, country = $8, related_assets = $9, affected_assets = $10,
      description = $11, what_happened = $12, market_reaction = $13, volatility_behavior = $14,
      initial_direction = $15, gap = $16, volume = $17, atr = $18, impact_duration = $19,
      trading_implications = $20, lessons_learned = $21, cover_image = $22,
      tags = $23, sources = $24, screenshots = $25, source = $26, notes = $27, updated_at = now()
    WHERE user_id = $28 AND id = $29
    RETURNING *`,
    [
      name, eventDate, eventTime, timezone, category,
      impact, impactLevel, country, relatedAssets, affectedAssets,
      description, whatHappened, marketReaction, volatilityBehavior,
      initialDirection, gap, volume, atr, impactDuration,
      tradingImplications, lessonsLearned, coverImage,
      JSON.stringify(tags), JSON.stringify(sources), JSON.stringify(screenshots), source, notes,
      userId, id
    ]
  );

  return normalizeRow(result.rows[0]);
}

async function remove(userId, id, persistence = database) {
  if (!id) throw invalid('Identificador do evento é obrigatório.');

  if (!persistence.configured()) {
    const idx = DEFAULT_SEEDS.findIndex(e => e.id === id);
    if (idx !== -1) DEFAULT_SEEDS.splice(idx, 1);
    return { success: true, id };
  }

  const result = await persistence.query(
    `DELETE FROM app.event_playbook WHERE user_id = $1 AND id = $2 RETURNING id`,
    [userId, id]
  );

  if (result.rowCount === 0) {
    throw invalid('Evento não encontrado para remoção.', 404);
  }

  return { success: true, id };
}

/**
 * Salva a reação rápida originada pelo modal da Central de Mercado no evento compartilhado
 */
async function saveReaction(userId, reactionData, persistence = database) {
  if (!reactionData || !reactionData.eventId) {
    throw invalid('O ID do evento é obrigatório para registrar a reação.');
  }

  const eventId = String(reactionData.eventId).trim();
  const updatePayload = {
    whatHappened: String(reactionData.whatHappened || '').trim(),
    volatilityBehavior: String(reactionData.volatilityBehavior || 'Expansão rápida seguida de absorção').trim(),
    affectedAssets: String(reactionData.affectedAssets || '').trim(),
    lessonsLearned: String(reactionData.lessonsLearned || '').trim()
  };

  // Se vier com screenshots pré/pós
  if (reactionData.preEventScreenshot || reactionData.postEventScreenshot) {
    const current = await get(userId, eventId, persistence);
    const screenshots = Array.isArray(current.screenshots) ? [...current.screenshots] : [];
    if (reactionData.preEventScreenshot) {
      screenshots.push({
        id: 'ss-' + crypto.randomUUID(),
        type: 'before',
        url: reactionData.preEventScreenshot,
        caption: 'Antes do evento',
        createdAt: new Date().toISOString()
      });
    }
    if (reactionData.postEventScreenshot) {
      screenshots.push({
        id: 'ss-' + crypto.randomUUID(),
        type: 'after',
        url: reactionData.postEventScreenshot,
        caption: 'Depois do evento',
        createdAt: new Date().toISOString()
      });
    }
    updatePayload.screenshots = screenshots;
  }

  return update(userId, eventId, updatePayload, persistence);
}

module.exports = {
  CATEGORIES,
  DEFAULT_SEEDS,
  normalizeImpact,
  impactToLevel,
  list,
  get,
  create,
  update,
  remove,
  saveReaction
};

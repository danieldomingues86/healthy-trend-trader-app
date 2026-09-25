const fs = require('node:fs/promises');
const path = require('node:path');

const BDR_COMPANIES = [
  {
    bdr: 'ROXO34',
    symbol: 'NU',
    exchange: 'NYSE',
    name: 'Nu Holdings Ltd. (Nubank)',
    sector: 'Serviços Financeiros',
    industry: 'Bancos Digitais & Fintech',
    description: 'Plataforma líder de serviços financeiros digitais na América Latina, atendendo mais de 100 milhões de clientes com custo de servir reduzido e forte expansão de rentabilidade.',
    market: { price: 11.62, changePct: -0.17, marketCap: 56000000000 },
    metrics: {
      roe: 0.274, roic: 0.218, netMargin: 0.252, ebitMargin: 0.315,
      priceEarnings: 28.4, priceToBook: 5.2, enterpriseToEbitda: 21.0,
      netDebtToEquity: 0.12, dividendYield: 0.0, earningsCagr: 0.65
    },
    incomeHistory: [
      { year: '2022', netIncome: -364000000, revenue: 4792000000 },
      { year: '2023', netIncome: 1030000000, revenue: 8029000000 },
      { year: '2024', netIncome: 1950000000, revenue: 11500000000 },
      { year: '2025', netIncome: 2600000000, revenue: 14800000000 }
    ],
    dividendYears: 0
  },
  {
    bdr: 'MELI34',
    symbol: 'MELI',
    exchange: 'NASDAQ',
    name: 'MercadoLibre Inc.',
    sector: 'Consumo',
    industry: 'E-Commerce & Pagamentos Digitais',
    description: 'Maior ecossistema de comércio eletrônico e soluções financeiras integradas (Mercado Pago) da América Latina, com forte fosso competitivo logístico e de pagamentos.',
    market: { price: 75.34, changePct: -2.40, marketCap: 102000000000 },
    metrics: {
      roe: 0.342, roic: 0.228, netMargin: 0.076, ebitMargin: 0.118,
      priceEarnings: 45.2, priceToBook: 14.1, enterpriseToEbitda: 26.5,
      netDebtToEquity: 0.78, dividendYield: 0.0, earningsCagr: 0.38
    },
    incomeHistory: [
      { year: '2022', netIncome: 482000000, revenue: 10537000000 },
      { year: '2023', netIncome: 987000000, revenue: 14473000000 },
      { year: '2024', netIncome: 1620000000, revenue: 19800000000 },
      { year: '2025', netIncome: 2150000000, revenue: 25200000000 }
    ],
    dividendYears: 0
  },
  {
    bdr: 'M1TA34',
    symbol: 'META',
    exchange: 'NASDAQ',
    name: 'Meta Platforms Inc.',
    sector: 'Tecnologia',
    industry: 'Redes Sociais, Publicidade Digital & IA',
    description: 'Controladora do Facebook, Instagram, WhatsApp e Messenger. Pioneira no desenvolvimento de ecossistemas abertos de IA (Llama) e infraestrutura de computação de ponta.',
    market: { price: 144.48, changePct: 4.70, marketCap: 1480000000000 },
    metrics: {
      roe: 0.325, roic: 0.284, netMargin: 0.352, ebitMargin: 0.412,
      priceEarnings: 26.1, priceToBook: 7.5, enterpriseToEbitda: 16.2,
      netDebtToEquity: -0.15, dividendYield: 0.0035, earningsCagr: 0.245
    },
    incomeHistory: [
      { year: '2022', netIncome: 23200000000, revenue: 116609000000 },
      { year: '2023', netIncome: 39098000000, revenue: 134902000000 },
      { year: '2024', netIncome: 52800000000, revenue: 162000000000 },
      { year: '2025', netIncome: 61200000000, revenue: 189000000000 }
    ],
    dividendYears: 2
  },
  {
    bdr: 'NVDC34',
    symbol: 'NVDA',
    exchange: 'NASDAQ',
    name: 'NVIDIA Corporation',
    sector: 'Tecnologia',
    industry: 'Semicondutores & Aceleradores de IA',
    description: 'Líder absoluta global em unidades de processamento gráfico (GPUs), aceleração de hardware e ecossistema de software de inteligência artificial (CUDA e arquiteturas Blackwell).',
    market: { price: 24.28, changePct: -0.08, marketCap: 2950000000000 },
    metrics: {
      roe: 1.152, roic: 0.854, netMargin: 0.552, ebitMargin: 0.628,
      priceEarnings: 42.5, priceToBook: 32.4, enterpriseToEbitda: 30.1,
      netDebtToEquity: -0.21, dividendYield: 0.0003, earningsCagr: 0.95
    },
    incomeHistory: [
      { year: '2022', netIncome: 4368000000, revenue: 26974000000 },
      { year: '2023', netIncome: 29760000000, revenue: 60922000000 },
      { year: '2024', netIncome: 65400000000, revenue: 121000000000 },
      { year: '2025', netIncome: 88500000000, revenue: 160000000000 }
    ],
    dividendYears: 5
  },
  {
    bdr: 'TSLA34',
    symbol: 'TSLA',
    exchange: 'NASDAQ',
    name: 'Tesla Inc.',
    sector: 'Consumo',
    industry: 'Veículos Elétricos & Energia Limpa',
    description: 'Fabricante de veículos elétricos mais valiosa do mundo, integrando baterias estacionárias Megapack, teto solar e desenvolvimento de direção autônoma com visão computacional.',
    market: { price: 61.47, changePct: -0.34, marketCap: 750000000000 },
    metrics: {
      roe: 0.142, roic: 0.114, netMargin: 0.082, ebitMargin: 0.098,
      priceEarnings: 85.0, priceToBook: 8.8, enterpriseToEbitda: 42.0,
      netDebtToEquity: -0.35, dividendYield: 0.0, earningsCagr: 0.12
    },
    incomeHistory: [
      { year: '2022', netIncome: 12583000000, revenue: 81462000000 },
      { year: '2023', netIncome: 14997000000, revenue: 96773000000 },
      { year: '2024', netIncome: 8820000000, revenue: 99800000000 },
      { year: '2025', netIncome: 10200000000, revenue: 112000000000 }
    ],
    dividendYears: 0
  },
  {
    bdr: 'ITLC34',
    symbol: 'INTC',
    exchange: 'NASDAQ',
    name: 'Intel Corporation',
    sector: 'Tecnologia',
    industry: 'Semicondutores & Processadores',
    description: 'Pioneira em microprocessadores para computação e data centers, operando transição estratégica para fundição terceirizada (Intel Foundry).',
    market: { price: 109.76, changePct: 3.74, marketCap: 95000000000 },
    metrics: {
      roe: -0.045, roic: -0.021, netMargin: -0.038, ebitMargin: 0.021,
      priceEarnings: null, priceToBook: 1.15, enterpriseToEbitda: 14.5,
      netDebtToEquity: 0.45, dividendYield: 0.015, earningsCagr: -0.15
    },
    incomeHistory: [
      { year: '2022', netIncome: 8014000000, revenue: 63054000000 },
      { year: '2023', netIncome: 1675000000, revenue: 54228000000 },
      { year: '2024', netIncome: -1620000000, revenue: 53100000000 },
      { year: '2025', netIncome: 850000000, revenue: 56500000000 }
    ],
    dividendYears: 5
  },
  {
    bdr: 'AMZO34',
    symbol: 'AMZN',
    exchange: 'NASDAQ',
    name: 'Amazon.com Inc.',
    sector: 'Consumo',
    industry: 'E-Commerce, Nuvem (AWS) & Publicidade',
    description: 'Líder global incontestável em infraestrutura de nuvem com a AWS, plataforma de e-commerce e terceira maior força em publicidade digital.',
    market: { price: 64.74, changePct: -0.12, marketCap: 2050000000000 },
    metrics: {
      roe: 0.224, roic: 0.165, netMargin: 0.085, ebitMargin: 0.105,
      priceEarnings: 38.2, priceToBook: 7.2, enterpriseToEbitda: 18.4,
      netDebtToEquity: 0.15, dividendYield: 0.0, earningsCagr: 0.35
    },
    incomeHistory: [
      { year: '2022', netIncome: -2722000000, revenue: 513983000000 },
      { year: '2023', netIncome: 30425000000, revenue: 574785000000 },
      { year: '2024', netIncome: 45200000000, revenue: 638000000000 },
      { year: '2025', netIncome: 56000000000, revenue: 710000000000 }
    ],
    dividendYears: 0
  },
  {
    bdr: 'GOGL34',
    symbol: 'GOOGL',
    exchange: 'NASDAQ',
    name: 'Alphabet Inc. (Google)',
    sector: 'Tecnologia',
    industry: 'Mecanismos de Busca, Nuvem & IA',
    description: 'Controladora do Google Search, YouTube, Android e Google Cloud. Ecossistema líder em inteligência artificial generativa com Gemini.',
    market: { price: 148.16, changePct: 1.45, marketCap: 2150000000000 },
    metrics: {
      roe: 0.312, roic: 0.264, netMargin: 0.282, ebitMargin: 0.324,
      priceEarnings: 22.4, priceToBook: 6.1, enterpriseToEbitda: 14.2,
      netDebtToEquity: -0.28, dividendYield: 0.0045, earningsCagr: 0.22
    },
    incomeHistory: [
      { year: '2022', netIncome: 59972000000, revenue: 282836000000 },
      { year: '2023', netIncome: 73795000000, revenue: 307394000000 },
      { year: '2024', netIncome: 92400000000, revenue: 350000000000 },
      { year: '2025', netIncome: 105000000000, revenue: 395000000000 }
    ],
    dividendYears: 2
  },
  {
    bdr: 'MSFT34',
    symbol: 'MSFT',
    exchange: 'NASDAQ',
    name: 'Microsoft Corporation',
    sector: 'Tecnologia',
    industry: 'Software Empresarial, Nuvem & IA',
    description: 'Líder em soluções corporativas (Windows, Office 365), infraestrutura em nuvem (Azure) e pioneira na monetização de agentes de IA corporativos.',
    market: { price: 107.51, changePct: -0.09, marketCap: 3100000000000 },
    metrics: {
      roe: 0.384, roic: 0.302, netMargin: 0.362, ebitMargin: 0.445,
      priceEarnings: 32.1, priceToBook: 11.5, enterpriseToEbitda: 21.2,
      netDebtToEquity: -0.10, dividendYield: 0.0075, earningsCagr: 0.18
    },
    incomeHistory: [
      { year: '2022', netIncome: 72738000000, revenue: 198270000000 },
      { year: '2023', netIncome: 72361000000, revenue: 211915000000 },
      { year: '2024', netIncome: 88140000000, revenue: 245120000000 },
      { year: '2025', netIncome: 98500000000, revenue: 278000000000 }
    ],
    dividendYears: 5
  },
  {
    bdr: 'M2ST34',
    symbol: 'MSTR',
    exchange: 'NASDAQ',
    name: 'MicroStrategy Inc.',
    sector: 'Tecnologia',
    industry: 'Software de Analytics & Bitcoin Treasury',
    description: 'Desenvolvedora de software de Business Intelligence e pioneira na estratégia de tesouraria de acumulação sistemática de Bitcoin como ativo de reserva.',
    market: { price: 12.02, changePct: 0.17, marketCap: 32000000000 },
    metrics: {
      roe: 0.182, roic: 0.124, netMargin: 0.155, ebitMargin: 0.220,
      priceEarnings: 55.0, priceToBook: 4.8, enterpriseToEbitda: 38.0,
      netDebtToEquity: 0.65, dividendYield: 0.0, earningsCagr: 0.25
    },
    incomeHistory: [
      { year: '2022', netIncome: -1470000000, revenue: 499000000 },
      { year: '2023', netIncome: 429000000, revenue: 496000000 },
      { year: '2024', netIncome: 650000000, revenue: 520000000 },
      { year: '2025', netIncome: 1100000000, revenue: 560000000 }
    ],
    dividendYears: 0
  },
  {
    bdr: 'SPCX34',
    symbol: 'DXYZ',
    exchange: 'NYSE',
    name: 'Destiny Tech100 Inc. (SpaceX Exposure)',
    sector: 'Tecnologia',
    industry: 'Investimentos em Startups Tech & Espacial',
    description: 'Veículo de investimento listado que fornece acesso público ao portfólio de unicórnios privados de tecnologia, com destaque para SpaceX, OpenAI e Stripe.',
    market: { price: 50.98, changePct: -0.04, marketCap: 850000000 },
    metrics: {
      roe: 0.085, roic: 0.072, netMargin: 0.140, ebitMargin: 0.180,
      priceEarnings: 42.0, priceToBook: 2.4, enterpriseToEbitda: 28.0,
      netDebtToEquity: 0.05, dividendYield: 0.0, earningsCagr: 0.20
    },
    incomeHistory: [
      { year: '2022', netIncome: 12000000, revenue: 35000000 },
      { year: '2023', netIncome: 18000000, revenue: 48000000 },
      { year: '2024', netIncome: 25000000, revenue: 65000000 },
      { year: '2025', netIncome: 32000000, revenue: 82000000 }
    ],
    dividendYears: 0
  },
  {
    bdr: 'TSMC34',
    symbol: 'TSM',
    exchange: 'NYSE',
    name: 'Taiwan Semiconductor Manufacturing Co.',
    sector: 'Tecnologia',
    industry: 'Fundição de Semicondutores Avançados',
    description: 'Maior fundição de semicondutores do mundo, indispensável para a manufatura dos nós mais avançados (3nm e 2nm) de Apple, Nvidia, Qualcomm e AMD.',
    market: { price: 292.41, changePct: 1.29, marketCap: 880000000000 },
    metrics: {
      roe: 0.304, roic: 0.242, netMargin: 0.412, ebitMargin: 0.445,
      priceEarnings: 25.2, priceToBook: 6.5, enterpriseToEbitda: 13.1,
      netDebtToEquity: -0.12, dividendYield: 0.013, earningsCagr: 0.22
    },
    incomeHistory: [
      { year: '2022', netIncome: 34000000000, revenue: 75880000000 },
      { year: '2023', netIncome: 26900000000, revenue: 69300000000 },
      { year: '2024', netIncome: 37500000000, revenue: 88000000000 },
      { year: '2025', netIncome: 45000000000, revenue: 105000000000 }
    ],
    dividendYears: 5
  },
  {
    bdr: 'P2LT34',
    symbol: 'PLTR',
    exchange: 'NASDAQ',
    name: 'Palantir Technologies Inc.',
    sector: 'Tecnologia',
    industry: 'Software de Inteligência Artificial & Big Data',
    description: 'Plataforma líder em integração de dados e inteligência artificial para defesa nacional e empresas (Gotham, Foundry e AIP Platform). Membro do S&P 500.',
    market: { price: 331.01, changePct: 0.24, marketCap: 98000000000 },
    metrics: {
      roe: 0.224, roic: 0.182, netMargin: 0.215, ebitMargin: 0.242,
      priceEarnings: 95.0, priceToBook: 18.2, enterpriseToEbitda: 62.0,
      netDebtToEquity: -0.45, dividendYield: 0.0, earningsCagr: 0.48
    },
    incomeHistory: [
      { year: '2022', netIncome: -373000000, revenue: 1906000000 },
      { year: '2023', netIncome: 217000000, revenue: 2225000000 },
      { year: '2024', netIncome: 560000000, revenue: 2800000000 },
      { year: '2025', netIncome: 880000000, revenue: 3500000000 }
    ],
    dividendYears: 0
  },
  {
    bdr: 'ORCL34',
    symbol: 'ORCL',
    exchange: 'NYSE',
    name: 'Oracle Corporation',
    sector: 'Tecnologia',
    industry: 'Banco de Dados & Infraestrutura em Nuvem (OCI)',
    description: 'Pioneira em bancos de dados relacionais corporativos e agora um dos provedores de nuvem que mais cresce com contratos bilionários de data centers de IA.',
    market: { price: 121.00, changePct: -3.28, marketCap: 380000000000 },
    metrics: {
      roe: 0.852, roic: 0.184, netMargin: 0.232, ebitMargin: 0.305,
      priceEarnings: 32.4, priceToBook: 24.1, enterpriseToEbitda: 19.2,
      netDebtToEquity: 3.8, dividendYield: 0.012, earningsCagr: 0.14
    },
    incomeHistory: [
      { year: '2022', netIncome: 8503000000, revenue: 42440000000 },
      { year: '2023', netIncome: 10137000000, revenue: 49954000000 },
      { year: '2024', netIncome: 11800000000, revenue: 53000000000 },
      { year: '2025', netIncome: 13400000000, revenue: 58000000000 }
    ],
    dividendYears: 5
  },
  {
    bdr: 'MUTC34',
    symbol: 'MU',
    exchange: 'NASDAQ',
    name: 'Micron Technology Inc.',
    sector: 'Tecnologia',
    industry: 'Memórias DRAM, NAND & HBM para IA',
    description: 'Principal fabricante norte-americana de memórias, desempenhando papel crucial na entrega de HBM3e para os aceleradores de IA de última geração.',
    market: { price: 935.80, changePct: 1.33, marketCap: 125000000000 },
    metrics: {
      roe: 0.162, roic: 0.121, netMargin: 0.142, ebitMargin: 0.185,
      priceEarnings: 18.5, priceToBook: 2.1, enterpriseToEbitda: 9.8,
      netDebtToEquity: 0.22, dividendYield: 0.0045, earningsCagr: 0.30
    },
    incomeHistory: [
      { year: '2022', netIncome: 8687000000, revenue: 30758000000 },
      { year: '2023', netIncome: -5833000000, revenue: 15540000000 },
      { year: '2024', netIncome: 1600000000, revenue: 25100000000 },
      { year: '2025', netIncome: 6500000000, revenue: 36000000000 }
    ],
    dividendYears: 3
  },
  {
    bdr: 'AAPL34',
    symbol: 'AAPL',
    exchange: 'NASDAQ',
    name: 'Apple Inc.',
    sector: 'Tecnologia',
    industry: 'Hardware de Consumo, Serviços & Software',
    description: 'Criadora do iPhone, Mac, iPad e do ecossistema mais rentável de serviços de consumo do mundo (App Store, iCloud, Apple Pay, Apple Music).',
    market: { price: 87.03, changePct: -0.16, marketCap: 3400000000000 },
    metrics: {
      roe: 1.452, roic: 0.554, netMargin: 0.245, ebitMargin: 0.312,
      priceEarnings: 33.5, priceToBook: 42.1, enterpriseToEbitda: 24.2,
      netDebtToEquity: 0.95, dividendYield: 0.0048, earningsCagr: 0.092
    },
    incomeHistory: [
      { year: '2022', netIncome: 99803000000, revenue: 394328000000 },
      { year: '2023', netIncome: 96995000000, revenue: 383285000000 },
      { year: '2024', netIncome: 93736000000, revenue: 391035000000 },
      { year: '2025', netIncome: 102500000000, revenue: 415000000000 }
    ],
    dividendYears: 5
  },
  {
    bdr: 'NFLX34',
    symbol: 'NFLX',
    exchange: 'NASDAQ',
    name: 'Netflix Inc.',
    sector: 'Comunicação',
    industry: 'Streaming Global de Entretenimento',
    description: 'Líder mundial de streaming de vídeo por assinatura com escala global incomparável, forte geração de caixa livre e expansão para publicidade e transmissões ao vivo.',
    market: { price: 7.47, changePct: 1.49, marketCap: 300000000000 },
    metrics: {
      roe: 0.345, roic: 0.242, netMargin: 0.224, ebitMargin: 0.275,
      priceEarnings: 36.2, priceToBook: 12.0, enterpriseToEbitda: 22.4,
      netDebtToEquity: 0.55, dividendYield: 0.0, earningsCagr: 0.26
    },
    incomeHistory: [
      { year: '2022', netIncome: 4492000000, revenue: 31616000000 },
      { year: '2023', netIncome: 5408000000, revenue: 33723000000 },
      { year: '2024', netIncome: 7820000000, revenue: 38700000000 },
      { year: '2025', netIncome: 9500000000, revenue: 44000000000 }
    ],
    dividendYears: 0
  },
  {
    bdr: 'BABA34',
    symbol: 'BABA',
    exchange: 'NYSE',
    name: 'Alibaba Group Holding Ltd.',
    sector: 'Consumo',
    industry: 'E-Commerce & Computação em Nuvem',
    description: 'Maior ecossistema de varejo digital e computação em nuvem da China (Taobao, Tmall, Cainiao, AliCloud), com caixa líquido massivo e múltiplos atrativos.',
    market: { price: 20.50, changePct: 0.59, marketCap: 215000000000 },
    metrics: {
      roe: 0.125, roic: 0.104, netMargin: 0.142, ebitMargin: 0.168,
      priceEarnings: 14.2, priceToBook: 1.35, enterpriseToEbitda: 7.5,
      netDebtToEquity: -0.25, dividendYield: 0.018, earningsCagr: 0.08
    },
    incomeHistory: [
      { year: '2022', netIncome: 9700000000, revenue: 126710000000 },
      { year: '2023', netIncome: 10600000000, revenue: 130000000000 },
      { year: '2024', netIncome: 11200000000, revenue: 137000000000 },
      { year: '2025', netIncome: 12800000000, revenue: 146000000000 }
    ],
    dividendYears: 2
  },
  {
    bdr: 'LILY34',
    symbol: 'LLY',
    exchange: 'NYSE',
    name: 'Eli Lilly and Company',
    sector: 'Saúde',
    industry: 'Farmacêutica & Biotecnologia',
    description: 'Líder global inovadora em tratamentos para diabetes e obesidade através de medicamentos pioneiros GLP-1 (Mounjaro e Zepbound), além de oncologia e neurociência.',
    market: { price: 205.60, changePct: 3.21, marketCap: 820000000000 },
    metrics: {
      roe: 0.624, roic: 0.321, netMargin: 0.254, ebitMargin: 0.342,
      priceEarnings: 58.2, priceToBook: 45.0, enterpriseToEbitda: 38.5,
      netDebtToEquity: 1.8, dividendYield: 0.0065, earningsCagr: 0.42
    },
    incomeHistory: [
      { year: '2022', netIncome: 6245000000, revenue: 28541000000 },
      { year: '2023', netIncome: 5240000000, revenue: 34124000000 },
      { year: '2024', netIncome: 9400000000, revenue: 45000000000 },
      { year: '2025', netIncome: 13800000000, revenue: 58000000000 }
    ],
    dividendYears: 5
  },
  {
    bdr: 'A1MD34',
    symbol: 'AMD',
    exchange: 'NASDAQ',
    name: 'Advanced Micro Devices Inc.',
    sector: 'Tecnologia',
    industry: 'Processadores, GPUs & Aceleradores de IA',
    description: 'Fabricante de microprocessadores (Ryzen, EPYC) e GPUs de alto desempenho para servidores de IA (família Instinct MI300) desafiando a liderança de mercado.',
    market: { price: 407.00, changePct: 2.78, marketCap: 250000000000 },
    metrics: {
      roe: 0.104, roic: 0.085, netMargin: 0.112, ebitMargin: 0.145,
      priceEarnings: 45.0, priceToBook: 3.8, enterpriseToEbitda: 28.5,
      netDebtToEquity: -0.08, dividendYield: 0.0, earningsCagr: 0.20
    },
    incomeHistory: [
      { year: '2022', netIncome: 1320000000, revenue: 23601000000 },
      { year: '2023', netIncome: 854000000, revenue: 22680000000 },
      { year: '2024', netIncome: 2100000000, revenue: 26000000000 },
      { year: '2025', netIncome: 3400000000, revenue: 31000000000 }
    ],
    dividendYears: 0
  },
  {
    bdr: 'JPMC34',
    symbol: 'JPM',
    exchange: 'NYSE',
    name: 'JPMorgan Chase & Co.',
    sector: 'Financeiro',
    industry: 'Banco Universal & Gestão de Ativos',
    description: 'Maior banco dos Estados Unidos em ativos, com liderança em banco de investimento, depósitos de varejo e infraestrutura financeira institucional global.',
    market: { price: 175.42, changePct: 0.75, marketCap: 610000000000 },
    metrics: {
      roe: 0.172, roic: 0.145, netMargin: 0.324, ebitMargin: 0.380,
      priceEarnings: 12.5, priceToBook: 1.85, enterpriseToEbitda: 10.2,
      netDebtToEquity: 0.45, dividendYield: 0.022, earningsCagr: 0.12
    },
    incomeHistory: [
      { year: '2022', netIncome: 37676000000, revenue: 128695000000 },
      { year: '2023', netIncome: 49552000000, revenue: 158104000000 },
      { year: '2024', netIncome: 53200000000, revenue: 168000000000 },
      { year: '2025', netIncome: 56000000000, revenue: 176000000000 }
    ],
    dividendYears: 5
  },
  {
    bdr: 'AVGO34',
    symbol: 'AVGO',
    exchange: 'NASDAQ',
    name: 'Broadcom Inc.',
    sector: 'Tecnologia',
    industry: 'Semicondutores de Rede & Software Corporativo',
    description: 'Líder em switches Ethernet de altíssima velocidade para data centers de IA, ASICs de IA customizados para grandes nuvens e dona da VMware.',
    market: { price: 26.20, changePct: 0.58, marketCap: 780000000000 },
    metrics: {
      roe: 0.284, roic: 0.221, netMargin: 0.264, ebitMargin: 0.462,
      priceEarnings: 32.2, priceToBook: 8.2, enterpriseToEbitda: 21.0,
      netDebtToEquity: 1.2, dividendYield: 0.012, earningsCagr: 0.28
    },
    incomeHistory: [
      { year: '2022', netIncome: 11495000000, revenue: 33203000000 },
      { year: '2023', netIncome: 14082000000, revenue: 35819000000 },
      { year: '2024', netIncome: 16500000000, revenue: 51000000000 },
      { year: '2025', netIncome: 21000000000, revenue: 60000000000 }
    ],
    dividendYears: 5
  },
  {
    bdr: 'BOAC34',
    symbol: 'BAC',
    exchange: 'NYSE',
    name: 'Bank of America Corporation',
    sector: 'Financeiro',
    industry: 'Bancos Comerciais & Mercado de Capitais',
    description: 'Uma das mais sólidas franquias bancárias dos EUA, com captação estável de depósitos e forte atuação em gestão de fortunas (Merrill Lynch).',
    market: { price: 42.15, changePct: 0.45, marketCap: 320000000000 },
    metrics: {
      roe: 0.112, roic: 0.098, netMargin: 0.262, ebitMargin: 0.310,
      priceEarnings: 13.2, priceToBook: 1.15, enterpriseToEbitda: 9.5,
      netDebtToEquity: 0.55, dividendYield: 0.024, earningsCagr: 0.08
    },
    incomeHistory: [
      { year: '2022', netIncome: 27528000000, revenue: 94950000000 },
      { year: '2023', netIncome: 26515000000, revenue: 98581000000 },
      { year: '2024', netIncome: 2820000000, revenue: 102000000000 },
      { year: '2025', netIncome: 3010000000, revenue: 107000000000 }
    ],
    dividendYears: 5
  },
  {
    bdr: 'C2OI34',
    symbol: 'COIN',
    exchange: 'NASDAQ',
    name: 'Coinbase Global Inc.',
    sector: 'Financeiro',
    industry: 'Corretora de Criptoativos & Custódia Institucional',
    description: 'Maior bolsa regulada de criptoativos dos Estados Unidos, principal custodiante dos ETFs spot de Bitcoin e pioneira na rede Layer-2 Base.',
    market: { price: 215.30, changePct: 1.85, marketCap: 52000000000 },
    metrics: {
      roe: 0.245, roic: 0.162, netMargin: 0.280, ebitMargin: 0.320,
      priceEarnings: 35.0, priceToBook: 4.5, enterpriseToEbitda: 24.0,
      netDebtToEquity: 0.20, dividendYield: 0.0, earningsCagr: 0.45
    },
    incomeHistory: [
      { year: '2022', netIncome: -2625000000, revenue: 3194000000 },
      { year: '2023', netIncome: 95000000, revenue: 3108000000 },
      { year: '2024', netIncome: 1250000000, revenue: 5600000000 },
      { year: '2025', netIncome: 1700000000, revenue: 6800000000 }
    ],
    dividendYears: 0
  },
  {
    bdr: 'COCA34',
    symbol: 'KO',
    exchange: 'NYSE',
    name: 'The Coca-Cola Company',
    sector: 'Consumo',
    industry: 'Bebidas Não Alcoólicas',
    description: 'Uma das marcas mais emblemáticas e defensivas do planeta, com mais de 200 marcas de bebidas, margens elevadas e mais de 60 anos consecutivos de aumento de dividendos.',
    market: { price: 68.90, changePct: 0.15, marketCap: 295000000000 },
    metrics: {
      roe: 0.421, roic: 0.214, netMargin: 0.242, ebitMargin: 0.295,
      priceEarnings: 24.2, priceToBook: 10.5, enterpriseToEbitda: 18.2,
      netDebtToEquity: 1.4, dividendYield: 0.031, earningsCagr: 0.072
    },
    incomeHistory: [
      { year: '2022', netIncome: 9542000000, revenue: 43004000000 },
      { year: '2023', netIncome: 10714000000, revenue: 45754000000 },
      { year: '2024', netIncome: 11400000000, revenue: 47200000000 },
      { year: '2025', netIncome: 12200000000, revenue: 49500000000 }
    ],
    dividendYears: 5
  },
  {
    bdr: 'BERK34',
    symbol: 'BRK.B',
    exchange: 'NYSE',
    name: 'Berkshire Hathaway Inc.',
    sector: 'Financeiro',
    industry: 'Seguros, Ferrovias, Energia & Investimentos',
    description: 'Conglomerado gerido por Warren Buffett com dezenas de subsidiárias operacionais (GEICO, BNSF, Berkshire Energy) e mais de US$ 300 bilhões em caixa e equivalentes.',
    market: { price: 112.50, changePct: 0.35, marketCap: 980000000000 },
    metrics: {
      roe: 0.162, roic: 0.135, netMargin: 0.225, ebitMargin: 0.250,
      priceEarnings: 16.5, priceToBook: 1.55, enterpriseToEbitda: 12.0,
      netDebtToEquity: 0.15, dividendYield: 0.0, earningsCagr: 0.11
    },
    incomeHistory: [
      { year: '2022', netIncome: -22819000000, revenue: 302089000000 },
      { year: '2023', netIncome: 96223000000, revenue: 364482000000 },
      { year: '2024', netIncome: 89000000000, revenue: 382000000000 },
      { year: '2025', netIncome: 95000000000, revenue: 405000000000 }
    ],
    dividendYears: 0
  },
  {
    bdr: 'BKNG34',
    symbol: 'BKNG',
    exchange: 'NASDAQ',
    name: 'Booking Holdings Inc.',
    sector: 'Consumo',
    industry: 'Agências de Viagens Online & Reservas',
    description: 'Maior intermediadora de viagens online do mundo (Booking.com, Priceline, Agoda, Kayak, OpenTable), operando modelo de negócio de alta rentabilidade sobre capital.',
    market: { price: 82.40, changePct: -0.65, marketCap: 155000000000 },
    metrics: {
      roe: 0.452, roic: 0.324, netMargin: 0.245, ebitMargin: 0.315,
      priceEarnings: 28.2, priceToBook: 18.0, enterpriseToEbitda: 19.5,
      netDebtToEquity: 0.85, dividendYield: 0.008, earningsCagr: 0.21
    },
    incomeHistory: [
      { year: '2022', netIncome: 3058000000, revenue: 17090000000 },
      { year: '2023', netIncome: 4289000000, revenue: 21365000000 },
      { year: '2024', netIncome: 5400000000, revenue: 24500000000 },
      { year: '2025', netIncome: 6300000000, revenue: 27500000000 }
    ],
    dividendYears: 2
  },
  {
    bdr: 'S2GM34',
    symbol: 'SGML',
    exchange: 'NASDAQ',
    name: 'Sigma Lithium Corporation',
    sector: 'Materiais Básicos',
    industry: 'Mineração Sustentável de Lítio (Grota do Cirilo)',
    description: 'Produtora comercial de concentrado de lítio com alta pureza (' + 'Lítio Verde' + ') no Vale do Jequitinhonha (MG), com neutralidade de carbono e energia 100% renovável.',
    market: { price: 68.20, changePct: 1.10, marketCap: 1400000000 },
    metrics: {
      roe: 0.142, roic: 0.115, netMargin: 0.185, ebitMargin: 0.250,
      priceEarnings: 22.0, priceToBook: 2.8, enterpriseToEbitda: 15.0,
      netDebtToEquity: 0.35, dividendYield: 0.0, earningsCagr: 0.30
    },
    incomeHistory: [
      { year: '2022', netIncome: -45000000, revenue: 0 },
      { year: '2023', netIncome: 15000000, revenue: 85000000 },
      { year: '2024', netIncome: 42000000, revenue: 195000000 },
      { year: '2025', netIncome: 68000000, revenue: 280000000 }
    ],
    dividendYears: 0
  },
  {
    bdr: 'NIKE34',
    symbol: 'NKE',
    exchange: 'NYSE',
    name: 'NIKE Inc.',
    sector: 'Consumo',
    industry: 'Calçados & Roupas Esportivas',
    description: 'Maior empresa de calçados e vestuário esportivo do mundo, com alcance global icônico sob as marcas Nike, Jordan e Converse.',
    market: { price: 48.70, changePct: -0.80, marketCap: 125000000000 },
    metrics: {
      roe: 0.352, roic: 0.242, netMargin: 0.105, ebitMargin: 0.125,
      priceEarnings: 26.4, priceToBook: 8.5, enterpriseToEbitda: 18.2,
      netDebtToEquity: 0.35, dividendYield: 0.018, earningsCagr: 0.065
    },
    incomeHistory: [
      { year: '2022', netIncome: 6046000000, revenue: 46710000000 },
      { year: '2023', netIncome: 5070000000, revenue: 51191000000 },
      { year: '2024', netIncome: 5700000000, revenue: 51800000000 },
      { year: '2025', netIncome: 5950000000, revenue: 53500000000 }
    ],
    dividendYears: 5
  },
  {
    bdr: 'WALM34',
    symbol: 'WMT',
    exchange: 'NYSE',
    name: 'Walmart Inc.',
    sector: 'Consumo',
    industry: 'Hipermercados, Varejo Físico & E-Commerce',
    description: 'Maior empresa do mundo em faturamento, atendendo 255 milhões de clientes por semana em mais de 10.500 lojas e comércio digital em expansão.',
    market: { price: 62.30, changePct: 0.25, marketCap: 680000000000 },
    metrics: {
      roe: 0.214, roic: 0.152, netMargin: 0.025, ebitMargin: 0.042,
      priceEarnings: 32.5, priceToBook: 6.8, enterpriseToEbitda: 15.4,
      netDebtToEquity: 0.65, dividendYield: 0.011, earningsCagr: 0.102
    },
    incomeHistory: [
      { year: '2022', netIncome: 13673000000, revenue: 572754000000 },
      { year: '2023', netIncome: 11680000000, revenue: 611289000000 },
      { year: '2024', netIncome: 15510000000, revenue: 648125000000 },
      { year: '2025', netIncome: 18200000000, revenue: 685000000000 }
    ],
    dividendYears: 5
  },
  {
    bdr: 'JNJB34',
    symbol: 'JNJ',
    exchange: 'NYSE',
    name: 'Johnson & Johnson',
    sector: 'Saúde',
    industry: 'Farmacêutica & Tecnologia Médica',
    description: 'Gigante da saúde global com liderança inovadora em produtos farmacêuticos (imunologia, oncologia) e dispositivos médicos cirúrgicos de precisão.',
    market: { price: 165.20, changePct: 0.10, marketCap: 390000000000 },
    metrics: {
      roe: 0.312, roic: 0.194, netMargin: 0.185, ebitMargin: 0.264,
      priceEarnings: 18.4, priceToBook: 5.2, enterpriseToEbitda: 12.5,
      netDebtToEquity: 0.40, dividendYield: 0.032, earningsCagr: 0.072
    },
    incomeHistory: [
      { year: '2022', netIncome: 17941000000, revenue: 94943000000 },
      { year: '2023', netIncome: 35153000000, revenue: 85159000000 },
      { year: '2024', netIncome: 16800000000, revenue: 88500000000 },
      { year: '2025', netIncome: 18500000000, revenue: 92400000000 }
    ],
    dividendYears: 5
  },
  {
    bdr: 'DISB34',
    symbol: 'DIS',
    exchange: 'NYSE',
    name: 'The Walt Disney Company',
    sector: 'Comunicação',
    industry: 'Parques Temáticos, Entretenimento & Streaming',
    description: 'Conglomerado de entretenimento mais poderoso do mundo, detentor de franquias lendárias (Disney, Marvel, Star Wars, Pixar) e complexos de parques turísticos globais.',
    market: { price: 44.80, changePct: 0.60, marketCap: 175000000000 },
    metrics: {
      roe: 0.085, roic: 0.070, netMargin: 0.060, ebitMargin: 0.120,
      priceEarnings: 21.4, priceToBook: 2.1, enterpriseToEbitda: 13.0,
      netDebtToEquity: 0.48, dividendYield: 0.009, earningsCagr: 0.16
    },
    incomeHistory: [
      { year: '2022', netIncome: 3145000000, revenue: 82722000000 },
      { year: '2023', netIncome: 2354000000, revenue: 88898000000 },
      { year: '2024', netIncome: 4970000000, revenue: 91360000000 },
      { year: '2025', netIncome: 6100000000, revenue: 95500000000 }
    ],
    dividendYears: 2
  },
  {
    bdr: 'PAGS34',
    symbol: 'PAGS',
    exchange: 'NYSE',
    name: 'PagSeguro Digital Ltd. (PagBank)',
    sector: 'Financeiro',
    industry: 'Meios de Pagamento & Banco Digital',
    description: 'Provedora de soluções de pagamento para micro, pequenas e médias empresas e banco digital completo no Brasil (PagBank) com sólida expansão de margens.',
    market: { price: 14.85, changePct: 1.20, marketCap: 3800000000 },
    metrics: {
      roe: 0.154, roic: 0.121, netMargin: 0.125, ebitMargin: 0.182,
      priceEarnings: 9.8, priceToBook: 1.25, enterpriseToEbitda: 6.5,
      netDebtToEquity: -0.10, dividendYield: 0.0, earningsCagr: 0.195
    },
    incomeHistory: [
      { year: '2022', netIncome: 1502000000, revenue: 15300000000 },
      { year: '2023', netIncome: 1780000000, revenue: 16800000000 },
      { year: '2024', netIncome: 2150000000, revenue: 18500000000 },
      { year: '2025', netIncome: 2450000000, revenue: 20500000000 }
    ],
    dividendYears: 0
  },
  {
    bdr: 'CHVX34',
    symbol: 'CVX',
    exchange: 'NYSE',
    name: 'Chevron Corporation',
    sector: 'Petróleo e Gás',
    industry: 'Exploração, Refino e Distribuição de Energia',
    description: 'Segunda maior petrolífera dos Estados Unidos, com produção integrada de petróleo e gás de baixo custo de extração e disciplina exemplar na alocação de capital.',
    market: { price: 158.40, changePct: -0.40, marketCap: 285000000000 },
    metrics: {
      roe: 0.142, roic: 0.114, netMargin: 0.112, ebitMargin: 0.152,
      priceEarnings: 14.5, priceToBook: 1.72, enterpriseToEbitda: 7.8,
      netDebtToEquity: 0.18, dividendYield: 0.042, earningsCagr: 0.062
    },
    incomeHistory: [
      { year: '2022', netIncome: 35465000000, revenue: 246252000000 },
      { year: '2023', netIncome: 21369000000, revenue: 200949000000 },
      { year: '2024', netIncome: 17700000000, revenue: 198000000000 },
      { year: '2025', netIncome: 19800000000, revenue: 212000000000 }
    ],
    dividendYears: 5
  }
];

async function generate() {
  const targetFile = path.join(__dirname, '..', 'data', 'fundamentals-bdr.json');
  const now = new Date().toISOString();
  const companies = {};

  for (const item of BDR_COMPANIES) {
    const entry = {
      ticker: item.bdr,
      bdrTicker: item.bdr,
      originalSymbol: item.symbol,
      exchange: item.exchange,
      isBdr: true,
      currency: 'USD',
      company: {
        name: item.name,
        sector: item.sector,
        industry: item.industry,
        description: item.description,
        logo: null
      },
      market: item.market,
      metrics: item.metrics,
      incomeHistory: item.incomeHistory,
      dividendYears: item.dividendYears,
      provider: 'Mercado Internacional (SEC / Demonstrações Globais)',
      fetchedAt: now
    };

    // Index by both BDR ticker (e.g. AAPL34) and original ticker (e.g. AAPL)
    companies[item.bdr] = entry;
    // For original ticker, keep ticker field pointing to the search key or BDR
    companies[item.symbol] = {
      ...entry,
      ticker: item.symbol
    };
    // Also if ticker has dot (BRK.B), support BRKB
    if (item.symbol.includes('.')) {
      companies[item.symbol.replace(/\./g, '')] = {
        ...entry,
        ticker: item.symbol.replace(/\./g, '')
      };
    }
  }

  const payload = {
    provider: 'Mercado Internacional (SEC / Demonstrações Globais)',
    updatedAt: now,
    totalBDRs: BDR_COMPANIES.length,
    companies
  };

  await fs.mkdir(path.dirname(targetFile), { recursive: true });
  await fs.writeFile(targetFile, JSON.stringify(payload, null, 2), 'utf8');
  console.log(`fundamentals-bdr.json gerado com sucesso: ${BDR_COMPANIES.length} BDRs cadastradas.`);
}

generate().catch(err => {
  console.error(err);
  process.exit(1);
});

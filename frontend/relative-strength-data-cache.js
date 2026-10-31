/* ==========================================================================
   Healthy Trend Trader — Cache de Dados de Força Relativa (B3 e Nasdaq)
   Gerado automaticamente a partir do último fechamento em market-cache.json
   Garante disponibilidade instantânea dos dados reais mesmo em modo offline.
   ========================================================================== */
(function() {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const staticCache = {
  "updatedAt": "2026-10-31T00:13:32.216Z",
  "dataAsOf": "20261030",
  "source": "B3 (COTAHIST)",
  "daily": {
    "stock_ibov": {
      "key": "stock_ibov",
      "label": "Ações Ibovespa",
      "benchmark": "IBOV",
      "items": [
        {
          "symbol": "PETR3",
          "name": "PETROLEO BRASILEIRO S.A. PETROBRAS",
          "sector": "Energy Minerals",
          "m1": 11.397809541488769,
          "m3": 22.3694942903752,
          "score": 100,
          "benchmark": "IBOV",
          "rank": 1
        },
        {
          "symbol": "PRIO3",
          "name": "PRIO S.A.",
          "sector": "Energy Minerals",
          "m1": 17.38916256157634,
          "m3": 17.485620377978627,
          "score": 99,
          "benchmark": "IBOV",
          "rank": 2
        },
        {
          "symbol": "PETR4",
          "name": "PETROLEO BRASILEIRO S.A. PETROBRAS",
          "sector": "Energy Minerals",
          "m1": 7.308631921824116,
          "m3": 21.39567019806541,
          "score": 97,
          "benchmark": "IBOV",
          "rank": 3
        },
        {
          "symbol": "SUZB3",
          "name": "SUZANO S.A.",
          "sector": "Process Industries",
          "m1": 13.438914027149318,
          "m3": 15.743305632502302,
          "score": 96,
          "benchmark": "IBOV",
          "rank": 4
        },
        {
          "symbol": "EMBJ3",
          "name": "EMBRAER S.A.",
          "sector": "Electronic Technology",
          "m1": 2.3738567464803184,
          "m3": 14.650707791460471,
          "score": 95,
          "benchmark": "IBOV",
          "rank": 5
        },
        {
          "symbol": "FLRY3",
          "name": "FLEURY S.A.",
          "sector": "Health Services",
          "m1": -10.179903466432648,
          "m3": 19.42823803967326,
          "score": 93,
          "benchmark": "IBOV",
          "rank": 6
        },
        {
          "symbol": "CXSE3",
          "name": "CAIXA SEGURIDADE PARTICIPAÇÕES S.A.",
          "sector": "Finance",
          "m1": 7.5452716297786715,
          "m3": 5.5802469135802335,
          "score": 92,
          "benchmark": "IBOV",
          "rank": 7
        },
        {
          "symbol": "BBSE3",
          "name": "BB SEGURIDADE PARTICIPAÇÕES S.A.",
          "sector": "Finance",
          "m1": 5.461970393057691,
          "m3": 0.14541929229279216,
          "score": 91,
          "benchmark": "IBOV",
          "rank": 8
        },
        {
          "symbol": "GOAU4",
          "name": "METALURGICA GERDAU S.A.",
          "sector": "Non-Energy Minerals",
          "m1": 1.5539305301645268,
          "m3": 1.7399267399267337,
          "score": 89,
          "benchmark": "IBOV",
          "rank": 9
        },
        {
          "symbol": "GGBR4",
          "name": "GERDAU S.A.",
          "sector": "Non-Energy Minerals",
          "m1": 3.5434693036670684,
          "m3": 0.6004803843074447,
          "score": 88,
          "benchmark": "IBOV",
          "rank": 10
        },
        {
          "symbol": "WEGE3",
          "name": "WEG S.A.",
          "sector": "Producer Manufacturing",
          "m1": -2.224019409623945,
          "m3": 2.457627118644057,
          "score": 87,
          "benchmark": "IBOV",
          "rank": 11
        },
        {
          "symbol": "TIMS3",
          "name": "TIM S.A.",
          "sector": "Communications",
          "m1": 4.5826513911620514,
          "m3": -1.3381369016983946,
          "score": 85,
          "benchmark": "IBOV",
          "rank": 12
        },
        {
          "symbol": "TOTS3",
          "name": "TOTVS S.A.",
          "sector": "Technology Services",
          "m1": -4.27759497457374,
          "m3": 3.0264005151320106,
          "score": 84,
          "benchmark": "IBOV",
          "rank": 13
        },
        {
          "symbol": "YDUQ3",
          "name": "YDUQS PARTICIPACOES S.A.",
          "sector": "Commercial Services",
          "m1": -20.017953321364455,
          "m3": 7.869249394673128,
          "score": 83,
          "benchmark": "IBOV",
          "rank": 14
        },
        {
          "symbol": "TAEE11",
          "name": "TRANSMISSORA ALIANÇA DE ENERGIA ELÉTRICA S.A.",
          "sector": "Industrial Services",
          "m1": -5.309734513274334,
          "m3": -0.17650025214319687,
          "score": 81,
          "benchmark": "IBOV",
          "rank": 15
        },
        {
          "symbol": "VIVT3",
          "name": "TELEFÔNICA BRASIL S.A",
          "sector": "Communications",
          "m1": 2.9855753102985494,
          "m3": -5.914802329144964,
          "score": 80,
          "benchmark": "IBOV",
          "rank": 16
        },
        {
          "symbol": "BRAV3",
          "name": "BRAVA ENERGIA S.A.",
          "sector": "Energy Minerals",
          "m1": 1.655629139072845,
          "m3": -6.969696969696959,
          "score": 79,
          "benchmark": "IBOV",
          "rank": 17
        },
        {
          "symbol": "ENEV3",
          "name": "ENEVA S.A",
          "sector": "Utilities",
          "m1": -7.786149982059564,
          "m3": -2.3185100722158847,
          "score": 77,
          "benchmark": "IBOV",
          "rank": 18
        },
        {
          "symbol": "HYPE3",
          "name": "HYPERA S.A.",
          "sector": "Health Technology",
          "m1": -13.112745098039213,
          "m3": 0,
          "score": 76,
          "benchmark": "IBOV",
          "rank": 19
        },
        {
          "symbol": "KLBN11",
          "name": "KLABIN S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -5.024848150193262,
          "m3": -5.753424657534245,
          "score": 75,
          "benchmark": "IBOV",
          "rank": 20
        },
        {
          "symbol": "MGLU3",
          "name": "MAGAZINE LUIZA S.A.",
          "sector": "Retail Trade",
          "m1": -28.284182305630033,
          "m3": 6.361829025844923,
          "score": 73,
          "benchmark": "IBOV",
          "rank": 21
        },
        {
          "symbol": "CPLE3",
          "name": "CIA PARANAENSE DE ENERGIA - COPEL",
          "sector": "Utilities",
          "m1": -10.499999999999998,
          "m3": -3.4389750505731564,
          "score": 72,
          "benchmark": "IBOV",
          "rank": 22
        },
        {
          "symbol": "AURE3",
          "name": "AUREN ENERGIA S.A.",
          "sector": "Utilities",
          "m1": -16.513056835637485,
          "m3": -1.0018214936247882,
          "score": 71,
          "benchmark": "IBOV",
          "rank": 23
        },
        {
          "symbol": "ABEV3",
          "name": "AMBEV S.A.",
          "sector": "Consumer Non-Durables",
          "m1": -4.9479166666666625,
          "m3": -8.69293308317699,
          "score": 69,
          "benchmark": "IBOV",
          "rank": 24
        },
        {
          "symbol": "UGPA3",
          "name": "ULTRAPAR PARTICIPACOES S.A.",
          "sector": "Retail Trade",
          "m1": -15.64409030544488,
          "m3": -3.9031770045385605,
          "score": 68,
          "benchmark": "IBOV",
          "rank": 25
        },
        {
          "symbol": "RAIL3",
          "name": "RUMO S.A.",
          "sector": "Transportation",
          "m1": -15.408225905463468,
          "m3": -4.570637119113574,
          "score": 67,
          "benchmark": "IBOV",
          "rank": 26
        },
        {
          "symbol": "ISAE4",
          "name": "ISA ENERGIA BRASIL S.A",
          "sector": "Utilities",
          "m1": -10.257339615802818,
          "m3": -7.921160282632944,
          "score": 65,
          "benchmark": "IBOV",
          "rank": 27
        },
        {
          "symbol": "CPFE3",
          "name": "CPFL ENERGIA S.A.",
          "sector": "Utilities",
          "m1": -7.932322566468908,
          "m3": -9.189423493714788,
          "score": 64,
          "benchmark": "IBOV",
          "rank": 28
        },
        {
          "symbol": "MOTV3",
          "name": "MOTIVA INFRAESTRUTURA DE MOBILIDADE S.A.",
          "sector": "Transportation",
          "m1": -16.417910447761198,
          "m3": -5.1490514905149,
          "score": 63,
          "benchmark": "IBOV",
          "rank": 29
        },
        {
          "symbol": "MBRF3",
          "name": "MBRF GLOBAL FOODS COMPANY S.A.",
          "sector": "Consumer Non-Durables",
          "m1": -6.972586412395721,
          "m3": -11.003420752565562,
          "score": 61,
          "benchmark": "IBOV",
          "rank": 30
        },
        {
          "symbol": "SBSP3",
          "name": "CIA SANEAMENTO BASICO EST SAO PAULO",
          "sector": "Utilities",
          "m1": -9.952606635071092,
          "m3": -10.83032490974729,
          "score": 60,
          "benchmark": "IBOV",
          "rank": 31
        },
        {
          "symbol": "CMIG4",
          "name": "CIA ENERGETICA DE MINAS GERAIS - CEMIG",
          "sector": "Utilities",
          "m1": -9.76702508960573,
          "m3": -11.199294532627857,
          "score": 59,
          "benchmark": "IBOV",
          "rank": 32
        },
        {
          "symbol": "CMIN3",
          "name": "CSN MINERAÇÃO S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -2.9940119760478945,
          "m3": -14.88616462346759,
          "score": 57,
          "benchmark": "IBOV",
          "rank": 33
        },
        {
          "symbol": "ITUB4",
          "name": "ITAU UNIBANCO HOLDING S.A.",
          "sector": "Finance",
          "m1": -12.624209575429092,
          "m3": -9.792492422476107,
          "score": 56,
          "benchmark": "IBOV",
          "rank": 34
        },
        {
          "symbol": "CURY3",
          "name": "CURY CONSTRUTORA E INCORPORADORA S.A.",
          "sector": "Finance",
          "m1": -6.633020908435472,
          "m3": -13.924891990694588,
          "score": 55,
          "benchmark": "IBOV",
          "rank": 35
        },
        {
          "symbol": "EGIE3",
          "name": "ENGIE BRASIL ENERGIA S.A.",
          "sector": "Utilities",
          "m1": -10.862186014935505,
          "m3": -11.87919463087248,
          "score": 53,
          "benchmark": "IBOV",
          "rank": 36
        },
        {
          "symbol": "RDOR3",
          "name": "REDE DOR SÃO LUIZ S.A.",
          "sector": "Health Services",
          "m1": -17.262992948550536,
          "m3": -8.545034642032334,
          "score": 52,
          "benchmark": "IBOV",
          "rank": 37
        },
        {
          "symbol": "ITSA4",
          "name": "ITAUSA S.A.",
          "sector": "Finance",
          "m1": -14.726027397260278,
          "m3": -9.913169319826343,
          "score": 51,
          "benchmark": "IBOV",
          "rank": 38
        },
        {
          "symbol": "AXIA3",
          "name": "AXIA ENERGIA S.A.",
          "sector": "Utilities",
          "m1": -14.308943089430892,
          "m3": -10.204468004543731,
          "score": 49,
          "benchmark": "IBOV",
          "rank": 39
        },
        {
          "symbol": "BPAC11",
          "name": "BCO BTG PACTUAL S.A.",
          "sector": "Finance",
          "m1": -19.625585023400927,
          "m3": -9.295774647887312,
          "score": 48,
          "benchmark": "IBOV",
          "rank": 40
        },
        {
          "symbol": "ENGI11",
          "name": "ENERGISA S.A.",
          "sector": "Utilities",
          "m1": -16.386633943741735,
          "m3": -11.082112025697654,
          "score": 47,
          "benchmark": "IBOV",
          "rank": 41
        },
        {
          "symbol": "PSSA3",
          "name": "PORTO SEGURO S.A.",
          "sector": "Finance",
          "m1": -5.371114400507504,
          "m3": -18.190127970749547,
          "score": 45,
          "benchmark": "IBOV",
          "rank": 42
        },
        {
          "symbol": "MULT3",
          "name": "MULTIPLAN - EMPREEND IMOBILIARIOS S.A.",
          "sector": "Finance",
          "m1": -20.58638083228247,
          "m3": -10.451475293281188,
          "score": 44,
          "benchmark": "IBOV",
          "rank": 43
        },
        {
          "symbol": "BRAP4",
          "name": "BRADESPAR S.A.",
          "sector": "Finance",
          "m1": -9.688581314878897,
          "m3": -16.954545454545457,
          "score": 43,
          "benchmark": "IBOV",
          "rank": 44
        },
        {
          "symbol": "AZZA3",
          "name": "AZZAS 2154 S.A.",
          "sector": "Consumer Non-Durables",
          "m1": -17.54890678941311,
          "m3": -12.728380024360542,
          "score": 41,
          "benchmark": "IBOV",
          "rank": 45
        },
        {
          "symbol": "ASAI3",
          "name": "SENDAS DISTRIBUIDORA S.A.",
          "sector": "Retail Trade",
          "m1": -27.90484903934126,
          "m3": -7.294117647058829,
          "score": 40,
          "benchmark": "IBOV",
          "rank": 46
        },
        {
          "symbol": "IGTI11",
          "name": "IGUATEMI S.A.",
          "sector": "Finance",
          "m1": -19.356032568467807,
          "m3": -12.24325412807088,
          "score": 39,
          "benchmark": "IBOV",
          "rank": 47
        },
        {
          "symbol": "ALOS3",
          "name": "ALLOS S.A",
          "sector": "Finance",
          "m1": -20.31197015937606,
          "m3": -13.252122554448132,
          "score": 37,
          "benchmark": "IBOV",
          "rank": 48
        },
        {
          "symbol": "VALE3",
          "name": "VALE S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -11.285939064511508,
          "m3": -18.694284216046142,
          "score": 36,
          "benchmark": "IBOV",
          "rank": 49
        },
        {
          "symbol": "SANB11",
          "name": "BCO SANTANDER (BRASIL) S.A.",
          "sector": "Finance",
          "m1": -16.730434782608693,
          "m3": -16.35220125786163,
          "score": 35,
          "benchmark": "IBOV",
          "rank": 50
        },
        {
          "symbol": "EQTL3",
          "name": "EQUATORIAL S.A.",
          "sector": "Utilities",
          "m1": -19.80319803198032,
          "m3": -15.675116399379196,
          "score": 33,
          "benchmark": "IBOV",
          "rank": 51
        },
        {
          "symbol": "RADL3",
          "name": "RAIA DROGASIL S.A.",
          "sector": "Retail Trade",
          "m1": -17.147523135547093,
          "m3": -17.640692640692635,
          "score": 32,
          "benchmark": "IBOV",
          "rank": 52
        },
        {
          "symbol": "SMFT3",
          "name": "SMARTFIT ESCOLA DE GINÁSTICA E DANÇA S.A.",
          "sector": "Consumer Services",
          "m1": -11.617312072892938,
          "m3": -21.21827411167513,
          "score": 31,
          "benchmark": "IBOV",
          "rank": 53
        },
        {
          "symbol": "MRVE3",
          "name": "MRV ENGENHARIA E PARTICIPACOES S.A.",
          "sector": "Consumer Durables",
          "m1": -25.959780621572214,
          "m3": -14.556962025316466,
          "score": 29,
          "benchmark": "IBOV",
          "rank": 54
        },
        {
          "symbol": "VBBR3",
          "name": "VIBRA ENERGIA S.A.",
          "sector": "Retail Trade",
          "m1": -20.344456404736267,
          "m3": -17.89181692094313,
          "score": 28,
          "benchmark": "IBOV",
          "rank": 55
        },
        {
          "symbol": "B3SA3",
          "name": "B3 S.A. - BRASIL. BOLSA. BALCÃO",
          "sector": "Finance",
          "m1": -26.772082878953107,
          "m3": -14.621741894469176,
          "score": 27,
          "benchmark": "IBOV",
          "rank": 56
        },
        {
          "symbol": "BBDC3",
          "name": "BCO BRADESCO S.A.",
          "sector": "Finance",
          "m1": -21.63995067817508,
          "m3": -20.512820512820507,
          "score": 25,
          "benchmark": "IBOV",
          "rank": 57
        },
        {
          "symbol": "CSMG3",
          "name": "CIA SANEAMENTO DE MINAS GERAIS-COPASA MG",
          "sector": "Utilities",
          "m1": -14.562244716746587,
          "m3": -25.027271310581266,
          "score": 24,
          "benchmark": "IBOV",
          "rank": 58
        },
        {
          "symbol": "VIVA3",
          "name": "VIVARA PARTICIPAÇOES S.A",
          "sector": "Consumer Durables",
          "m1": -26.694915254237294,
          "m3": -22.00180342651037,
          "score": 23,
          "benchmark": "IBOV",
          "rank": 59
        },
        {
          "symbol": "POMO4",
          "name": "MARCOPOLO S.A.",
          "sector": "Producer Manufacturing",
          "m1": -11.483253588516739,
          "m3": -30.320150659133706,
          "score": 21,
          "benchmark": "IBOV",
          "rank": 60
        },
        {
          "symbol": "CSNA3",
          "name": "CIA SIDERURGICA NACIONAL",
          "sector": "Non-Energy Minerals",
          "m1": -32.755632582322356,
          "m3": -19.834710743801654,
          "score": 20,
          "benchmark": "IBOV",
          "rank": 61
        },
        {
          "symbol": "BBAS3",
          "name": "BCO BRASIL S.A.",
          "sector": "Finance",
          "m1": -28.608582574772434,
          "m3": -22.857142857142865,
          "score": 19,
          "benchmark": "IBOV",
          "rank": 62
        },
        {
          "symbol": "BBDC4",
          "name": "BCO BRADESCO S.A.",
          "sector": "Finance",
          "m1": -25.12155591572124,
          "m3": -24.796527400976675,
          "score": 17,
          "benchmark": "IBOV",
          "rank": 63
        },
        {
          "symbol": "DIRR3",
          "name": "DIRECIONAL ENGENHARIA S.A.",
          "sector": "Finance",
          "m1": -20.276953511374863,
          "m3": -28.986784140969156,
          "score": 16,
          "benchmark": "IBOV",
          "rank": 64
        },
        {
          "symbol": "CYRE3",
          "name": "CYRELA BRAZIL REALTY S.A.EMPREEND E PART",
          "sector": "Finance",
          "m1": -37.122884473877846,
          "m3": -20.0280767430978,
          "score": 15,
          "benchmark": "IBOV",
          "rank": 65
        },
        {
          "symbol": "RENT3",
          "name": "LOCALIZA RENT A CAR S.A.",
          "sector": "Finance",
          "m1": -31.234567901234566,
          "m3": -25.950545067801112,
          "score": 13,
          "benchmark": "IBOV",
          "rank": 66
        },
        {
          "symbol": "LREN3",
          "name": "LOJAS RENNER S.A.",
          "sector": "Retail Trade",
          "m1": -22.58620689655172,
          "m3": -33.97058823529411,
          "score": 12,
          "benchmark": "IBOV",
          "rank": 67
        },
        {
          "symbol": "USIM5",
          "name": "USINAS SID DE MINAS GERAIS S.A.-USIMINAS",
          "sector": "Non-Energy Minerals",
          "m1": -28.673323823109843,
          "m3": -32.065217391304344,
          "score": 11,
          "benchmark": "IBOV",
          "rank": 68
        },
        {
          "symbol": "COGN3",
          "name": "COGNA EDUCAÇÃO S.A.",
          "sector": "Commercial Services",
          "m1": -31.89655172413792,
          "m3": -30.701754385964907,
          "score": 9,
          "benchmark": "IBOV",
          "rank": 69
        },
        {
          "symbol": "TEND3",
          "name": "CONSTRUTORA TENDA S.A.",
          "sector": "Finance",
          "m1": -25.9163272861903,
          "m3": -34.02571711177052,
          "score": 8,
          "benchmark": "IBOV",
          "rank": 70
        },
        {
          "symbol": "CEAB3",
          "name": "CEA MODAS S.A.",
          "sector": "Retail Trade",
          "m1": -34.695912263210374,
          "m3": -30.614406779661017,
          "score": 7,
          "benchmark": "IBOV",
          "rank": 71
        },
        {
          "symbol": "BEEF3",
          "name": "MINERVA S.A.",
          "sector": "Distribution Services",
          "m1": -35.27918781725889,
          "m3": -30.327868852459027,
          "score": 5,
          "benchmark": "IBOV",
          "rank": 72
        },
        {
          "symbol": "VAMO3",
          "name": "VAMOS LOCAÇÃO DE CAMINHÕES. MÁQUINAS E EQUIP. S.A.",
          "sector": "Finance",
          "m1": -44.651162790697676,
          "m3": -28.742514970059887,
          "score": 4,
          "benchmark": "IBOV",
          "rank": 73
        },
        {
          "symbol": "NATU3",
          "name": "NATURA COSMETICOS S.A.",
          "sector": "Consumer Non-Durables",
          "m1": -27.999999999999993,
          "m3": -42.00477326968974,
          "score": 3,
          "benchmark": "IBOV",
          "rank": 74
        },
        {
          "symbol": "CSAN3",
          "name": "COSAN S.A.",
          "sector": "Utilities",
          "m1": -41.16161616161615,
          "m3": -42.75184275184275,
          "score": 1,
          "benchmark": "IBOV",
          "rank": 75
        },
        {
          "symbol": "HAPV3",
          "name": "HAPVIDA PARTICIPACOES E INVESTIMENTOS SA",
          "sector": "Health Services",
          "m1": -37.031484257871064,
          "m3": -62.76595744680851,
          "score": 0,
          "benchmark": "IBOV",
          "rank": 76
        }
      ]
    },
    "stock_other": {
      "key": "stock_other",
      "label": "Demais ações",
      "benchmark": "SMLL + B3",
      "items": [
        {
          "symbol": "RCSL3",
          "name": "RECRUSUL S.A.",
          "sector": "Producer Manufacturing",
          "m1": 240,
          "m3": 269.5652173913043,
          "score": 100,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 1
        },
        {
          "symbol": "AZEV3",
          "name": "AZEVEDO E TRAVASSOS S.A.",
          "sector": "Industrial Services",
          "m1": 49.05660377358492,
          "m3": 128.2222222222222,
          "score": 99,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 2
        },
        {
          "symbol": "VIVR3",
          "name": "VIVER INCORPORADORA E CONSTRUTORA S.A.",
          "sector": "Consumer Durables",
          "m1": 100.64102564102564,
          "m3": 87.42514970059881,
          "score": 99,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 3
        },
        {
          "symbol": "RAPT3",
          "name": "RANDONCORP S.A.",
          "sector": "Producer Manufacturing",
          "m1": -8.711217183770891,
          "m3": 61.392405063291136,
          "score": 98,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 4
        },
        {
          "symbol": "RCSL4",
          "name": "RECRUSUL S.A.",
          "sector": "Producer Manufacturing",
          "m1": 106.89655172413795,
          "m3": -17.808219178082197,
          "score": 98,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 5
        },
        {
          "symbol": "TPIS3",
          "name": "TPI - TRIUNFO PARTICIP. E INVEST. S.A.",
          "sector": "Transportation",
          "m1": -1.5932521087160256,
          "m3": 26.506024096385538,
          "score": 97,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 6
        },
        {
          "symbol": "ONCO3",
          "name": "ONCOCLINICAS DO BRASIL SERVICOS MEDICOS  S.A.",
          "sector": "Health Services",
          "m1": -24.752475247524753,
          "m3": 38.18181818181816,
          "score": 97,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 7
        },
        {
          "symbol": "CLSC4",
          "name": "CENTRAIS ELET DE SANTA CATARINA S.A.",
          "sector": "Utilities",
          "m1": 4.357338195077487,
          "m3": 21.0745258407953,
          "score": 96,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 8
        },
        {
          "symbol": "SMTO3",
          "name": "SAO MARTINHO S.A.",
          "sector": "Process Industries",
          "m1": 18.74999999999998,
          "m3": 45.24793388429753,
          "score": 96,
          "benchmark": "SMLL",
          "rank": 9
        },
        {
          "symbol": "HAGA4",
          "name": "HAGA S.A. INDUSTRIA E COMERCIO",
          "sector": "Consumer Durables",
          "m1": 2.3255813953488413,
          "m3": 14.28571428571428,
          "score": 95,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 10
        },
        {
          "symbol": "WEST3",
          "name": "WESTWING COMERCIO VAREJISTA S.A.",
          "sector": "Retail Trade",
          "m1": 7.051282051282048,
          "m3": 10.231023102310232,
          "score": 95,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 11
        },
        {
          "symbol": "RAIZ4",
          "name": "RAIZEN S.A.",
          "sector": "Retail Trade",
          "m1": -3.2258064516129115,
          "m3": 15.384615384615374,
          "score": 94,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 12
        },
        {
          "symbol": "MEAL3",
          "name": "INTERNATIONAL MEAL COMPANY ALIMENTACAO S.A.",
          "sector": "Consumer Services",
          "m1": -21.649484536082475,
          "m3": 24.590163934426236,
          "score": 94,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 13
        },
        {
          "symbol": "ALPA3",
          "name": "ALPARGATAS S.A.",
          "sector": "Consumer Non-Durables",
          "m1": 0.09794319294809117,
          "m3": 12.307692307692308,
          "score": 93,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 14
        },
        {
          "symbol": "DOTZ3",
          "name": "DOTZ S.A.",
          "sector": "Technology Services",
          "m1": -31.744518589132507,
          "m3": 28.31541218637994,
          "score": 93,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 15
        },
        {
          "symbol": "ALLD3",
          "name": "ALLIED TECNOLOGIA S.A.",
          "sector": "Technology Services",
          "m1": -3.195488721804507,
          "m3": 12.445414847161572,
          "score": 92,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 16
        },
        {
          "symbol": "ISAE3",
          "name": "ISA ENERGIA BRASIL S.A",
          "sector": "Utilities",
          "m1": 0.9096244131455489,
          "m3": 9.696969696969692,
          "score": 92,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 17
        },
        {
          "symbol": "BEES3",
          "name": "BANESTES S.A. - BCO EST ESPIRITO SANTO",
          "sector": "Finance",
          "m1": 0.4381161007666945,
          "m3": 4.919908466819223,
          "score": 91,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 18
        },
        {
          "symbol": "RNEW3",
          "name": "RENOVA ENERGIA S.A.",
          "sector": "Utilities",
          "m1": 4.999999999999982,
          "m3": 2.4390243902439046,
          "score": 91,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 19
        },
        {
          "symbol": "NUTR3",
          "name": "NUTRIPLANT INDUSTRIA E COMERCIO S.A.",
          "sector": "Process Industries",
          "m1": -8.171206225680939,
          "m3": 6.7873303167420795,
          "score": 90,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 20
        },
        {
          "symbol": "GGBR3",
          "name": "GERDAU S.A.",
          "sector": "Non-Energy Minerals",
          "m1": 4.069767441860472,
          "m3": -0.04653327128896212,
          "score": 90,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 21
        },
        {
          "symbol": "OBTC3",
          "name": "ORANJEBTC S.A. - EDUCAÇÃO E INVESTIMENTO",
          "sector": "Technology Services",
          "m1": -10.399999999999999,
          "m3": 7.519999999999993,
          "score": 89,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 22
        },
        {
          "symbol": "LAND3",
          "name": "TERRA SANTA PROPRIEDADES AGRICOLAS S.A.",
          "sector": "Finance",
          "m1": 0.43478260869567187,
          "m3": 1.4270032930845389,
          "score": 89,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 23
        },
        {
          "symbol": "GOAU3",
          "name": "METALURGICA GERDAU S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -0.20263424518742745,
          "m3": 0.5102040816326481,
          "score": 88,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 24
        },
        {
          "symbol": "FIQE3",
          "name": "UNIFIQUE TELECOMUNICAÇÕES S.A.",
          "sector": "Communications",
          "m1": 4.761904761904767,
          "m3": -2.2222222222222254,
          "score": 88,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 25
        },
        {
          "symbol": "CMIG3",
          "name": "CIA ENERGETICA DE MINAS GERAIS - CEMIG",
          "sector": "Utilities",
          "m1": -0.9632751354605618,
          "m3": 0.6731946144430845,
          "score": 87,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 26
        },
        {
          "symbol": "RNEW4",
          "name": "RENOVA ENERGIA S.A.",
          "sector": "Utilities",
          "m1": 2.564102564102577,
          "m3": -1.2345679012345734,
          "score": 87,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 27
        },
        {
          "symbol": "MLAS3",
          "name": "GRUPO MULTI S.A.",
          "sector": "Electronic Technology",
          "m1": -4.255319148936165,
          "m3": 1.6949152542372836,
          "score": 86,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 28
        },
        {
          "symbol": "WDCN3",
          "name": "WDC NETWORKS (LIVETECH DA BAHIA S.A.)",
          "sector": "Distribution Services",
          "m1": -15.986394557823125,
          "m3": 7.391304347826111,
          "score": 86,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 29
        },
        {
          "symbol": "BEES4",
          "name": "BANESTES S.A. - BCO EST ESPIRITO SANTO",
          "sector": "Finance",
          "m1": -2.4598930481283476,
          "m3": -0.2188183807440014,
          "score": 85,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 30
        },
        {
          "symbol": "AMAR3",
          "name": "MARISA LOJAS S.A.",
          "sector": "Retail Trade",
          "m1": -23.17073170731707,
          "m3": 10.526315789473696,
          "score": 85,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 31
        },
        {
          "symbol": "BAZA3",
          "name": "BCO AMAZONIA S.A.",
          "sector": "Finance",
          "m1": -7.769929364278516,
          "m3": 1.571678044133984,
          "score": 84,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 32
        },
        {
          "symbol": "JALL3",
          "name": "JALLES MACHADO S.A.",
          "sector": "Process Industries",
          "m1": -10.593220338983055,
          "m3": 2.9268292682926855,
          "score": 84,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 33
        },
        {
          "symbol": "CEBR3",
          "name": "CIA ENERGETICA DE BRASILIA",
          "sector": "Utilities",
          "m1": -1.2847965738758016,
          "m3": -2.6193493874102303,
          "score": 83,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 34
        },
        {
          "symbol": "TAEE4",
          "name": "TRANSMISSORA ALIANÇA DE ENERGIA ELÉTRICA S.A.",
          "sector": "Industrial Services",
          "m1": -4.522613065326631,
          "m3": -0.9679821295606739,
          "score": 83,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 35
        },
        {
          "symbol": "BLAU3",
          "name": "BLAU FARMACÊUTICA S.A.",
          "sector": "Health Technology",
          "m1": -15.779645191409909,
          "m3": 4.883720930232549,
          "score": 82,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 36
        },
        {
          "symbol": "ALUP4",
          "name": "ALUPAR INVESTIMENTO S/A",
          "sector": "Utilities",
          "m1": -2.3809523809523836,
          "m3": -2.6590693257359854,
          "score": 82,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 37
        },
        {
          "symbol": "DEXP3",
          "name": "DEXXOS PARTICIPACOES S.A.",
          "sector": "Process Industries",
          "m1": -4.177897574123978,
          "m3": -1.93103448275862,
          "score": 81,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 38
        },
        {
          "symbol": "SLCE3",
          "name": "SLC AGRICOLA S.A.",
          "sector": "Process Industries",
          "m1": 1.2492563950029734,
          "m3": 27.2047832585949,
          "score": 81,
          "benchmark": "SMLL",
          "rank": 39
        },
        {
          "symbol": "TAEE3",
          "name": "TRANSMISSORA ALIANÇA DE ENERGIA ELÉTRICA S.A.",
          "sector": "Industrial Services",
          "m1": -5.8394160583941535,
          "m3": -2.1986353297952954,
          "score": 80,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 40
        },
        {
          "symbol": "CEBR5",
          "name": "CIA ENERGETICA DE BRASILIA",
          "sector": "Utilities",
          "m1": -2.355460385438979,
          "m3": -4.080774084981065,
          "score": 80,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 41
        },
        {
          "symbol": "BPAC3",
          "name": "BCO BTG PACTUAL S.A.",
          "sector": "Finance",
          "m1": -10.524193548387096,
          "m3": 0.31645569620253333,
          "score": 79,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 42
        },
        {
          "symbol": "BMEB3",
          "name": "BCO MERCANTIL DO BRASIL S.A.",
          "sector": "Finance",
          "m1": -3.0425963488843855,
          "m3": -3.822937625754541,
          "score": 79,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 43
        },
        {
          "symbol": "BMEB4",
          "name": "BCO MERCANTIL DO BRASIL S.A.",
          "sector": "Finance",
          "m1": -5.465213746856657,
          "m3": -2.607944732297063,
          "score": 78,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 44
        },
        {
          "symbol": "CEBR6",
          "name": "CIA ENERGETICA DE BRASILIA",
          "sector": "Utilities",
          "m1": -2.754621239579569,
          "m3": -4.1785714285714315,
          "score": 78,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 45
        },
        {
          "symbol": "KLBN3",
          "name": "KLABIN S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -5.066666666666664,
          "m3": -2.997275204359673,
          "score": 77,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 46
        },
        {
          "symbol": "MNPR3",
          "name": "MINUPAR PARTICIPACOES S.A.",
          "sector": "Process Industries",
          "m1": 0.27173913043476716,
          "m3": -6.345177664974622,
          "score": 77,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 47
        },
        {
          "symbol": "EALT4",
          "name": "ELECTRO ACO ALTONA S.A.",
          "sector": "Producer Manufacturing",
          "m1": -6.073943661971826,
          "m3": -4.046762589928054,
          "score": 76,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 48
        },
        {
          "symbol": "PFRM3",
          "name": "PROFARMA DISTRIB PROD FARMACEUTICOS S.A.",
          "sector": "Distribution Services",
          "m1": -9.176788124156543,
          "m3": -2.7456647398843903,
          "score": 76,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 49
        },
        {
          "symbol": "IGTI3",
          "name": "IGUATEMI S.A.",
          "sector": "Finance",
          "m1": -9.14634146341463,
          "m3": -3.2467532467532534,
          "score": 75,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 50
        },
        {
          "symbol": "ALUP3",
          "name": "ALUPAR INVESTIMENTO S/A",
          "sector": "Utilities",
          "m1": -5.3043478260869525,
          "m3": -5.550737207285328,
          "score": 75,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 51
        },
        {
          "symbol": "SAUD3",
          "name": "BRADSAÚDE S.A.",
          "sector": "Health Services",
          "m1": 5.617977528089879,
          "m3": -11.432160804020096,
          "score": 74,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 52
        },
        {
          "symbol": "BPAC5",
          "name": "BCO BTG PACTUAL S.A.",
          "sector": "Finance",
          "m1": -15.295815295815295,
          "m3": -0.6207674943566555,
          "score": 74,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 53
        },
        {
          "symbol": "CSUD3",
          "name": "CSU DIGITAL S.A.",
          "sector": "Commercial Services",
          "m1": -10.83009079118028,
          "m3": -3.169014084507038,
          "score": 73,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 54
        },
        {
          "symbol": "MTRE3",
          "name": "MITRE REALTY EMPREENDIMENTOS E PARTICIPAÇÕES S.A.",
          "sector": "Finance",
          "m1": -16.279069767441868,
          "m3": -0.34602076124568004,
          "score": 73,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 55
        },
        {
          "symbol": "KLBN4",
          "name": "KLABIN S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -5.277777777777781,
          "m3": -6.318681318681318,
          "score": 72,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 56
        },
        {
          "symbol": "AGRO3",
          "name": "BRASILAGRO - CIA BRAS DE PROP AGRICOLAS",
          "sector": "Finance",
          "m1": -1.3112884834663663,
          "m3": -9.086134453781513,
          "score": 72,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 57
        },
        {
          "symbol": "CSED3",
          "name": "CRUZEIRO DO SUL EDUCACIONAL S.A.",
          "sector": "Consumer Services",
          "m1": -15.749525616698278,
          "m3": -1.3333333333333197,
          "score": 71,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 58
        },
        {
          "symbol": "EQPA3",
          "name": "EQUATORIAL PARA DISTRIBUIDORA DE ENERGIA S.A.",
          "sector": "Utilities",
          "m1": -9.335727109515268,
          "m3": -4.896421845574384,
          "score": 71,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 59
        },
        {
          "symbol": "CGRA4",
          "name": "GRAZZIOTIN S.A.",
          "sector": "Retail Trade",
          "m1": -3.4110535405872167,
          "m3": -8.432255423659429,
          "score": 70,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 60
        },
        {
          "symbol": "OFSA3",
          "name": "OUROFINO S.A.",
          "sector": "Health Technology",
          "m1": -3.844660194174754,
          "m3": -8.29629629629629,
          "score": 70,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 61
        },
        {
          "symbol": "BRSR3",
          "name": "BCO ESTADO DO RIO GRANDE DO SUL S.A.",
          "sector": "Finance",
          "m1": -9.546925566343045,
          "m3": -5.307735742518361,
          "score": 69,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 62
        },
        {
          "symbol": "BIOM3",
          "name": "BIOMM S.A.",
          "sector": "Health Technology",
          "m1": -13.114754098360649,
          "m3": -3.8112522686025385,
          "score": 69,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 63
        },
        {
          "symbol": "BRAP3",
          "name": "BRADESPAR S.A.",
          "sector": "Finance",
          "m1": -5.116796440489447,
          "m3": -8.279569892473138,
          "score": 68,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 64
        },
        {
          "symbol": "BMKS3",
          "name": "BICICLETAS MONARK S.A.",
          "sector": "Consumer Durables",
          "m1": -7.4074074074074066,
          "m3": -7.213488507727783,
          "score": 68,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 65
        },
        {
          "symbol": "TRIS3",
          "name": "TRISUL S.A.",
          "sector": "Consumer Durables",
          "m1": -16.96606786427145,
          "m3": -2.3474178403755763,
          "score": 67,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 66
        },
        {
          "symbol": "ITUB3",
          "name": "ITAU UNIBANCO HOLDING S.A.",
          "sector": "Finance",
          "m1": -11.161543222611915,
          "m3": -5.652936021034172,
          "score": 67,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 67
        },
        {
          "symbol": "SHUL4",
          "name": "SCHULZ S.A.",
          "sector": "Producer Manufacturing",
          "m1": -7.847533632286985,
          "m3": -8.25892857142857,
          "score": 66,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 68
        },
        {
          "symbol": "ITSA3",
          "name": "ITAUSA S.A.",
          "sector": "Finance",
          "m1": -12.457684495599185,
          "m3": -7.1120689655172376,
          "score": 66,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 69
        },
        {
          "symbol": "ENGI3",
          "name": "ENERGISA S.A.",
          "sector": "Utilities",
          "m1": -12.329863891112902,
          "m3": -7.828282828282839,
          "score": 65,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 70
        },
        {
          "symbol": "IFCM3",
          "name": "INFRACOMMERCE CXAAS S.A.",
          "sector": "Distribution Services",
          "m1": -3.8461538461538547,
          "m3": -12.587412587412583,
          "score": 65,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 71
        },
        {
          "symbol": "BMGB4",
          "name": "BANCO BMG S.A.",
          "sector": "Finance",
          "m1": -19.905956112852664,
          "m3": -3.9473684210526327,
          "score": 64,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 72
        },
        {
          "symbol": "AXIA7",
          "name": "AXIA ENERGIA S.A.",
          "sector": "Utilities",
          "m1": -13.303167420814477,
          "m3": -7.902326475677757,
          "score": 64,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 73
        },
        {
          "symbol": "ROMI3",
          "name": "ROMI S.A.",
          "sector": "Producer Manufacturing",
          "m1": -10.588235294117643,
          "m3": -9.369676320272568,
          "score": 63,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 74
        },
        {
          "symbol": "PTBL3",
          "name": "PBG S/A",
          "sector": "Producer Manufacturing",
          "m1": -15.675675675675683,
          "m3": -7.14285714285714,
          "score": 63,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 75
        },
        {
          "symbol": "ENJU3",
          "name": "ENJOEI S.A.",
          "sector": "Retail Trade",
          "m1": -11.830985915492953,
          "m3": -10.571428571428577,
          "score": 62,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 76
        },
        {
          "symbol": "TGMA3",
          "name": "TEGMA GESTAO LOGISTICA S.A.",
          "sector": "Transportation",
          "m1": -4.50689289501589,
          "m3": 18.29228243021348,
          "score": 62,
          "benchmark": "SMLL",
          "rank": 77
        },
        {
          "symbol": "MATD3",
          "name": "HOSPITAL MATER DEI S/A",
          "sector": "Health Services",
          "m1": -14.03162055335968,
          "m3": -10.123966942148765,
          "score": 61,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 78
        },
        {
          "symbol": "PDTC3",
          "name": "PADTEC HOLDING S.A.",
          "sector": "Electronic Technology",
          "m1": 0,
          "m3": -18.324607329842923,
          "score": 61,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 79
        },
        {
          "symbol": "AERI3",
          "name": "AERIS IND. E COM. DE EQUIP. GERACAO DE ENERGIA S/A",
          "sector": "Producer Manufacturing",
          "m1": -12.442396313364057,
          "m3": -11.627906976744185,
          "score": 60,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 80
        },
        {
          "symbol": "WHRL4",
          "name": "WHIRLPOOL S.A.",
          "sector": "Consumer Durables",
          "m1": -6.111111111111112,
          "m3": -15.500000000000004,
          "score": 60,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 81
        },
        {
          "symbol": "SAPR4",
          "name": "CIA SANEAMENTO DO PARANA - SANEPAR",
          "sector": "Utilities",
          "m1": -7.515337423312873,
          "m3": -15.189873417721522,
          "score": 59,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 82
        },
        {
          "symbol": "VSTE3",
          "name": "VESTE S.A. ESTILO",
          "sector": "Consumer Non-Durables",
          "m1": -10.1123595505618,
          "m3": -14.590747330960863,
          "score": 59,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 83
        },
        {
          "symbol": "TASA3",
          "name": "TAURUS ARMAS S.A.",
          "sector": "Electronic Technology",
          "m1": -38.01452784503632,
          "m3": 0.39215686274509665,
          "score": 58,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 84
        },
        {
          "symbol": "UNIP3",
          "name": "UNIPAR CARBOCLORO S.A.",
          "sector": "Process Industries",
          "m1": -8.792411528639189,
          "m3": -15.426251691474956,
          "score": 58,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 85
        },
        {
          "symbol": "EPAR3",
          "name": "EMBPAR PARTICIPACOES S.A.",
          "sector": "Producer Manufacturing",
          "m1": -9.677419354838701,
          "m3": -15.151515151515149,
          "score": 57,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 86
        },
        {
          "symbol": "UCAS3",
          "name": "UNICASA INDÚSTRIA DE MÓVEIS S.A.",
          "sector": "Consumer Durables",
          "m1": -12.612612612612628,
          "m3": -14.15929203539823,
          "score": 57,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 87
        },
        {
          "symbol": "ENGI4",
          "name": "ENERGISA S.A.",
          "sector": "Utilities",
          "m1": -17.716535433070867,
          "m3": -11.534391534391531,
          "score": 56,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 88
        },
        {
          "symbol": "BRST3",
          "name": "BRISANET SERVIÇOS DE TELECOMUNICAÇÕES S.A.",
          "sector": "Communications",
          "m1": -16.666666666666664,
          "m3": -13.043478260869556,
          "score": 56,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 89
        },
        {
          "symbol": "VITT3",
          "name": "VITTIA S.A.",
          "sector": "Process Industries",
          "m1": -15.309446254071657,
          "m3": -14.191419141914185,
          "score": 55,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 90
        },
        {
          "symbol": "SAPR3",
          "name": "CIA SANEAMENTO DO PARANA - SANEPAR",
          "sector": "Utilities",
          "m1": -7.801418439716312,
          "m3": -19.254658385093173,
          "score": 55,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 91
        },
        {
          "symbol": "SCAR3",
          "name": "SAO CARLOS EMPREEND E PARTICIPACOES S.A.",
          "sector": "Finance",
          "m1": -11.674718196457324,
          "m3": -17.704426106526626,
          "score": 54,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 92
        },
        {
          "symbol": "SANB4",
          "name": "BCO SANTANDER (BRASIL) S.A.",
          "sector": "Finance",
          "m1": -16.187806587245966,
          "m3": -15.417256011315416,
          "score": 54,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 93
        },
        {
          "symbol": "TASA4",
          "name": "TAURUS ARMAS S.A.",
          "sector": "Electronic Technology",
          "m1": -42.2195416164053,
          "m3": -1.8442622950819665,
          "score": 53,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 94
        },
        {
          "symbol": "GFSA3",
          "name": "GAFISA S.A.",
          "sector": "Finance",
          "m1": -12,
          "m3": -18.518518518518523,
          "score": 53,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 95
        },
        {
          "symbol": "LOGN3",
          "name": "LOG-IN LOGISTICA INTERMODAL S.A.",
          "sector": "Transportation",
          "m1": -16.428571428571438,
          "m3": -17.16814159292036,
          "score": 52,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 96
        },
        {
          "symbol": "SANB3",
          "name": "BCO SANTANDER (BRASIL) S.A.",
          "sector": "Finance",
          "m1": -16.736111111111107,
          "m3": -17.02422145328719,
          "score": 52,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 97
        },
        {
          "symbol": "EUCA4",
          "name": "EUCATEX S.A. INDUSTRIA E COMERCIO",
          "sector": "Non-Energy Minerals",
          "m1": -16.217430368373776,
          "m3": -18.91304347826087,
          "score": 51,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 98
        },
        {
          "symbol": "RECV3",
          "name": "PETRORECÔNCAVO S.A.",
          "sector": "Energy Minerals",
          "m1": 3.373945641986875,
          "m3": 3.373945641986875,
          "score": 51,
          "benchmark": "SMLL",
          "rank": 99
        },
        {
          "symbol": "DESK3",
          "name": "DESKTOP S.A.",
          "sector": "Communications",
          "m1": 0.05141388174807471,
          "m3": 4.623655913978486,
          "score": 50,
          "benchmark": "SMLL",
          "rank": 100
        },
        {
          "symbol": "COCE5",
          "name": "CIA ENERGETICA DO CEARA - COELCE",
          "sector": "Utilities",
          "m1": -12.488114104595882,
          "m3": -23.26292384658143,
          "score": 49,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 101
        },
        {
          "symbol": "CAMB3",
          "name": "CAMBUCI S.A.",
          "sector": "Consumer Non-Durables",
          "m1": -10.11523687580026,
          "m3": -24.75884244372991,
          "score": 49,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 102
        },
        {
          "symbol": "AUAU3",
          "name": "UNIÃO PET PARTICIPAÇÕES S.A.",
          "sector": "Process Industries",
          "m1": -13.151927437641719,
          "m3": 9.742120343839545,
          "score": 48,
          "benchmark": "SMLL",
          "rank": 103
        },
        {
          "symbol": "TCSA3",
          "name": "TECNISA S.A.",
          "sector": "Finance",
          "m1": -9.523809523809534,
          "m3": -25.974025974025984,
          "score": 48,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 104
        },
        {
          "symbol": "CBAV3",
          "name": "COMPANHIA BRASILEIRA DE ALUMÍNIO",
          "sector": "Non-Energy Minerals",
          "m1": 0.3561887800534125,
          "m3": 1.7148014440433235,
          "score": 47,
          "benchmark": "SMLL",
          "rank": 105
        },
        {
          "symbol": "PASS3",
          "name": "COMPASS GAS E ENERGIA S.A.",
          "sector": "Utilities",
          "m1": -16.2008733624454,
          "m3": -22.745571658615127,
          "score": 47,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 106
        },
        {
          "symbol": "BSLI3",
          "name": "BRB BCO DE BRASILIA S.A.",
          "sector": "Finance",
          "m1": -0.990099009900991,
          "m3": -32.20338983050848,
          "score": 46,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 107
        },
        {
          "symbol": "DASA3",
          "name": "DIAGNOSTICOS DA AMERICA S.A.",
          "sector": "Health Services",
          "m1": -25.87064676616915,
          "m3": 14.176245210727977,
          "score": 46,
          "benchmark": "SMLL",
          "rank": 108
        },
        {
          "symbol": "HBRE3",
          "name": "HBR REALTY EMPREENDIMENTOS IMOBILIARIOS S/A",
          "sector": "Finance",
          "m1": -34.572490706319705,
          "m3": -15.384615384615385,
          "score": 45,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 109
        },
        {
          "symbol": "VVEO3",
          "name": "CM HOSPITALAR S.A.",
          "sector": "Distribution Services",
          "m1": -29.11392405063291,
          "m3": -18.84057971014491,
          "score": 45,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 110
        },
        {
          "symbol": "MELK3",
          "name": "MELNICK DESENVOLVIMENTO IMOBILIÁRIO S.A.",
          "sector": "Industrial Services",
          "m1": -25.816993464052285,
          "m3": -20.90592334494774,
          "score": 44,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 111
        },
        {
          "symbol": "MILS3",
          "name": "MILLS LOCAÇÃO. SERVIÇOS E LOGÍSTICA S.A",
          "sector": "Finance",
          "m1": -2.012578616352201,
          "m3": -1.07936507936508,
          "score": 44,
          "benchmark": "SMLL",
          "rank": 112
        },
        {
          "symbol": "AALR3",
          "name": "ALLIANÇA SAÚDE E PARTICIPAÇÕES S.A.",
          "sector": "Health Services",
          "m1": -24.390243902439025,
          "m3": -23.69230769230769,
          "score": 43,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 113
        },
        {
          "symbol": "KEPL3",
          "name": "KEPLER WEBER S.A.",
          "sector": "Producer Manufacturing",
          "m1": -3.686635944700467,
          "m3": -1.7241379310344862,
          "score": 43,
          "benchmark": "SMLL",
          "rank": 114
        },
        {
          "symbol": "BSLI4",
          "name": "BRB BCO DE BRASILIA S.A.",
          "sector": "Finance",
          "m1": -12.49999999999999,
          "m3": -30.92105263157895,
          "score": 42,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 115
        },
        {
          "symbol": "SOJA3",
          "name": "BOA SAFRA SEMENTES S.A.",
          "sector": "Process Industries",
          "m1": -22.06076618229854,
          "m3": 7.078039927404722,
          "score": 42,
          "benchmark": "SMLL",
          "rank": 116
        },
        {
          "symbol": "ALPK3",
          "name": "ALLPARK EMPREENDIMENTOS PARTICIPACOES SERVICOS S.A",
          "sector": "Consumer Services",
          "m1": -25.5079006772009,
          "m3": -24.82915717539863,
          "score": 41,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 117
        },
        {
          "symbol": "USIM3",
          "name": "USINAS SID DE MINAS GERAIS S.A.-USIMINAS",
          "sector": "Non-Energy Minerals",
          "m1": -25.076923076923073,
          "m3": -25.076923076923073,
          "score": 41,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 118
        },
        {
          "symbol": "PINE3",
          "name": "BCO PINE S.A.",
          "sector": "Finance",
          "m1": -21.378091872791515,
          "m3": -27.22812755519215,
          "score": 40,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 119
        },
        {
          "symbol": "ALUP11",
          "name": "ALUPAR INVESTIMENTO S/A",
          "sector": "Utilities",
          "m1": -3.4737165693206395,
          "m3": -3.7400367872470808,
          "score": 40,
          "benchmark": "SMLL",
          "rank": 120
        },
        {
          "symbol": "IRBR3",
          "name": "IRB - BRASIL RESSEGUROS S.A.",
          "sector": "Finance",
          "m1": -9.69834576710995,
          "m3": -0.6778451658936868,
          "score": 39,
          "benchmark": "SMLL",
          "rank": 121
        },
        {
          "symbol": "ALPA4",
          "name": "ALPARGATAS S.A.",
          "sector": "Consumer Non-Durables",
          "m1": -12.693935119887156,
          "m3": 0.8964955175224221,
          "score": 39,
          "benchmark": "SMLL",
          "rank": 122
        },
        {
          "symbol": "INTB3",
          "name": "INTELBRAS S.A. IND DE TELEC ELETRONICA BRASILEIRA",
          "sector": "Technology Services",
          "m1": -2.117148906139732,
          "m3": -5.324232081911273,
          "score": 38,
          "benchmark": "SMLL",
          "rank": 123
        },
        {
          "symbol": "TECN3",
          "name": "TECHNOS S.A.",
          "sector": "Consumer Durables",
          "m1": -30.048780487804883,
          "m3": -23.47918890074706,
          "score": 38,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 124
        },
        {
          "symbol": "PCAR3",
          "name": "CIA BRASILEIRA DE DISTRIBUICAO",
          "sector": "Retail Trade",
          "m1": -37.910447761194035,
          "m3": -19.691119691119685,
          "score": 37,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 125
        },
        {
          "symbol": "INEP3",
          "name": "INEPAR S.A. INDUSTRIA E CONSTRUCOES",
          "sector": "Producer Manufacturing",
          "m1": -13.93442622950819,
          "m3": -32.692307692307686,
          "score": 37,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 126
        },
        {
          "symbol": "ANIM3",
          "name": "ANIMA HOLDING S.A.",
          "sector": "Consumer Services",
          "m1": -23.4113712374582,
          "m3": 5.045871559633031,
          "score": 36,
          "benchmark": "SMLL",
          "rank": 127
        },
        {
          "symbol": "RANI3",
          "name": "IRANI PAPEL E EMBALAGEM S.A.",
          "sector": "Process Industries",
          "m1": -2.4421593830334265,
          "m3": -6.411837237977802,
          "score": 36,
          "benchmark": "SMLL",
          "rank": 128
        },
        {
          "symbol": "AMOB3",
          "name": "AUTOMOB PARTICIPAÇÕES S.A.",
          "sector": "Retail Trade",
          "m1": -25.00000000000001,
          "m3": -27.54716981132076,
          "score": 35,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 129
        },
        {
          "symbol": "RENT4",
          "name": "LOCALIZA RENT A CAR S.A.",
          "sector": "Finance",
          "m1": -30.250383239652535,
          "m3": -25.266903914590742,
          "score": 35,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 130
        },
        {
          "symbol": "GRND3",
          "name": "GRENDENE S.A.",
          "sector": "Consumer Non-Durables",
          "m1": -6.315789473684208,
          "m3": -5.066666666666664,
          "score": 34,
          "benchmark": "SMLL",
          "rank": 131
        },
        {
          "symbol": "ETER3",
          "name": "ETERNIT S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -24.29378531073446,
          "m3": -28.912466843501328,
          "score": 34,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 132
        },
        {
          "symbol": "CYRE4",
          "name": "CYRELA BRAZIL REALTY S.A.EMPREEND E PART",
          "sector": "Finance",
          "m1": -37.743950039032015,
          "m3": -21.698576337751607,
          "score": 33,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 133
        },
        {
          "symbol": "BRKM3",
          "name": "BRASKEM S.A.",
          "sector": "Process Industries",
          "m1": -16.161616161616166,
          "m3": -33.60000000000001,
          "score": 33,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 134
        },
        {
          "symbol": "LUPA3",
          "name": "LUPATECH S.A.",
          "sector": "Producer Manufacturing",
          "m1": -0.7999999999999896,
          "m3": -41.87499999999999,
          "score": 32,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 135
        },
        {
          "symbol": "BMOB3",
          "name": "BEMOBI MOBILE TECH S.A.",
          "sector": "Technology Services",
          "m1": -16.483126110124324,
          "m3": -1.2184873949579789,
          "score": 32,
          "benchmark": "SMLL",
          "rank": 136
        },
        {
          "symbol": "INEP4",
          "name": "INEPAR S.A. INDUSTRIA E CONSTRUCOES",
          "sector": "Producer Manufacturing",
          "m1": -17.741935483870964,
          "m3": -33.76623376623377,
          "score": 31,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 137
        },
        {
          "symbol": "WIZC3",
          "name": "WIZ CO PARTICIPAÇÕES E CORRETAGEM DE SEGUROS S.A.",
          "sector": "Finance",
          "m1": -25.50761421319797,
          "m3": -29.700598802395206,
          "score": 31,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 138
        },
        {
          "symbol": "FRAS3",
          "name": "FRASLE MOBILITY S.A.",
          "sector": "Producer Manufacturing",
          "m1": -10.752212389380533,
          "m3": -4.72366556447803,
          "score": 30,
          "benchmark": "SMLL",
          "rank": 139
        },
        {
          "symbol": "HBOR3",
          "name": "HELBOR EMPREENDIMENTOS S.A.",
          "sector": "Consumer Durables",
          "m1": -35.483870967741936,
          "m3": -25.133689839572206,
          "score": 30,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 140
        },
        {
          "symbol": "LEVE3",
          "name": "MAHLE-METAL LEVE S.A.",
          "sector": "Producer Manufacturing",
          "m1": -11.364967779730517,
          "m3": -5.081555834378914,
          "score": 29,
          "benchmark": "SMLL",
          "rank": 141
        },
        {
          "symbol": "HBSA3",
          "name": "HIDROVIAS DO BRASIL S.A.",
          "sector": "Transportation",
          "m1": -11.41141141141141,
          "m3": -6.050955414012737,
          "score": 29,
          "benchmark": "SMLL",
          "rank": 142
        },
        {
          "symbol": "TTEN3",
          "name": "TRÊS TENTOS AGROINDUSTRIAL S/A",
          "sector": "Commercial Services",
          "m1": 0.7843137254901933,
          "m3": -12.881355932203398,
          "score": 28,
          "benchmark": "SMLL",
          "rank": 143
        },
        {
          "symbol": "LPSB3",
          "name": "LPS BRASIL - CONSULTORIA DE IMOVEIS S.A.",
          "sector": "Commercial Services",
          "m1": -26.119402985074636,
          "m3": -31.72413793103448,
          "score": 28,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 144
        },
        {
          "symbol": "DMVF3",
          "name": "D1000 VAREJO FARMA PARTICIPAÇÕES S.A.",
          "sector": "Distribution Services",
          "m1": -23.96694214876034,
          "m3": -33.04221251819506,
          "score": 27,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 145
        },
        {
          "symbol": "OPCT3",
          "name": "OCEANPACT SERVICOS MARITIMOS S.A.",
          "sector": "Commercial Services",
          "m1": -0.11123470522802492,
          "m3": -12.815533980582527,
          "score": 27,
          "benchmark": "SMLL",
          "rank": 146
        },
        {
          "symbol": "MDIA3",
          "name": "M.DIAS BRANCO S.A. IND COM DE ALIMENTOS",
          "sector": "Consumer Non-Durables",
          "m1": -6.345332519829173,
          "m3": -10.495626822157433,
          "score": 26,
          "benchmark": "SMLL",
          "rank": 147
        },
        {
          "symbol": "SYNE3",
          "name": "SYN PROP E TECH S.A.",
          "sector": "Finance",
          "m1": -25.690607734806637,
          "m3": -34.229828850855746,
          "score": 26,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 148
        },
        {
          "symbol": "TUPY3",
          "name": "TUPY S.A.",
          "sector": "Producer Manufacturing",
          "m1": -13.309352517985607,
          "m3": -8.015267175572516,
          "score": 25,
          "benchmark": "SMLL",
          "rank": 149
        },
        {
          "symbol": "ABCB4",
          "name": "BCO ABC BRASIL S.A.",
          "sector": "Finance",
          "m1": -14.335394126738787,
          "m3": -7.624999999999993,
          "score": 25,
          "benchmark": "SMLL",
          "rank": 150
        },
        {
          "symbol": "SAPR11",
          "name": "CIA SANEAMENTO DO PARANA - SANEPAR",
          "sector": "Utilities",
          "m1": -6.543471675249912,
          "m3": -14.849572177753235,
          "score": 24,
          "benchmark": "SMLL",
          "rank": 151
        },
        {
          "symbol": "JSLG3",
          "name": "JSL S.A.",
          "sector": "Transportation",
          "m1": -28.98172323759791,
          "m3": -2.857142857142847,
          "score": 24,
          "benchmark": "SMLL",
          "rank": 152
        },
        {
          "symbol": "GGPS3",
          "name": "GPS PARTICIPACOES E EMPREENDIMENTOS S.A.",
          "sector": "Commercial Services",
          "m1": -16.33466135458168,
          "m3": -10.409556313993173,
          "score": 23,
          "benchmark": "SMLL",
          "rank": 153
        },
        {
          "symbol": "FESA4",
          "name": "CIA FERRO LIGAS DA BAHIA - FERBASA",
          "sector": "Non-Energy Minerals",
          "m1": -5.838041431261765,
          "m3": -16.52754590984975,
          "score": 23,
          "benchmark": "SMLL",
          "rank": 154
        },
        {
          "symbol": "VTRU3",
          "name": "VITRU EDUCAÇÃO S.A",
          "sector": "Commercial Services",
          "m1": -22.22959522229595,
          "m3": -9.846153846153838,
          "score": 22,
          "benchmark": "SMLL",
          "rank": 155
        },
        {
          "symbol": "DXCO3",
          "name": "DEXCO S.A.",
          "sector": "Producer Manufacturing",
          "m1": -21.342512908777955,
          "m3": -10.392156862745082,
          "score": 22,
          "benchmark": "SMLL",
          "rank": 156
        },
        {
          "symbol": "CASH3",
          "name": "MÉLIUZ S.A.",
          "sector": "Commercial Services",
          "m1": -22.803738317757006,
          "m3": -9.825327510917036,
          "score": 21,
          "benchmark": "SMLL",
          "rank": 157
        },
        {
          "symbol": "MYPK3",
          "name": "IOCHPE MAXION S.A.",
          "sector": "Producer Manufacturing",
          "m1": -12.216216216216225,
          "m3": -16.374871266735337,
          "score": 21,
          "benchmark": "SMLL",
          "rank": 158
        },
        {
          "symbol": "SEER3",
          "name": "SER EDUCACIONAL S.A.",
          "sector": "Consumer Services",
          "m1": -21.595900439238648,
          "m3": -11.779242174629323,
          "score": 20,
          "benchmark": "SMLL",
          "rank": 159
        },
        {
          "symbol": "BRSR6",
          "name": "BCO ESTADO DO RIO GRANDE DO SUL S.A.",
          "sector": "Finance",
          "m1": -22.26415094339623,
          "m3": -12.091038406827892,
          "score": 20,
          "benchmark": "SMLL",
          "rank": 160
        },
        {
          "symbol": "UNIP6",
          "name": "UNIPAR CARBOCLORO S.A.",
          "sector": "Process Industries",
          "m1": -9.429941395844432,
          "m3": -19.29102706124386,
          "score": 19,
          "benchmark": "SMLL",
          "rank": 161
        },
        {
          "symbol": "QUAL3",
          "name": "QUALICORP CONSULTORIA E CORRETORA DE SEGUROS S.A.",
          "sector": "Health Services",
          "m1": -20.48192771084336,
          "m3": -13.725490196078427,
          "score": 19,
          "benchmark": "SMLL",
          "rank": 162
        },
        {
          "symbol": "PNVL3",
          "name": "DIMED S.A. DISTRIBUIDORA DE MEDICAMENTOS",
          "sector": "Retail Trade",
          "m1": -20.62992125984251,
          "m3": -14.936708860759495,
          "score": 18,
          "benchmark": "SMLL",
          "rank": 163
        },
        {
          "symbol": "VULC3",
          "name": "VULCABRAS S.A.",
          "sector": "Consumer Non-Durables",
          "m1": -16.570188133140384,
          "m3": -17.16954022988506,
          "score": 18,
          "benchmark": "SMLL",
          "rank": 164
        },
        {
          "symbol": "SEQL3",
          "name": "SEQUOIA LOGISTICA E TRANSPORTES S.A",
          "sector": "Transportation",
          "m1": -33.33333333333333,
          "m3": -42.85714285714286,
          "score": 17,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 165
        },
        {
          "symbol": "CAML3",
          "name": "CAMIL ALIMENTOS S.A.",
          "sector": "Process Industries",
          "m1": -24.76370510396976,
          "m3": -15.138592750533054,
          "score": 17,
          "benchmark": "SMLL",
          "rank": 166
        },
        {
          "symbol": "ESPA3",
          "name": "MPM CORPÓREOS S.A.",
          "sector": "Consumer Services",
          "m1": -37.24966622162884,
          "m3": -41.68734491315137,
          "score": 16,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 167
        },
        {
          "symbol": "LWSA3",
          "name": "LWSA S.A.",
          "sector": "Technology Services",
          "m1": -23.51485148514851,
          "m3": -16.93548387096775,
          "score": 16,
          "benchmark": "SMLL",
          "rank": 168
        },
        {
          "symbol": "POSI3",
          "name": "POSITIVO TECNOLOGIA S.A.",
          "sector": "Electronic Technology",
          "m1": -21.5633423180593,
          "m3": -18.028169014084494,
          "score": 15,
          "benchmark": "SMLL",
          "rank": 169
        },
        {
          "symbol": "GMAT3",
          "name": "GRUPO MATEUS S.A.",
          "sector": "Retail Trade",
          "m1": -31.10236220472441,
          "m3": -13.151364764267992,
          "score": 15,
          "benchmark": "SMLL",
          "rank": 170
        },
        {
          "symbol": "LOGG3",
          "name": "LOG COMMERCIAL PROPERTIES",
          "sector": "Industrial Services",
          "m1": -18.689710610932476,
          "m3": -20.44828942194259,
          "score": 14,
          "benchmark": "SMLL",
          "rank": 171
        },
        {
          "symbol": "JHSF3",
          "name": "JHSF PARTICIPACOES S.A.",
          "sector": "Finance",
          "m1": -23.529411764705877,
          "m3": -18.896925858951175,
          "score": 14,
          "benchmark": "SMLL",
          "rank": 172
        },
        {
          "symbol": "BRKM5",
          "name": "BRASKEM S.A.",
          "sector": "Process Industries",
          "m1": -29.481132075471695,
          "m3": -49.916247906197654,
          "score": 13,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 173
        },
        {
          "symbol": "POMO3",
          "name": "MARCOPOLO S.A.",
          "sector": "Producer Manufacturing",
          "m1": -9.438775510204088,
          "m3": -27.551020408163275,
          "score": 13,
          "benchmark": "SMLL",
          "rank": 174
        },
        {
          "symbol": "ARML3",
          "name": "ARMAC LOCAÇÃO. LOGÍSTICA E SERVIÇOS S.A.",
          "sector": "Finance",
          "m1": -31.090487238979104,
          "m3": -16.573033707865157,
          "score": 12,
          "benchmark": "SMLL",
          "rank": 175
        },
        {
          "symbol": "PINE4",
          "name": "BCO PINE S.A.",
          "sector": "Finance",
          "m1": -20.271348762968866,
          "m3": -23.565416985462896,
          "score": 12,
          "benchmark": "SMLL",
          "rank": 176
        },
        {
          "symbol": "RIAA3",
          "name": "RIACHUELO S.A.",
          "sector": "Distribution Services",
          "m1": -17.154811715481166,
          "m3": -25.283018867924522,
          "score": 11,
          "benchmark": "SMLL",
          "rank": 177
        },
        {
          "symbol": "VLID3",
          "name": "VALID SOLUÇÕES S.A.",
          "sector": "Commercial Services",
          "m1": -21.416333523700747,
          "m3": -24.685276409414335,
          "score": 11,
          "benchmark": "SMLL",
          "rank": 178
        },
        {
          "symbol": "PGMN3",
          "name": "EMPREENDIMENTOS PAGUE MENOS S.A.",
          "sector": "Retail Trade",
          "m1": -28.115942028985508,
          "m3": -22.012578616352208,
          "score": 10,
          "benchmark": "SMLL",
          "rank": 179
        },
        {
          "symbol": "AZTE3",
          "name": "AZEVEDO & TRAVASSOS ENERGIA S.A.",
          "sector": "Energy Minerals",
          "m1": -36.29032258064516,
          "m3": -51.53374233128834,
          "score": 10,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 180
        },
        {
          "symbol": "EZTC3",
          "name": "EZ TEC EMPREEND. E PARTICIPACOES S.A.",
          "sector": "Finance",
          "m1": -36.045681655960024,
          "m3": -19.060523938572715,
          "score": 9,
          "benchmark": "SMLL",
          "rank": 181
        },
        {
          "symbol": "LJQQ3",
          "name": "LOJAS QUERO-QUERO S/A",
          "sector": "Retail Trade",
          "m1": -37.086092715231786,
          "m3": -24,
          "score": 9,
          "benchmark": "SMLL",
          "rank": 182
        },
        {
          "symbol": "LAVV3",
          "name": "LAVVI EMPREENDIMENTOS IMOBILIÁRIOS S.A.",
          "sector": "Finance",
          "m1": -31.473010064043915,
          "m3": -27.422480620155042,
          "score": 8,
          "benchmark": "SMLL",
          "rank": 183
        },
        {
          "symbol": "AZUL3",
          "name": "AZUL S.A.",
          "sector": "Transportation",
          "m1": -46.05873261205564,
          "m3": -52.75270758122743,
          "score": 8,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 184
        },
        {
          "symbol": "TFCO4",
          "name": "TRACK & FIELD CO S.A.",
          "sector": "Retail Trade",
          "m1": -25.418569254185684,
          "m3": -33.287950987066026,
          "score": 7,
          "benchmark": "SMLL",
          "rank": 185
        },
        {
          "symbol": "BRBI11",
          "name": "BRBI BR PARTNERS S.A.",
          "sector": "Finance",
          "m1": -31.78082191780821,
          "m3": -30.737134909596662,
          "score": 7,
          "benchmark": "SMLL",
          "rank": 186
        },
        {
          "symbol": "RAPT4",
          "name": "RANDONCORP S.A.",
          "sector": "Producer Manufacturing",
          "m1": -33.592233009708735,
          "m3": -30.204081632653068,
          "score": 6,
          "benchmark": "SMLL",
          "rank": 187
        },
        {
          "symbol": "MOVI3",
          "name": "MOVIDA PARTICIPACOES SA",
          "sector": "Finance",
          "m1": -43.89999999999999,
          "m3": -28.807106598984767,
          "score": 6,
          "benchmark": "SMLL",
          "rank": 188
        },
        {
          "symbol": "EVEN3",
          "name": "EVEN CONSTRUTORA E INCORPORADORA S.A.",
          "sector": "Finance",
          "m1": -33.40380549682877,
          "m3": -34.78260869565217,
          "score": 5,
          "benchmark": "SMLL",
          "rank": 189
        },
        {
          "symbol": "ECOR3",
          "name": "ECORODOVIAS INFRAESTRUTURA E LOGÍSTICA S.A.",
          "sector": "Transportation",
          "m1": -45.84717607973422,
          "m3": -29.43722943722944,
          "score": 5,
          "benchmark": "SMLL",
          "rank": 190
        },
        {
          "symbol": "MDNE3",
          "name": "MOURA DUBEUX ENGENHARIA S/A",
          "sector": "Finance",
          "m1": -38.08229813664597,
          "m3": -35.45123431808985,
          "score": 4,
          "benchmark": "SMLL",
          "rank": 191
        },
        {
          "symbol": "PLPL3",
          "name": "PLANO & PLANO DESENVOLVIMENTO IMOBILIÁRIO S.A.",
          "sector": "Finance",
          "m1": -33.28358208955224,
          "m3": -39.2663043478261,
          "score": 4,
          "benchmark": "SMLL",
          "rank": 192
        },
        {
          "symbol": "AZEV4",
          "name": "AZEVEDO E TRAVASSOS S.A.",
          "sector": "Industrial Services",
          "m1": -42.01680672268908,
          "m3": -67.7570093457944,
          "score": 3,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 193
        },
        {
          "symbol": "PRNR3",
          "name": "PRINER SERVIÇOS INDUSTRIAIS S.A.",
          "sector": "Industrial Services",
          "m1": -35.53191489361702,
          "m3": -38.60182370820668,
          "score": 3,
          "benchmark": "SMLL",
          "rank": 194
        },
        {
          "symbol": "CVCB3",
          "name": "CVC BRASIL OPERADORA E AGÊNCIA DE VIAGENS S.A.",
          "sector": "Consumer Services",
          "m1": -46.308724832214764,
          "m3": -38.93129770992366,
          "score": 2,
          "benchmark": "SMLL",
          "rank": 195
        },
        {
          "symbol": "SIMH3",
          "name": "SIMPAR S.A.",
          "sector": "Transportation",
          "m1": -49.74039460020769,
          "m3": -37.224383916990924,
          "score": 2,
          "benchmark": "SMLL",
          "rank": 196
        },
        {
          "symbol": "SBFG3",
          "name": "GRUPO SBF SA",
          "sector": "Retail Trade",
          "m1": -41.49326805385557,
          "m3": -49.41798941798942,
          "score": 1,
          "benchmark": "SMLL",
          "rank": 197
        },
        {
          "symbol": "ORVR3",
          "name": "ORIZON VALORIZACAO DE RESIDUOS S.A.",
          "sector": "Utilities",
          "m1": -8.117443868739205,
          "m3": -77.36170212765957,
          "score": 1,
          "benchmark": "SMLL",
          "rank": 198
        },
        {
          "symbol": "PDGR3",
          "name": "PDG REALTY S.A. EMPREEND E PARTICIPACOES",
          "sector": "Finance",
          "m1": -83.33333333333334,
          "m3": -85.36585365853658,
          "score": 0,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 199
        }
      ]
    },
    "fii": {
      "key": "fii",
      "label": "FIIs",
      "benchmark": "IFIX",
      "items": [
        {
          "symbol": "HGLG11",
          "name": "CSHG Logística",
          "sector": "Logística",
          "m1": 1.0476512335248378,
          "m3": 1.4109347442680775,
          "score": 100,
          "rank": 1
        },
        {
          "symbol": "VGRI11",
          "name": "Valora Gestão de Renda Imobiliária",
          "sector": "Outros",
          "m1": 2.146690518783534,
          "m3": -0.3490401396160636,
          "score": 99,
          "rank": 2
        },
        {
          "symbol": "AZPL11",
          "name": "AZ Quest Panorama Logística",
          "sector": "Logística",
          "m1": 1.1004126547455195,
          "m3": -1.34228187919464,
          "score": 98,
          "rank": 3
        },
        {
          "symbol": "GARE11",
          "name": "Guardian Real Estate",
          "sector": "Outros",
          "m1": -2.497027348394776,
          "m3": -0.36452004860269005,
          "score": 97,
          "rank": 4
        },
        {
          "symbol": "AFHI11",
          "name": "AF Invest Cri",
          "sector": "Papel/CRI",
          "m1": -1.9090813205358104,
          "m3": -1.4830508474576343,
          "score": 96,
          "rank": 5
        },
        {
          "symbol": "XPLG11",
          "name": "XP Logística",
          "sector": "Logística",
          "m1": -1.4268727705113005,
          "m3": -1.840688912809485,
          "score": 95,
          "rank": 6
        },
        {
          "symbol": "PORD11",
          "name": "Polo FII Recebíveis Imobiliários",
          "sector": "Outros",
          "m1": -2.1352313167259718,
          "m3": -1.5513126491646823,
          "score": 94,
          "rank": 7
        },
        {
          "symbol": "HGCR11",
          "name": "CSHG Recebíveis Imobiliários",
          "sector": "Papel/CRI",
          "m1": -2.277279915656294,
          "m3": -1.477465986394555,
          "score": 93,
          "rank": 8
        },
        {
          "symbol": "XPSF11",
          "name": "XP Seleção FOF",
          "sector": "Híbridos",
          "m1": -4.3887147335423204,
          "m3": -0.6514657980456029,
          "score": 92,
          "rank": 9
        },
        {
          "symbol": "BTLG11",
          "name": "BTG Pactual Logística",
          "sector": "Logística",
          "m1": -1.0309278350515427,
          "m3": -2.866779089376059,
          "score": 91,
          "rank": 10
        },
        {
          "symbol": "LIFE11",
          "name": "Life Capital Partners",
          "sector": "Lajes corporativas",
          "m1": -0.14204545454544748,
          "m3": -3.434065934065933,
          "score": 90,
          "rank": 11
        },
        {
          "symbol": "KNCR11",
          "name": "Kinea Rendimentos Imobiliários",
          "sector": "Papel/CRI",
          "m1": -1.3345864661654105,
          "m3": -2.859257888405653,
          "score": 89,
          "rank": 12
        },
        {
          "symbol": "HFOF11",
          "name": "Hedge Top FOFII",
          "sector": "Híbridos",
          "m1": -1.5873015873015817,
          "m3": -3.2761310452418035,
          "score": 88,
          "rank": 13
        },
        {
          "symbol": "VILG11",
          "name": "Vinci Logística",
          "sector": "Logística",
          "m1": -3.0093093743234434,
          "m3": -2.545138133565372,
          "score": 87,
          "rank": 14
        },
        {
          "symbol": "PMLL11",
          "name": "Pátria Malls",
          "sector": "Shopping",
          "m1": -4.680810579393013,
          "m3": -1.8707149853085192,
          "score": 86,
          "rank": 15
        },
        {
          "symbol": "MANA11",
          "name": "MANA FII",
          "sector": "Outros",
          "m1": -3.1419284940411796,
          "m3": -2.826086956521734,
          "score": 85,
          "rank": 16
        },
        {
          "symbol": "JSRE11",
          "name": "JS Real Estate Multigestão",
          "sector": "Lajes corporativas",
          "m1": -5.329000812347672,
          "m3": -1.7203575645133973,
          "score": 84,
          "rank": 17
        },
        {
          "symbol": "ALZR11",
          "name": "Alianza Trust Renda Imobiliária",
          "sector": "Outros",
          "m1": -2.4144869215291798,
          "m3": -3.2901296111665035,
          "score": 83,
          "rank": 18
        },
        {
          "symbol": "BPML11",
          "name": "BTG Pactual Shoppings",
          "sector": "Shopping",
          "m1": -6.259130239352729,
          "m3": -1.348155156102182,
          "score": 83,
          "rank": 19
        },
        {
          "symbol": "BRCR11",
          "name": "BTG Pactual Corporate Office",
          "sector": "Lajes corporativas",
          "m1": -5.334928229665071,
          "m3": -1.8844532606000497,
          "score": 82,
          "rank": 20
        },
        {
          "symbol": "HTMX11",
          "name": "Hotel Maxinvest",
          "sector": "Outros",
          "m1": -1.5534549717886703,
          "m3": -3.9465217702152056,
          "score": 81,
          "rank": 21
        },
        {
          "symbol": "FATN11",
          "name": "BR Capital Distribuição",
          "sector": "Outros",
          "m1": -6.190476190476191,
          "m3": -1.5984015984015998,
          "score": 80,
          "rank": 22
        },
        {
          "symbol": "RBRL11",
          "name": "RBR Logística",
          "sector": "Híbridos",
          "m1": -7.065146152837853,
          "m3": -1.3359309768995131,
          "score": 79,
          "rank": 23
        },
        {
          "symbol": "RBRY11",
          "name": "RBR Crédito Imobiliário",
          "sector": "Papel/CRI",
          "m1": -2.409638554216864,
          "m3": -4.379648211545262,
          "score": 78,
          "rank": 24
        },
        {
          "symbol": "CYCR11",
          "name": "Cyrela Crédito Imobiliário",
          "sector": "Outros",
          "m1": -2.715466351829998,
          "m3": -4.297328687572577,
          "score": 77,
          "rank": 25
        },
        {
          "symbol": "KNSC11",
          "name": "Kinea Securities",
          "sector": "Papel/CRI",
          "m1": -3.6383682469680267,
          "m3": -3.850385038503845,
          "score": 76,
          "rank": 26
        },
        {
          "symbol": "RCRB11",
          "name": "Rio Bravo Renda Corporativa",
          "sector": "Lajes corporativas",
          "m1": -2.164179104477615,
          "m3": -4.647610735326213,
          "score": 75,
          "rank": 27
        },
        {
          "symbol": "SNCI11",
          "name": "Suno Recebíveis Imobiliários",
          "sector": "Outros",
          "m1": -1.744397334948511,
          "m3": -4.967779730521382,
          "score": 74,
          "rank": 28
        },
        {
          "symbol": "HGRE11",
          "name": "CSHG Real Estate",
          "sector": "Lajes corporativas",
          "m1": -2.611812905428479,
          "m3": -4.7579298831385675,
          "score": 73,
          "rank": 29
        },
        {
          "symbol": "KNRI11",
          "name": "Kinea Renda Imobiliária",
          "sector": "Outros",
          "m1": -4.146232724030307,
          "m3": -4.5958795562599075,
          "score": 72,
          "rank": 30
        },
        {
          "symbol": "GTWR11",
          "name": "Green Towers Brasília",
          "sector": "Lajes corporativas",
          "m1": -3.6616161616161658,
          "m3": -4.898417050978443,
          "score": 71,
          "rank": 31
        },
        {
          "symbol": "CLIN11",
          "name": "Clave Índices de Preços",
          "sector": "Papel/CRI",
          "m1": -2.517564402810313,
          "m3": -5.7298154229419085,
          "score": 70,
          "rank": 32
        },
        {
          "symbol": "HGBS11",
          "name": "Hedge Brasil Shopping",
          "sector": "Shopping",
          "m1": -2.746365105008086,
          "m3": -5.642633228840133,
          "score": 69,
          "rank": 33
        },
        {
          "symbol": "SPXS11",
          "name": "Apex SPX Crédito Imobiliário",
          "sector": "Outros",
          "m1": -1.754385964912275,
          "m3": -6.306306306306297,
          "score": 68,
          "rank": 34
        },
        {
          "symbol": "KORE11",
          "name": "Kinea Oportunidades Real Estate",
          "sector": "Outros",
          "m1": -5.4704920469748615,
          "m3": -4.361558129041954,
          "score": 67,
          "rank": 35
        },
        {
          "symbol": "VISC11",
          "name": "Vinci Shopping Centers",
          "sector": "Shopping",
          "m1": -3.689320388349515,
          "m3": -5.424730670225952,
          "score": 66,
          "rank": 36
        },
        {
          "symbol": "KNHF11",
          "name": "Kinea Hedge Fund",
          "sector": "Papel/CRI",
          "m1": -2.522464003464331,
          "m3": -6.208333333333327,
          "score": 65,
          "rank": 37
        },
        {
          "symbol": "BBIG11",
          "name": "BB Renda Imobiliária",
          "sector": "Outros",
          "m1": -1.9083969465648942,
          "m3": -6.545454545454554,
          "score": 64,
          "rank": 38
        },
        {
          "symbol": "BTAL11",
          "name": "BTG Pactual Agro Logística",
          "sector": "Outros",
          "m1": -3.574902723735407,
          "m3": -5.696277797597816,
          "score": 63,
          "rank": 39
        },
        {
          "symbol": "LVBI11",
          "name": "VBI Logística",
          "sector": "Logística",
          "m1": -1.9509703779366783,
          "m3": -6.787725771994568,
          "score": 62,
          "rank": 40
        },
        {
          "symbol": "JSAF11",
          "name": "JS Ativos Financeiros",
          "sector": "Híbridos",
          "m1": -4.378531073446334,
          "m3": -5.57880055788006,
          "score": 61,
          "rank": 41
        },
        {
          "symbol": "KIVO11",
          "name": "Kilima Vesta",
          "sector": "Papel/CRI",
          "m1": -0.5620082427875706,
          "m3": -7.831220698037866,
          "score": 60,
          "rank": 42
        },
        {
          "symbol": "MCCI11",
          "name": "Mauá Capital Recebíveis",
          "sector": "Papel/CRI",
          "m1": -5.179704016913311,
          "m3": -5.379746835443033,
          "score": 59,
          "rank": 43
        },
        {
          "symbol": "KCRE11",
          "name": "Kinea Crédito Agro",
          "sector": "Papel/CRI",
          "m1": -3.04449648711943,
          "m3": -6.546275395033863,
          "score": 58,
          "rank": 44
        },
        {
          "symbol": "ICRI11",
          "name": "Integral Brei CRI",
          "sector": "Papel/CRI",
          "m1": -1.920878115710034,
          "m3": -7.264864864864862,
          "score": 57,
          "rank": 45
        },
        {
          "symbol": "WHGR11",
          "name": "WHG Real Estate",
          "sector": "Outros",
          "m1": -0.36057692307693845,
          "m3": -8.194905869324476,
          "score": 56,
          "rank": 46
        },
        {
          "symbol": "HSAF11",
          "name": "HSI Ativos Financeiros",
          "sector": "Outros",
          "m1": -5.584415584415581,
          "m3": -5.449343217583557,
          "score": 55,
          "rank": 47
        },
        {
          "symbol": "KNHY11",
          "name": "Kinea High Yield CRI",
          "sector": "Papel/CRI",
          "m1": -2.2163588390501254,
          "m3": -7.36852629474104,
          "score": 54,
          "rank": 48
        },
        {
          "symbol": "VRTA11",
          "name": "Fator Verità",
          "sector": "Papel/CRI",
          "m1": -5.1133222775013865,
          "m3": -5.945205479452065,
          "score": 53,
          "rank": 49
        },
        {
          "symbol": "KNUQ11",
          "name": "Kinea Unique",
          "sector": "Papel/CRI",
          "m1": -4.276729559748416,
          "m3": -6.431476402156433,
          "score": 52,
          "rank": 50
        },
        {
          "symbol": "XPCI11",
          "name": "XP Crédito Imobiliário",
          "sector": "Papel/CRI",
          "m1": -3.4335303735379297,
          "m3": -6.978434698328084,
          "score": 51,
          "rank": 51
        },
        {
          "symbol": "KNIP11",
          "name": "Kinea Índices de Preços",
          "sector": "Papel/CRI",
          "m1": -4.1367713004484274,
          "m3": -6.638279288131887,
          "score": 50,
          "rank": 52
        },
        {
          "symbol": "MXRF11",
          "name": "Maxi Renda",
          "sector": "Papel/CRI",
          "m1": -3.1624863685932314,
          "m3": -7.306889352818368,
          "score": 50,
          "rank": 53
        },
        {
          "symbol": "XPML11",
          "name": "XP Malls",
          "sector": "Shopping",
          "m1": -2.850260939381777,
          "m3": -7.615957243748806,
          "score": 49,
          "rank": 54
        },
        {
          "symbol": "VRTM11",
          "name": "Fator Verità Multiestratégia",
          "sector": "Outros",
          "m1": -4.72673559822746,
          "m3": -6.657018813314042,
          "score": 48,
          "rank": 55
        },
        {
          "symbol": "HGRU11",
          "name": "CSHG Renda Urbana",
          "sector": "Outros",
          "m1": -0.48013967699693794,
          "m3": -8.982035928143716,
          "score": 47,
          "rank": 56
        },
        {
          "symbol": "BTHF11",
          "name": "BTG Pactual Hedge Fund",
          "sector": "Híbridos",
          "m1": -4.9482163406214035,
          "m3": -6.666666666666665,
          "score": 46,
          "rank": 57
        },
        {
          "symbol": "BCIA11",
          "name": "Bradesco Carteira Imobiliária Ativa",
          "sector": "Híbridos",
          "m1": -5.101455921128051,
          "m3": -6.5899345520198604,
          "score": 45,
          "rank": 58
        },
        {
          "symbol": "RZAK11",
          "name": "Riza Akin",
          "sector": "Papel/CRI",
          "m1": -4.83434317390744,
          "m3": -6.792929292929307,
          "score": 44,
          "rank": 59
        },
        {
          "symbol": "VGIR11",
          "name": "Valora RE III",
          "sector": "Papel/CRI",
          "m1": -7.772020725388595,
          "m3": -5.919661733615222,
          "score": 43,
          "rank": 60
        },
        {
          "symbol": "ITRI11",
          "name": "Inter Títulos Imobiliários",
          "sector": "Outros",
          "m1": -7.936507936507942,
          "m3": -6.173159052672439,
          "score": 42,
          "rank": 61
        },
        {
          "symbol": "RPRI11",
          "name": "RBCap Renda Imobiliária",
          "sector": "Papel/CRI",
          "m1": -2.9027777777777874,
          "m3": -8.900182434193383,
          "score": 41,
          "rank": 62
        },
        {
          "symbol": "CPTS11",
          "name": "Capitânia Securities II",
          "sector": "Papel/CRI",
          "m1": -7.038512616201864,
          "m3": -6.914893617021267,
          "score": 40,
          "rank": 63
        },
        {
          "symbol": "HSML11",
          "name": "HSI Malls",
          "sector": "Shopping",
          "m1": -4.522613065326631,
          "m3": -8.570119156736943,
          "score": 39,
          "rank": 64
        },
        {
          "symbol": "CPSH11",
          "name": "Capitânia Shopping",
          "sector": "Outros",
          "m1": -7.849133537206942,
          "m3": -6.995884773662564,
          "score": 38,
          "rank": 65
        },
        {
          "symbol": "VCJR11",
          "name": "Vectis Juros Real",
          "sector": "Papel/CRI",
          "m1": -3.649851632047485,
          "m3": -9.377616522467203,
          "score": 37,
          "rank": 66
        },
        {
          "symbol": "SNEL11",
          "name": "Suno Energias Limpas",
          "sector": "Outros",
          "m1": -5.223880597014919,
          "m3": -8.633093525179858,
          "score": 36,
          "rank": 67
        },
        {
          "symbol": "BRCO11",
          "name": "Bresco Logística",
          "sector": "Logística",
          "m1": -5.902312706491653,
          "m3": -8.325358851674647,
          "score": 35,
          "rank": 68
        },
        {
          "symbol": "TVRI11",
          "name": "Tivio Renda Imobiliária",
          "sector": "Outros",
          "m1": -4.831956546339267,
          "m3": -9.090909090909104,
          "score": 34,
          "rank": 69
        },
        {
          "symbol": "OUJP11",
          "name": "Ourinvest JPP",
          "sector": "Papel/CRI",
          "m1": -5.0267225191391045,
          "m3": -9.05947441217151,
          "score": 33,
          "rank": 70
        },
        {
          "symbol": "KFOF11",
          "name": "Kinea Fundo de Fundos",
          "sector": "Híbridos",
          "m1": -7.1822495831730055,
          "m3": -8.17155183352366,
          "score": 32,
          "rank": 71
        },
        {
          "symbol": "IRIM11",
          "name": "Iridium Recebíveis Imobiliários",
          "sector": "Papel/CRI",
          "m1": -3.8265725078009516,
          "m3": -10.032263020433252,
          "score": 31,
          "rank": 72
        },
        {
          "symbol": "PCIP11",
          "name": "Polocred Índices de Preços",
          "sector": "Papel/CRI",
          "m1": -5.593544857768052,
          "m3": -9.147143985259287,
          "score": 30,
          "rank": 73
        },
        {
          "symbol": "VINO11",
          "name": "Vinci Offices",
          "sector": "Lajes corporativas",
          "m1": -4.387990762124716,
          "m3": -9.80392156862746,
          "score": 29,
          "rank": 74
        },
        {
          "symbol": "BTCI11",
          "name": "BTG Pactual Crédito Imobiliário",
          "sector": "Papel/CRI",
          "m1": -4.519119351100819,
          "m3": -9.84682713347922,
          "score": 28,
          "rank": 75
        },
        {
          "symbol": "URPR11",
          "name": "Urca Prime Renda",
          "sector": "Outros",
          "m1": -9.343434343434353,
          "m3": -7.948717948717954,
          "score": 27,
          "rank": 76
        },
        {
          "symbol": "RBRP11",
          "name": "RBR Properties",
          "sector": "Lajes corporativas",
          "m1": -14.52941176470588,
          "m3": -5.321459600347511,
          "score": 26,
          "rank": 77
        },
        {
          "symbol": "RBFM11",
          "name": "Rio Bravo Renda Comercial",
          "sector": "Híbridos",
          "m1": -5.295315682281054,
          "m3": -10.490856592877762,
          "score": 25,
          "rank": 78
        },
        {
          "symbol": "HABT11",
          "name": "Habitat II",
          "sector": "Papel/CRI",
          "m1": -3.686286407766992,
          "m3": -11.363953650705005,
          "score": 24,
          "rank": 79
        },
        {
          "symbol": "RECR11",
          "name": "REC Recebíveis Imobiliários",
          "sector": "Papel/CRI",
          "m1": -4.465366509751167,
          "m3": -11.212500000000002,
          "score": 23,
          "rank": 80
        },
        {
          "symbol": "VGIP11",
          "name": "Valora CRI Índice de Preço",
          "sector": "Papel/CRI",
          "m1": -3.619340413638905,
          "m3": -11.803069053708448,
          "score": 22,
          "rank": 81
        },
        {
          "symbol": "RBVA11",
          "name": "Rio Bravo Renda Varejo",
          "sector": "Outros",
          "m1": -9.375000000000021,
          "m3": -9.172259507829983,
          "score": 21,
          "rank": 82
        },
        {
          "symbol": "TOPP11",
          "name": "Torre Almirante",
          "sector": "Outros",
          "m1": -7.550077041602476,
          "m3": -10.966018697136072,
          "score": 20,
          "rank": 83
        },
        {
          "symbol": "TEPP11",
          "name": "Tellus Properties",
          "sector": "Lajes corporativas",
          "m1": -3.356643356643363,
          "m3": -13.299874529485567,
          "score": 19,
          "rank": 84
        },
        {
          "symbol": "BCRI11",
          "name": "Banestes Recebíveis Imobiliários",
          "sector": "Papel/CRI",
          "m1": -6.389037195230463,
          "m3": -12.17231591250626,
          "score": 18,
          "rank": 85
        },
        {
          "symbol": "RBRX11",
          "name": "RBR Plus Multiestratégia",
          "sector": "Híbridos",
          "m1": -6.963788300835649,
          "m3": -12.565445026178013,
          "score": 17,
          "rank": 86
        },
        {
          "symbol": "PVBI11",
          "name": "VBI Prime Properties",
          "sector": "Lajes corporativas",
          "m1": -7.617749507799488,
          "m3": -12.50717154331612,
          "score": 17,
          "rank": 87
        },
        {
          "symbol": "GZIT11",
          "name": "Gazit Malls",
          "sector": "Outros",
          "m1": -4.092427616926497,
          "m3": -15.022200296003941,
          "score": 16,
          "rank": 88
        },
        {
          "symbol": "RBRR11",
          "name": "RBR Rendimento High Grade",
          "sector": "Papel/CRI",
          "m1": -5.727958236658914,
          "m3": -14.392941796154846,
          "score": 15,
          "rank": 89
        },
        {
          "symbol": "GGRC11",
          "name": "GGR Covepi Renda Imobiliária",
          "sector": "Logística",
          "m1": -5.672969966629582,
          "m3": -15.453639082751735,
          "score": 14,
          "rank": 90
        },
        {
          "symbol": "BROF11",
          "name": "BR Properties Corporate Offices",
          "sector": "Outros",
          "m1": -15.244865718799371,
          "m3": -10.657785179017488,
          "score": 13,
          "rank": 91
        },
        {
          "symbol": "MCRE11",
          "name": "Mauá Capital Real Estate",
          "sector": "Papel/CRI",
          "m1": -5.366492146596846,
          "m3": -16.416184971098268,
          "score": 12,
          "rank": 92
        },
        {
          "symbol": "RZAT11",
          "name": "Riza Agro",
          "sector": "Outros",
          "m1": -9.780370624571033,
          "m3": -14.281056406912295,
          "score": 11,
          "rank": 93
        },
        {
          "symbol": "PSEC11",
          "name": "Pátria Securitizadora",
          "sector": "Papel/CRI",
          "m1": -10.035211267605625,
          "m3": -14.864864864864868,
          "score": 10,
          "rank": 94
        },
        {
          "symbol": "VGHF11",
          "name": "Valora Hedge Fund",
          "sector": "Outros",
          "m1": -5.138339920948609,
          "m3": -18.08873720136519,
          "score": 9,
          "rank": 95
        },
        {
          "symbol": "DEVA11",
          "name": "Devant Recebíveis Imobiliários",
          "sector": "Papel/CRI",
          "m1": -10.42765084944347,
          "m3": -18.626929217668973,
          "score": 8,
          "rank": 96
        },
        {
          "symbol": "TGAR11",
          "name": "TG Ativo Real",
          "sector": "Híbridos",
          "m1": -7.734553775743713,
          "m3": -20.47337278106509,
          "score": 7,
          "rank": 97
        },
        {
          "symbol": "RZTR11",
          "name": "Riza Terrax",
          "sector": "Outros",
          "m1": -13.726884779516357,
          "m3": -17.333030440708775,
          "score": 6,
          "rank": 98
        },
        {
          "symbol": "TRBL11",
          "name": "TRBL11",
          "sector": "Logística",
          "m1": -10.781034821955537,
          "m3": -21.18526242613834,
          "score": 5,
          "rank": 99
        },
        {
          "symbol": "HSLG11",
          "name": "HSI Logística",
          "sector": "Logística",
          "m1": -11.804446628178356,
          "m3": -21.194160904401272,
          "score": 4,
          "rank": 100
        },
        {
          "symbol": "CACR11",
          "name": "Cartesia Recebíveis Imobiliários",
          "sector": "Papel/CRI",
          "m1": -13.921433494141965,
          "m3": -20.698412698412692,
          "score": 3,
          "rank": 101
        },
        {
          "symbol": "TRXF11",
          "name": "TRX Real Estate",
          "sector": "Outros",
          "m1": -7.43836188884246,
          "m3": -27.05817782656421,
          "score": 2,
          "rank": 102
        },
        {
          "symbol": "HCTR11",
          "name": "Hectare CE",
          "sector": "Papel/CRI",
          "m1": -7.846153846153847,
          "m3": -27.39393939393939,
          "score": 1,
          "rank": 103
        },
        {
          "symbol": "MFII11",
          "name": "Mérito Desenvolvimento Imobiliário",
          "sector": "Outros",
          "m1": -17.406417112299465,
          "m3": -37.15157680569684,
          "score": 0,
          "rank": 104
        }
      ]
    },
    "bdr": {
      "key": "bdr",
      "label": "BDRs",
      "benchmark": "Universo BDR",
      "items": [
        {
          "symbol": "P2LT34",
          "name": "Palantir",
          "sector": "Technology Services",
          "m1": 5.043592387737883,
          "m3": 62.39130434782607,
          "score": 100,
          "rank": 1
        },
        {
          "symbol": "LILY34",
          "name": "Eli Lilly",
          "sector": "Health Technology",
          "m1": 28.403697227079693,
          "m3": 32.40597630087585,
          "score": 97,
          "rank": 2
        },
        {
          "symbol": "TSLA34",
          "name": "Tesla",
          "sector": "Consumer Durables",
          "m1": 18.38337988826815,
          "m3": 37.68527918781726,
          "score": 94,
          "rank": 3
        },
        {
          "symbol": "M2ST34",
          "name": "MicroStrategy",
          "sector": "Technology Services",
          "m1": -10.017730496453892,
          "m3": 49.48453608247423,
          "score": 91,
          "rank": 4
        },
        {
          "symbol": "CHVX34",
          "name": "Chevron",
          "sector": "Energy Minerals",
          "m1": 21.72514896434312,
          "m3": 31.420402328193585,
          "score": 88,
          "rank": 5
        },
        {
          "symbol": "WALM34",
          "name": "Walmart",
          "sector": "Retail Trade",
          "m1": 24.09923213230951,
          "m3": 19.036827195467442,
          "score": 85,
          "rank": 6
        },
        {
          "symbol": "SPCX34",
          "name": "SpaceX / Destiny",
          "sector": "Tecnologia",
          "m1": -5.64809496457973,
          "m3": 34.46111869031378,
          "score": 82,
          "rank": 7
        },
        {
          "symbol": "DISB34",
          "name": "Walt Disney",
          "sector": "Consumer Services",
          "m1": 12.36111111111111,
          "m3": 24.576532183554068,
          "score": 79,
          "rank": 8
        },
        {
          "symbol": "AAPL34",
          "name": "Apple",
          "sector": "Electronic Technology",
          "m1": 8.220915484837988,
          "m3": 20.611667951683387,
          "score": 76,
          "rank": 9
        },
        {
          "symbol": "MSFT34",
          "name": "Microsoft",
          "sector": "Technology Services",
          "m1": 7.274376417233563,
          "m3": 20.21752388696889,
          "score": 73,
          "rank": 10
        },
        {
          "symbol": "COCA34",
          "name": "Coca-Cola",
          "sector": "Consumer Non-Durables",
          "m1": 14.6112600536193,
          "m3": 16.168478260869577,
          "score": 70,
          "rank": 11
        },
        {
          "symbol": "BERK34",
          "name": "Berkshire Hathaway",
          "sector": "Finance",
          "m1": 14.508133230054243,
          "m3": 13.593053634547436,
          "score": 67,
          "rank": 12
        },
        {
          "symbol": "JNJB34",
          "name": "Johnson & Johnson",
          "sector": "Health Technology",
          "m1": 10.077859414409463,
          "m3": 15.233612673631036,
          "score": 64,
          "rank": 13
        },
        {
          "symbol": "M1TA34",
          "name": "Meta Platforms",
          "sector": "Technology Services",
          "m1": -11.385662499075233,
          "m3": 19.7440767769669,
          "score": 61,
          "rank": 14
        },
        {
          "symbol": "MUTC34",
          "name": "Micron Technology",
          "sector": "Electronic Technology",
          "m1": -13.397372174439216,
          "m3": 14.82664756446992,
          "score": 58,
          "rank": 15
        },
        {
          "symbol": "NVDC34",
          "name": "NVIDIA",
          "sector": "Electronic Technology",
          "m1": -5.737373737373741,
          "m3": 10.15108593012275,
          "score": 55,
          "rank": 16
        },
        {
          "symbol": "JPMC34",
          "name": "JPMorgan Chase",
          "sector": "Finance",
          "m1": 7.147027910778947,
          "m3": 2.7550677567476756,
          "score": 52,
          "rank": 17
        },
        {
          "symbol": "ORCL34",
          "name": "Oracle",
          "sector": "Technology Services",
          "m1": -0.9876129896217001,
          "m3": 7.058823529411762,
          "score": 48,
          "rank": 18
        },
        {
          "symbol": "A1MD34",
          "name": "AMD",
          "sector": "Electronic Technology",
          "m1": -13.26355611601513,
          "m3": 12.491822582755452,
          "score": 45,
          "rank": 19
        },
        {
          "symbol": "TSMC34",
          "name": "TSMC",
          "sector": "Electronic Technology",
          "m1": -6.184447235328072,
          "m3": 7.461119751166412,
          "score": 42,
          "rank": 20
        },
        {
          "symbol": "NIKE34",
          "name": "Nike",
          "sector": "Consumer Non-Durables",
          "m1": 11.312803889789302,
          "m3": -2.4431818181818166,
          "score": 39,
          "rank": 21
        },
        {
          "symbol": "AMZO34",
          "name": "Amazon",
          "sector": "Retail Trade",
          "m1": 1.4067089194620408,
          "m3": -4.470656764234759,
          "score": 36,
          "rank": 22
        },
        {
          "symbol": "C2OI34",
          "name": "Coinbase",
          "sector": "Finance",
          "m1": -19.32729624838292,
          "m3": 4.983164983164978,
          "score": 33,
          "rank": 23
        },
        {
          "symbol": "MELI34",
          "name": "MercadoLibre",
          "sector": "Retail Trade",
          "m1": -0.06743088334458802,
          "m3": -6.047926968429074,
          "score": 30,
          "rank": 24
        },
        {
          "symbol": "NFLX34",
          "name": "Netflix",
          "sector": "Technology Services",
          "m1": -6.9252077562326875,
          "m3": -6.796116504854377,
          "score": 27,
          "rank": 25
        },
        {
          "symbol": "AVGO34",
          "name": "Broadcom",
          "sector": "Electronic Technology",
          "m1": -2.96153846153846,
          "m3": -10.181559273762907,
          "score": 24,
          "rank": 26
        },
        {
          "symbol": "ROXO34",
          "name": "Nu Holdings",
          "sector": "Finance",
          "m1": -3.8356164383561597,
          "m3": -12.614107883817438,
          "score": 21,
          "rank": 27
        },
        {
          "symbol": "BOAC34",
          "name": "Bank of America",
          "sector": "Finance",
          "m1": -3.4918381831085976,
          "m3": -12.956087568813214,
          "score": 18,
          "rank": 28
        },
        {
          "symbol": "PAGS34",
          "name": "PagSeguro",
          "sector": "Commercial Services",
          "m1": -8.244111349036398,
          "m3": -11.649484536082467,
          "score": 15,
          "rank": 29
        },
        {
          "symbol": "BABA34",
          "name": "Alibaba",
          "sector": "Retail Trade",
          "m1": -5.591612581128313,
          "m3": -14.00636653024101,
          "score": 12,
          "rank": 30
        },
        {
          "symbol": "BKNG34",
          "name": "Booking Holdings",
          "sector": "Consumer Services",
          "m1": -3.7422037422037313,
          "m3": -16.425992779783392,
          "score": 9,
          "rank": 31
        },
        {
          "symbol": "GOGL34",
          "name": "Alphabet",
          "sector": "Technology Services",
          "m1": -15.602038789964912,
          "m3": -15.366744108861607,
          "score": 6,
          "rank": 32
        },
        {
          "symbol": "S2GM34",
          "name": "Sigma Lithium",
          "sector": "Non-Energy Minerals",
          "m1": -22.49690976514216,
          "m3": -24.684684684684687,
          "score": 3,
          "rank": 33
        },
        {
          "symbol": "ITLC34",
          "name": "Intel",
          "sector": "Electronic Technology",
          "m1": -43.50830054697246,
          "m3": -22.844036697247706,
          "score": 0,
          "rank": 34
        }
      ]
    }
  },
  "weekly": {
    "stock_ibov": {
      "key": "stock_ibov",
      "label": "Ações Ibovespa",
      "benchmark": "IBOV",
      "items": [
        {
          "symbol": "MGLU3",
          "name": "MAGAZINE LUIZA S.A.",
          "sector": "Retail Trade",
          "m1": 112.15277777777779,
          "m3": 134.09961685823757,
          "score": 100,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 1
        },
        {
          "symbol": "VAMO3",
          "name": "VAMOS LOCAÇÃO DE CAMINHÕES. MÁQUINAS E EQUIP. S.A.",
          "sector": "Finance",
          "m1": 109.78593272171256,
          "m3": 124.18300653594771,
          "score": 99,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 2
        },
        {
          "symbol": "YDUQ3",
          "name": "YDUQS PARTICIPACOES S.A.",
          "sector": "Commercial Services",
          "m1": 46.821392532795166,
          "m3": 62.56983240223466,
          "score": 97,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 3
        },
        {
          "symbol": "FLRY3",
          "name": "FLEURY S.A.",
          "sector": "Health Services",
          "m1": 31.671415004748347,
          "m3": 68.87941534713762,
          "score": 96,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 4
        },
        {
          "symbol": "MRVE3",
          "name": "MRV ENGENHARIA E PARTICIPACOES S.A.",
          "sector": "Consumer Durables",
          "m1": 36.23693379790941,
          "m3": 56.08782435129742,
          "score": 95,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 5
        },
        {
          "symbol": "CYRE3",
          "name": "CYRELA BRAZIL REALTY S.A.EMPREEND E PART",
          "sector": "Finance",
          "m1": 35.65652676164805,
          "m3": 52.77536860364267,
          "score": 93,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 6
        },
        {
          "symbol": "B3SA3",
          "name": "B3 S.A. - BRASIL. BOLSA. BALCÃO",
          "sector": "Finance",
          "m1": 35.12731481481482,
          "m3": 51.426718547341125,
          "score": 92,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 7
        },
        {
          "symbol": "AZZA3",
          "name": "AZZAS 2154 S.A.",
          "sector": "Consumer Non-Durables",
          "m1": 59.46439440048691,
          "m3": 37.17277486910993,
          "score": 91,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 8
        },
        {
          "symbol": "ASAI3",
          "name": "SENDAS DISTRIBUIDORA S.A.",
          "sector": "Retail Trade",
          "m1": 35.13238289205702,
          "m3": 49.60541149943631,
          "score": 89,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 9
        },
        {
          "symbol": "RENT3",
          "name": "LOCALIZA RENT A CAR S.A.",
          "sector": "Finance",
          "m1": 52.26256983240224,
          "m3": 32.62773722627736,
          "score": 88,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 10
        },
        {
          "symbol": "CSAN3",
          "name": "COSAN S.A.",
          "sector": "Utilities",
          "m1": 45.94594594594595,
          "m3": 32.67813267813268,
          "score": 87,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IBOV",
          "rank": 11
        },
        {
          "symbol": "BPAC11",
          "name": "BCO BTG PACTUAL S.A.",
          "sector": "Finance",
          "m1": 34.0019730351858,
          "m3": 38.770645326068454,
          "score": 85,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 12
        },
        {
          "symbol": "TOTS3",
          "name": "TOTVS S.A.",
          "sector": "Technology Services",
          "m1": 28.11171827565272,
          "m3": 41.08993647609496,
          "score": 84,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 13
        },
        {
          "symbol": "COGN3",
          "name": "COGNA EDUCAÇÃO S.A.",
          "sector": "Commercial Services",
          "m1": 36.480686695278976,
          "m3": 32.500000000000014,
          "score": 83,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IBOV",
          "rank": 14
        },
        {
          "symbol": "CEAB3",
          "name": "CEA MODAS S.A.",
          "sector": "Retail Trade",
          "m1": 45.24064171122995,
          "m3": 27.153558052434462,
          "score": 81,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IBOV",
          "rank": 15
        },
        {
          "symbol": "PETR3",
          "name": "PETROLEO BRASILEIRO S.A. PETROBRAS",
          "sector": "Energy Minerals",
          "m1": 15.663976522377107,
          "m3": 42.70196877121522,
          "score": 80,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 16
        },
        {
          "symbol": "ENGI11",
          "name": "ENERGISA S.A.",
          "sector": "Utilities",
          "m1": 33.13311373764773,
          "m3": 31.83039140445126,
          "score": 79,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 17
        },
        {
          "symbol": "PETR4",
          "name": "PETROLEO BRASILEIRO S.A. PETROBRAS",
          "sector": "Energy Minerals",
          "m1": 14.285714285714285,
          "m3": 41.23581336696091,
          "score": 77,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 18
        },
        {
          "symbol": "MOTV3",
          "name": "MOTIVA INFRAESTRUTURA DE MOBILIDADE S.A.",
          "sector": "Transportation",
          "m1": 23.94195888754535,
          "m3": 35.31353135313531,
          "score": 76,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 19
        },
        {
          "symbol": "RAIL3",
          "name": "RUMO S.A.",
          "sector": "Transportation",
          "m1": 27.107215104517877,
          "m3": 31.267409470752106,
          "score": 75,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 20
        },
        {
          "symbol": "SMFT3",
          "name": "SMARTFIT ESCOLA DE GINÁSTICA E DANÇA S.A.",
          "sector": "Consumer Services",
          "m1": 46.282420749279524,
          "m3": 19.886632026452514,
          "score": 73,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 21
        },
        {
          "symbol": "MULT3",
          "name": "MULTIPLAN - EMPREEND IMOBILIARIOS S.A.",
          "sector": "Finance",
          "m1": 29.398071167276342,
          "m3": 28.45823704192802,
          "score": 72,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 22
        },
        {
          "symbol": "VIVA3",
          "name": "VIVARA PARTICIPAÇOES S.A",
          "sector": "Consumer Durables",
          "m1": 31.885356023287066,
          "m3": 25.159371015724595,
          "score": 71,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 23
        },
        {
          "symbol": "IGTI11",
          "name": "IGUATEMI S.A.",
          "sector": "Finance",
          "m1": 27.579593402378205,
          "m3": 25.13167795334838,
          "score": 69,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 24
        },
        {
          "symbol": "EQTL3",
          "name": "EQUATORIAL S.A.",
          "sector": "Utilities",
          "m1": 27.99495586380833,
          "m3": 24.05279882669275,
          "score": 68,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 25
        },
        {
          "symbol": "RDOR3",
          "name": "REDE DOR SÃO LUIZ S.A.",
          "sector": "Health Services",
          "m1": 21.643180005317735,
          "m3": 27.012770682953903,
          "score": 67,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 26
        },
        {
          "symbol": "ALOS3",
          "name": "ALLOS S.A",
          "sector": "Finance",
          "m1": 25.148445686342995,
          "m3": 24.84320557491289,
          "score": 65,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 27
        },
        {
          "symbol": "HYPE3",
          "name": "HYPERA S.A.",
          "sector": "Health Technology",
          "m1": 18.321616871704734,
          "m3": 27.569872098531505,
          "score": 64,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 28
        },
        {
          "symbol": "AURE3",
          "name": "AUREN ENERGIA S.A.",
          "sector": "Utilities",
          "m1": 31.6722972972973,
          "m3": 19.646968534151963,
          "score": 63,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 29
        },
        {
          "symbol": "UGPA3",
          "name": "ULTRAPAR PARTICIPACOES S.A.",
          "sector": "Retail Trade",
          "m1": 2.8143082588111525,
          "m3": 27.28752849234778,
          "score": 61,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 30
        },
        {
          "symbol": "BEEF3",
          "name": "MINERVA S.A.",
          "sector": "Distribution Services",
          "m1": 8.958837772397098,
          "m3": 22.950819672131143,
          "score": 60,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 31
        },
        {
          "symbol": "CSNA3",
          "name": "CIA SIDERURGICA NACIONAL",
          "sector": "Non-Energy Minerals",
          "m1": -0.750750750750748,
          "m3": 27.606177606177617,
          "score": 59,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 32
        },
        {
          "symbol": "MBRF3",
          "name": "MBRF GLOBAL FOODS COMPANY S.A.",
          "sector": "Consumer Non-Durables",
          "m1": 9.713282621416033,
          "m3": 20.578778135048225,
          "score": 57,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 33
        },
        {
          "symbol": "BBAS3",
          "name": "BCO BRASIL S.A.",
          "sector": "Finance",
          "m1": 9.559804357492228,
          "m3": 19.727891156462597,
          "score": 56,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 34
        },
        {
          "symbol": "BBDC3",
          "name": "BCO BRADESCO S.A.",
          "sector": "Finance",
          "m1": 16.54411764705882,
          "m3": 15.552855407047378,
          "score": 55,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 35
        },
        {
          "symbol": "ITUB4",
          "name": "ITAU UNIBANCO HOLDING S.A.",
          "sector": "Finance",
          "m1": 18.113737421015685,
          "m3": 13.92776523702032,
          "score": 53,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 36
        },
        {
          "symbol": "BBDC4",
          "name": "BCO BRADESCO S.A.",
          "sector": "Finance",
          "m1": 16.24529316837009,
          "m3": 14.581124072110288,
          "score": 52,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 37
        },
        {
          "symbol": "ITSA4",
          "name": "ITAUSA S.A.",
          "sector": "Finance",
          "m1": 14.94009866102889,
          "m3": 15.102328863796746,
          "score": 51,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 38
        },
        {
          "symbol": "ENEV3",
          "name": "ENEVA S.A",
          "sector": "Utilities",
          "m1": 14.80263157894737,
          "m3": 14.010889292196005,
          "score": 49,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 39
        },
        {
          "symbol": "SBSP3",
          "name": "CIA SANEAMENTO BASICO EST SAO PAULO",
          "sector": "Utilities",
          "m1": 24.26035502958581,
          "m3": 8.003857280617172,
          "score": 48,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IBOV",
          "rank": 40
        },
        {
          "symbol": "LREN3",
          "name": "LOJAS RENNER S.A.",
          "sector": "Retail Trade",
          "m1": 32.921447484554285,
          "m3": 3.009575923392622,
          "score": 47,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IBOV",
          "rank": 41
        },
        {
          "symbol": "RADL3",
          "name": "RAIA DROGASIL S.A.",
          "sector": "Retail Trade",
          "m1": 9.713701431492854,
          "m3": 14.331379861481095,
          "score": 45,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 42
        },
        {
          "symbol": "CPLE3",
          "name": "CIA PARANAENSE DE ENERGIA - COPEL",
          "sector": "Utilities",
          "m1": 10.58897243107768,
          "m3": 13.650998068254985,
          "score": 44,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 43
        },
        {
          "symbol": "TAEE11",
          "name": "TRANSMISSORA ALIANÇA DE ENERGIA ELÉTRICA S.A.",
          "sector": "Industrial Services",
          "m1": 14.04370243064082,
          "m3": 11.20421355039502,
          "score": 43,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 44
        },
        {
          "symbol": "CPFE3",
          "name": "CPFL ENERGIA S.A.",
          "sector": "Utilities",
          "m1": 15.612648221343871,
          "m3": 9.985377062878632,
          "score": 41,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 45
        },
        {
          "symbol": "PRIO3",
          "name": "PRIO S.A.",
          "sector": "Energy Minerals",
          "m1": 0.4050475151892898,
          "m3": 16.23083859332732,
          "score": 40,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 46
        },
        {
          "symbol": "AXIA3",
          "name": "AXIA ENERGIA S.A.",
          "sector": "Utilities",
          "m1": 9.197080291970815,
          "m3": 10.753285211919309,
          "score": 39,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 47
        },
        {
          "symbol": "BRAV3",
          "name": "BRAVA ENERGIA S.A.",
          "sector": "Energy Minerals",
          "m1": 12.465828321487159,
          "m3": 8.606124604012667,
          "score": 37,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IBOV",
          "rank": 48
        },
        {
          "symbol": "GOAU4",
          "name": "METALURGICA GERDAU S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -0.42992261392949876,
          "m3": 13.418217433888335,
          "score": 36,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 49
        },
        {
          "symbol": "GGBR4",
          "name": "GERDAU S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -1.5708812260536404,
          "m3": 11.647109952194695,
          "score": 35,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 50
        },
        {
          "symbol": "VBBR3",
          "name": "VIBRA ENERGIA S.A.",
          "sector": "Retail Trade",
          "m1": -1.7842876165113037,
          "m3": 11.757575757575765,
          "score": 33,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 51
        },
        {
          "symbol": "WEGE3",
          "name": "WEG S.A.",
          "sector": "Producer Manufacturing",
          "m1": -0.038842493688100846,
          "m3": 10.664373253063859,
          "score": 32,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 52
        },
        {
          "symbol": "CMIG4",
          "name": "CIA ENERGETICA DE MINAS GERAIS - CEMIG",
          "sector": "Utilities",
          "m1": 5.9388646288209745,
          "m3": 6.590509666080843,
          "score": 31,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 53
        },
        {
          "symbol": "CURY3",
          "name": "CURY CONSTRUTORA E INCORPORADORA S.A.",
          "sector": "Finance",
          "m1": 8.485229415461983,
          "m3": 0.9061677871967327,
          "score": 29,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IBOV",
          "rank": 54
        },
        {
          "symbol": "CSMG3",
          "name": "CIA SANEAMENTO DE MINAS GERAIS-COPASA MG",
          "sector": "Utilities",
          "m1": 15.388739946380694,
          "m3": -4.284655300222387,
          "score": 28,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 55
        },
        {
          "symbol": "BBSE3",
          "name": "BB SEGURIDADE PARTICIPAÇÕES S.A.",
          "sector": "Finance",
          "m1": 3.341772151898735,
          "m3": 1.1648079306071841,
          "score": 27,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 56
        },
        {
          "symbol": "ABEV3",
          "name": "AMBEV S.A.",
          "sector": "Consumer Non-Durables",
          "m1": 2.368758002560826,
          "m3": 1.0745891276864725,
          "score": 25,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 57
        },
        {
          "symbol": "DIRR3",
          "name": "DIRECIONAL ENGENHARIA S.A.",
          "sector": "Finance",
          "m1": 17.478510028653293,
          "m3": -7.379518072289147,
          "score": 24,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IBOV",
          "rank": 58
        },
        {
          "symbol": "SANB11",
          "name": "BCO SANTANDER (BRASIL) S.A.",
          "sector": "Finance",
          "m1": -5.845852384062713,
          "m3": 4.380883417813169,
          "score": 23,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IBOV",
          "rank": 59
        },
        {
          "symbol": "EMBJ3",
          "name": "EMBRAER S.A.",
          "sector": "Electronic Technology",
          "m1": -7.974004538890039,
          "m3": 5.449172576832151,
          "score": 21,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IBOV",
          "rank": 60
        },
        {
          "symbol": "HAPV3",
          "name": "HAPVIDA PARTICIPACOES E INVESTIMENTOS SA",
          "sector": "Health Services",
          "m1": 32.09509658246657,
          "m3": -16.132075471698105,
          "score": 20,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IBOV",
          "rank": 61
        },
        {
          "symbol": "ISAE4",
          "name": "ISA ENERGIA BRASIL S.A",
          "sector": "Utilities",
          "m1": 5.772005772005778,
          "m3": -2.2666666666666657,
          "score": 19,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 62
        },
        {
          "symbol": "KLBN11",
          "name": "KLABIN S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -7.2159672466734905,
          "m3": 3.3637400228050165,
          "score": 17,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IBOV",
          "rank": 63
        },
        {
          "symbol": "PSSA3",
          "name": "PORTO SEGURO S.A.",
          "sector": "Finance",
          "m1": 4.914150384843092,
          "m3": -3.2927051118792114,
          "score": 16,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IBOV",
          "rank": 64
        },
        {
          "symbol": "CXSE3",
          "name": "CAIXA SEGURIDADE PARTICIPAÇÕES S.A.",
          "sector": "Finance",
          "m1": 5.297679112008076,
          "m3": -5.351473922902493,
          "score": 15,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IBOV",
          "rank": 65
        },
        {
          "symbol": "SUZB3",
          "name": "SUZANO S.A.",
          "sector": "Process Industries",
          "m1": -10.75088893536917,
          "m3": 2.6955475330926704,
          "score": 13,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IBOV",
          "rank": 66
        },
        {
          "symbol": "EGIE3",
          "name": "ENGIE BRASIL ENERGIA S.A.",
          "sector": "Utilities",
          "m1": 3.1869918699187005,
          "m3": -5.5092316855270935,
          "score": 12,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IBOV",
          "rank": 67
        },
        {
          "symbol": "BRAP4",
          "name": "BRADESPAR S.A.",
          "sector": "Finance",
          "m1": -8.518189884649505,
          "m3": -4.976958525345614,
          "score": 11,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IBOV",
          "rank": 68
        },
        {
          "symbol": "POMO4",
          "name": "MARCOPOLO S.A.",
          "sector": "Producer Manufacturing",
          "m1": 9.777777777777787,
          "m3": -14.97418244406195,
          "score": 9,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IBOV",
          "rank": 69
        },
        {
          "symbol": "USIM5",
          "name": "USINAS SID DE MINAS GERAIS S.A.-USIMINAS",
          "sector": "Non-Energy Minerals",
          "m1": -1.084010840108402,
          "m3": -13.609467455621296,
          "score": 8,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IBOV",
          "rank": 70
        },
        {
          "symbol": "TEND3",
          "name": "CONSTRUTORA TENDA S.A.",
          "sector": "Finance",
          "m1": -3.768296480847091,
          "m3": -12.613122171945705,
          "score": 7,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IBOV",
          "rank": 71
        },
        {
          "symbol": "VIVT3",
          "name": "TELEFÔNICA BRASIL S.A",
          "sector": "Communications",
          "m1": 0.26428807400066684,
          "m3": -15.1048951048951,
          "score": 5,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IBOV",
          "rank": 72
        },
        {
          "symbol": "VALE3",
          "name": "VALE S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -13.171355498721224,
          "m3": -8.465893771906174,
          "score": 4,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IBOV",
          "rank": 73
        },
        {
          "symbol": "CMIN3",
          "name": "CSN MINERAÇÃO S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -25.44642857142857,
          "m3": -4.206500956022956,
          "score": 3,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IBOV",
          "rank": 74
        },
        {
          "symbol": "NATU3",
          "name": "NATURA COSMETICOS S.A.",
          "sector": "Consumer Non-Durables",
          "m1": -10.564225690276109,
          "m3": -14.17050691244239,
          "score": 1,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IBOV",
          "rank": 75
        },
        {
          "symbol": "TIMS3",
          "name": "TIM S.A.",
          "sector": "Communications",
          "m1": -6.556530717604541,
          "m3": -20.54433713784021,
          "score": 0,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IBOV",
          "rank": 76
        }
      ]
    },
    "stock_other": {
      "key": "stock_other",
      "label": "Demais ações",
      "benchmark": "SMLL + B3",
      "items": [
        {
          "symbol": "AZEV3",
          "name": "AZEVEDO E TRAVASSOS S.A.",
          "sector": "Industrial Services",
          "m1": 48.410404624277454,
          "m3": 715.0793650793651,
          "score": 100,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 1
        },
        {
          "symbol": "RCSL3",
          "name": "RECRUSUL S.A.",
          "sector": "Producer Manufacturing",
          "m1": 350,
          "m3": 382.9268292682927,
          "score": 99,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 2
        },
        {
          "symbol": "DOTZ3",
          "name": "DOTZ S.A.",
          "sector": "Technology Services",
          "m1": 28.571428571428577,
          "m3": 232.90816326530614,
          "score": 99,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 3
        },
        {
          "symbol": "LJQQ3",
          "name": "LOJAS QUERO-QUERO S/A",
          "sector": "Retail Trade",
          "m1": 115.44117647058823,
          "m3": 132.53968253968256,
          "score": 98,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 4
        },
        {
          "symbol": "RCSL4",
          "name": "RECRUSUL S.A.",
          "sector": "Producer Manufacturing",
          "m1": 132.5,
          "m3": 116.27906976744187,
          "score": 98,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 5
        },
        {
          "symbol": "JSLG3",
          "name": "JSL S.A.",
          "sector": "Transportation",
          "m1": 115.07537688442211,
          "m3": 123.30434782608694,
          "score": 97,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 6
        },
        {
          "symbol": "MOVI3",
          "name": "MOVIDA PARTICIPACOES SA",
          "sector": "Finance",
          "m1": 137.34335839598998,
          "m3": 109.97782705099782,
          "score": 97,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 7
        },
        {
          "symbol": "SIMH3",
          "name": "SIMPAR S.A.",
          "sector": "Transportation",
          "m1": 127.40447957839265,
          "m3": 111.00244498777509,
          "score": 96,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 8
        },
        {
          "symbol": "TASA3",
          "name": "TAURUS ARMAS S.A.",
          "sector": "Electronic Technology",
          "m1": 82.17821782178217,
          "m3": 106.74157303370787,
          "score": 96,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 9
        },
        {
          "symbol": "DASA3",
          "name": "DIAGNOSTICOS DA AMERICA S.A.",
          "sector": "Health Services",
          "m1": 96.98113207547169,
          "m3": 98.47908745247148,
          "score": 95,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 10
        },
        {
          "symbol": "PTBL3",
          "name": "PBG S/A",
          "sector": "Producer Manufacturing",
          "m1": 100,
          "m3": 87.42857142857142,
          "score": 95,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 11
        },
        {
          "symbol": "ARML3",
          "name": "ARMAC LOCAÇÃO. LOGÍSTICA E SERVIÇOS S.A.",
          "sector": "Finance",
          "m1": 70.97625329815304,
          "m3": 97.56097560975611,
          "score": 94,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 12
        },
        {
          "symbol": "ECOR3",
          "name": "ECORODOVIAS INFRAESTRUTURA E LOGÍSTICA S.A.",
          "sector": "Transportation",
          "m1": 81.20393120393119,
          "m3": 89.83268983268984,
          "score": 94,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 13
        },
        {
          "symbol": "RAPT3",
          "name": "RANDONCORP S.A.",
          "sector": "Producer Manufacturing",
          "m1": 19.90686845168802,
          "m3": 119.14893617021278,
          "score": 93,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 14
        },
        {
          "symbol": "ANIM3",
          "name": "ANIMA HOLDING S.A.",
          "sector": "Consumer Services",
          "m1": 80.54607508532422,
          "m3": 84.3205574912892,
          "score": 93,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 15
        },
        {
          "symbol": "TASA4",
          "name": "TAURUS ARMAS S.A.",
          "sector": "Electronic Technology",
          "m1": 55.88723051409619,
          "m3": 88.75502008032127,
          "score": 92,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 16
        },
        {
          "symbol": "WEST3",
          "name": "WESTWING COMERCIO VAREJISTA S.A.",
          "sector": "Retail Trade",
          "m1": 80.32786885245903,
          "m3": 61.29032258064515,
          "score": 92,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 17
        },
        {
          "symbol": "RAPT4",
          "name": "RANDONCORP S.A.",
          "sector": "Producer Manufacturing",
          "m1": 53.99610136452243,
          "m3": 66.66666666666666,
          "score": 91,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 18
        },
        {
          "symbol": "CSED3",
          "name": "CRUZEIRO DO SUL EDUCACIONAL S.A.",
          "sector": "Consumer Services",
          "m1": 31.273408239700373,
          "m3": 69.73365617433413,
          "score": 91,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 19
        },
        {
          "symbol": "EZTC3",
          "name": "EZ TEC EMPREEND. E PARTICIPACOES S.A.",
          "sector": "Finance",
          "m1": 50.95492742551567,
          "m3": 50.2661596958175,
          "score": 90,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 20
        },
        {
          "symbol": "VVEO3",
          "name": "CM HOSPITALAR S.A.",
          "sector": "Distribution Services",
          "m1": 24.35897435897435,
          "m3": 64.40677966101696,
          "score": 90,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 21
        },
        {
          "symbol": "TRIS3",
          "name": "TRISUL S.A.",
          "sector": "Consumer Durables",
          "m1": 39.55375253549696,
          "m3": 53.914988814317674,
          "score": 89,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 22
        },
        {
          "symbol": "CYRE4",
          "name": "CYRELA BRAZIL REALTY S.A.EMPREEND E PART",
          "sector": "Finance",
          "m1": 35.24193548387096,
          "m3": 55.8550185873606,
          "score": 89,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 23
        },
        {
          "symbol": "QUAL3",
          "name": "QUALICORP CONSULTORIA E CORRETORA DE SEGUROS S.A.",
          "sector": "Health Services",
          "m1": 59.86842105263159,
          "m3": 42.105263157894754,
          "score": 88,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 24
        },
        {
          "symbol": "DXCO3",
          "name": "DEXCO S.A.",
          "sector": "Producer Manufacturing",
          "m1": 38.018018018018026,
          "m3": 53.50701402805611,
          "score": 88,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 25
        },
        {
          "symbol": "PGMN3",
          "name": "EMPREENDIMENTOS PAGUE MENOS S.A.",
          "sector": "Retail Trade",
          "m1": 44.736842105263165,
          "m3": 46.666666666666664,
          "score": 87,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 26
        },
        {
          "symbol": "AUAU3",
          "name": "UNIÃO PET PARTICIPAÇÕES S.A.",
          "sector": "Process Industries",
          "m1": 24.561403508771917,
          "m3": 55.79937304075234,
          "score": 87,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 27
        },
        {
          "symbol": "LAVV3",
          "name": "LAVVI EMPREENDIMENTOS IMOBILIÁRIOS S.A.",
          "sector": "Finance",
          "m1": 49.76744186046513,
          "m3": 41.975308641975325,
          "score": 86,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 28
        },
        {
          "symbol": "VTRU3",
          "name": "VITRU EDUCAÇÃO S.A",
          "sector": "Commercial Services",
          "m1": 37.201365187713314,
          "m3": 48.55875831485589,
          "score": 86,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 29
        },
        {
          "symbol": "INTB3",
          "name": "INTELBRAS S.A. IND DE TELEC ELETRONICA BRASILEIRA",
          "sector": "Technology Services",
          "m1": 31.25414731254148,
          "m3": 49.848484848484865,
          "score": 85,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 30
        },
        {
          "symbol": "LWSA3",
          "name": "LWSA S.A.",
          "sector": "Technology Services",
          "m1": 41.83168316831684,
          "m3": 41.83168316831684,
          "score": 85,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 31
        },
        {
          "symbol": "TGMA3",
          "name": "TEGMA GESTAO LOGISTICA S.A.",
          "sector": "Transportation",
          "m1": 30.230547550432256,
          "m3": 48.018342613822455,
          "score": 84,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 32
        },
        {
          "symbol": "VIVR3",
          "name": "VIVER INCORPORADORA E CONSTRUTORA S.A.",
          "sector": "Consumer Durables",
          "m1": 51.28205128205126,
          "m3": 36.41618497109826,
          "score": 84,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 33
        },
        {
          "symbol": "RENT4",
          "name": "LOCALIZA RENT A CAR S.A.",
          "sector": "Finance",
          "m1": 53.29099307159354,
          "m3": 33.989401968205904,
          "score": 83,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 34
        },
        {
          "symbol": "BMOB3",
          "name": "BEMOBI MOBILE TECH S.A.",
          "sector": "Technology Services",
          "m1": 31.51884278644841,
          "m3": 44.742354419773754,
          "score": 83,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 35
        },
        {
          "symbol": "MATD3",
          "name": "HOSPITAL MATER DEI S/A",
          "sector": "Health Services",
          "m1": 36.99999999999999,
          "m3": 41.52892561983471,
          "score": 82,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 36
        },
        {
          "symbol": "HBRE3",
          "name": "HBR REALTY EMPREENDIMENTOS IMOBILIARIOS S/A",
          "sector": "Finance",
          "m1": 26.591760299625467,
          "m3": 46.956521739130444,
          "score": 82,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 37
        },
        {
          "symbol": "ENGI4",
          "name": "ENERGISA S.A.",
          "sector": "Utilities",
          "m1": 43.78947368421053,
          "m3": 36.6,
          "score": 81,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 38
        },
        {
          "symbol": "GGPS3",
          "name": "GPS PARTICIPACOES E EMPREENDIMENTOS S.A.",
          "sector": "Commercial Services",
          "m1": 36.398467432950184,
          "m3": 38.84555382215289,
          "score": 81,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 39
        },
        {
          "symbol": "JALL3",
          "name": "JALLES MACHADO S.A.",
          "sector": "Process Industries",
          "m1": 21.285140562248987,
          "m3": 46.60194174757281,
          "score": 80,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 40
        },
        {
          "symbol": "SEER3",
          "name": "SER EDUCACIONAL S.A.",
          "sector": "Consumer Services",
          "m1": 26.632801161103046,
          "m3": 43.38537387017255,
          "score": 80,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 41
        },
        {
          "symbol": "ALPK3",
          "name": "ALLPARK EMPREENDIMENTOS PARTICIPACOES SERVICOS S.A",
          "sector": "Consumer Services",
          "m1": 39.08045977011495,
          "m3": 35.65022421524663,
          "score": 79,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 42
        },
        {
          "symbol": "MLAS3",
          "name": "GRUPO MULTI S.A.",
          "sector": "Electronic Technology",
          "m1": 29.18918918918919,
          "m3": 39.76608187134504,
          "score": 79,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 43
        },
        {
          "symbol": "PNVL3",
          "name": "DIMED S.A. DISTRIBUIDORA DE MEDICAMENTOS",
          "sector": "Retail Trade",
          "m1": 24.265842349304474,
          "m3": 42.30088495575219,
          "score": 78,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 44
        },
        {
          "symbol": "AMOB3",
          "name": "AUTOMOB PARTICIPAÇÕES S.A.",
          "sector": "Retail Trade",
          "m1": 44.125105663567204,
          "m3": 31.053036126056888,
          "score": 78,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 45
        },
        {
          "symbol": "BPAC5",
          "name": "BCO BTG PACTUAL S.A.",
          "sector": "Finance",
          "m1": 33.75506072874493,
          "m3": 35.53846153846153,
          "score": 77,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 46
        },
        {
          "symbol": "GMAT3",
          "name": "GRUPO MATEUS S.A.",
          "sector": "Retail Trade",
          "m1": 16.803278688524596,
          "m3": 43.57682619647355,
          "score": 77,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 47
        },
        {
          "symbol": "ONCO3",
          "name": "ONCOCLINICAS DO BRASIL SERVICOS MEDICOS  S.A.",
          "sector": "Health Services",
          "m1": 0,
          "m3": 51.99999999999999,
          "score": 76,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 48
        },
        {
          "symbol": "CAML3",
          "name": "CAMIL ALIMENTOS S.A.",
          "sector": "Process Industries",
          "m1": 34.57943925233646,
          "m3": 32.84132841328414,
          "score": 76,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 49
        },
        {
          "symbol": "POSI3",
          "name": "POSITIVO TECNOLOGIA S.A.",
          "sector": "Electronic Technology",
          "m1": 44.41260744985673,
          "m3": 26.952141057934504,
          "score": 75,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 50
        },
        {
          "symbol": "ALPA4",
          "name": "ALPARGATAS S.A.",
          "sector": "Consumer Non-Durables",
          "m1": 25.056264066016514,
          "m3": 36.86371100164205,
          "score": 75,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 51
        },
        {
          "symbol": "CLSC4",
          "name": "CENTRAIS ELET DE SANTA CATARINA S.A.",
          "sector": "Utilities",
          "m1": 19.52988247061764,
          "m3": 38.05054151624548,
          "score": 74,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 52
        },
        {
          "symbol": "HBOR3",
          "name": "HELBOR EMPREENDIMENTOS S.A.",
          "sector": "Consumer Durables",
          "m1": 26.04651162790698,
          "m3": 34.15841584158416,
          "score": 74,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 53
        },
        {
          "symbol": "SOJA3",
          "name": "BOA SAFRA SEMENTES S.A.",
          "sector": "Process Industries",
          "m1": 12.581063553826196,
          "m3": 40.9090909090909,
          "score": 73,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 54
        },
        {
          "symbol": "RIAA3",
          "name": "RIACHUELO S.A.",
          "sector": "Distribution Services",
          "m1": 51.90409026798307,
          "m3": 17.704918032786875,
          "score": 73,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 55
        },
        {
          "symbol": "ALLD3",
          "name": "ALLIED TECNOLOGIA S.A.",
          "sector": "Technology Services",
          "m1": 22.682445759368825,
          "m3": 33.19057815845824,
          "score": 72,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 56
        },
        {
          "symbol": "FRAS3",
          "name": "FRASLE MOBILITY S.A.",
          "sector": "Producer Manufacturing",
          "m1": 21.233174120712118,
          "m3": 32.95238095238096,
          "score": 72,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 57
        },
        {
          "symbol": "LAND3",
          "name": "TERRA SANTA PROPRIEDADES AGRICOLAS S.A.",
          "sector": "Finance",
          "m1": 16.096579476861166,
          "m3": 35.28722157092614,
          "score": 71,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 58
        },
        {
          "symbol": "BRBI11",
          "name": "BRBI BR PARTNERS S.A.",
          "sector": "Finance",
          "m1": 32.92011019283748,
          "m3": 25.896934116112202,
          "score": 71,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 59
        },
        {
          "symbol": "BMEB4",
          "name": "BCO MERCANTIL DO BRASIL S.A.",
          "sector": "Finance",
          "m1": 29.257493188010912,
          "m3": 27.541589648798535,
          "score": 70,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 60
        },
        {
          "symbol": "ROMI3",
          "name": "ROMI S.A.",
          "sector": "Producer Manufacturing",
          "m1": 30.782029950083206,
          "m3": 26.570048309178752,
          "score": 70,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 61
        },
        {
          "symbol": "BRSR6",
          "name": "BCO ESTADO DO RIO GRANDE DO SUL S.A.",
          "sector": "Finance",
          "m1": 23.413996075866592,
          "m3": 30.227743271221534,
          "score": 69,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 62
        },
        {
          "symbol": "TUPY3",
          "name": "TUPY S.A.",
          "sector": "Producer Manufacturing",
          "m1": 27.819548872180434,
          "m3": 27.659574468085097,
          "score": 69,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 63
        },
        {
          "symbol": "BRST3",
          "name": "BRISANET SERVIÇOS DE TELECOMUNICAÇÕES S.A.",
          "sector": "Communications",
          "m1": 25.964912280701746,
          "m3": 28.21428571428572,
          "score": 68,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 64
        },
        {
          "symbol": "PCAR3",
          "name": "CIA BRASILEIRA DE DISTRIBUICAO",
          "sector": "Retail Trade",
          "m1": 20.538720538720533,
          "m3": 31.135531135531142,
          "score": 68,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 65
        },
        {
          "symbol": "JHSF3",
          "name": "JHSF PARTICIPACOES S.A.",
          "sector": "Finance",
          "m1": 19.983552631578945,
          "m3": 30.852017937219728,
          "score": 67,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 66
        },
        {
          "symbol": "CVCB3",
          "name": "CVC BRASIL OPERADORA E AGÊNCIA DE VIAGENS S.A.",
          "sector": "Consumer Services",
          "m1": 6.832298136645955,
          "m3": 37.6,
          "score": 67,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 67
        },
        {
          "symbol": "PINE4",
          "name": "BCO PINE S.A.",
          "sector": "Finance",
          "m1": 30.125523012552314,
          "m3": 24.69927826784282,
          "score": 66,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 68
        },
        {
          "symbol": "SAPR3",
          "name": "CIA SANEAMENTO DO PARANA - SANEPAR",
          "sector": "Utilities",
          "m1": 34.41558441558441,
          "m3": 21.908127208480558,
          "score": 66,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 69
        },
        {
          "symbol": "BMGB4",
          "name": "BANCO BMG S.A.",
          "sector": "Finance",
          "m1": 14.942528735632187,
          "m3": 31.578947368421044,
          "score": 65,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 70
        },
        {
          "symbol": "PFRM3",
          "name": "PROFARMA DISTRIB PROD FARMACEUTICOS S.A.",
          "sector": "Distribution Services",
          "m1": 13.584905660377347,
          "m3": 30.869565217391287,
          "score": 65,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 71
        },
        {
          "symbol": "MDNE3",
          "name": "MOURA DUBEUX ENGENHARIA S/A",
          "sector": "Finance",
          "m1": 30.119047619047617,
          "m3": 21.354552183567726,
          "score": 64,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 72
        },
        {
          "symbol": "EVEN3",
          "name": "EVEN CONSTRUTORA E INCORPORADORA S.A.",
          "sector": "Finance",
          "m1": 52.57985257985257,
          "m3": 8.376963350785331,
          "score": 64,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 73
        },
        {
          "symbol": "CSUD3",
          "name": "CSU DIGITAL S.A.",
          "sector": "Commercial Services",
          "m1": 24.44761225944406,
          "m3": 23.47949080622348,
          "score": 63,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 74
        },
        {
          "symbol": "IGTI3",
          "name": "IGUATEMI S.A.",
          "sector": "Finance",
          "m1": 28.834355828220872,
          "m3": 20.689655172413797,
          "score": 63,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 75
        },
        {
          "symbol": "BAZA3",
          "name": "BCO AMAZONIA S.A.",
          "sector": "Finance",
          "m1": 11.397849462365595,
          "m3": 29.93311036789299,
          "score": 62,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 76
        },
        {
          "symbol": "TPIS3",
          "name": "TPI - TRIUNFO PARTICIP. E INVEST. S.A.",
          "sector": "Transportation",
          "m1": 15.02347417840375,
          "m3": 27.604166666666675,
          "score": 62,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 77
        },
        {
          "symbol": "SAPR11",
          "name": "CIA SANEAMENTO DO PARANA - SANEPAR",
          "sector": "Utilities",
          "m1": 30.410879629629623,
          "m3": 19.075297225891674,
          "score": 61,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 78
        },
        {
          "symbol": "ALPA3",
          "name": "ALPARGATAS S.A.",
          "sector": "Consumer Non-Durables",
          "m1": 18.200000000000003,
          "m3": 25.344644750795343,
          "score": 61,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 79
        },
        {
          "symbol": "GRND3",
          "name": "GRENDENE S.A.",
          "sector": "Consumer Non-Durables",
          "m1": 25.66844919786096,
          "m3": 20.822622107969153,
          "score": 60,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 80
        },
        {
          "symbol": "SAPR4",
          "name": "CIA SANEAMENTO DO PARANA - SANEPAR",
          "sector": "Utilities",
          "m1": 27.581120943952804,
          "m3": 18.982118294360397,
          "score": 60,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 81
        },
        {
          "symbol": "MEAL3",
          "name": "INTERNATIONAL MEAL COMPANY ALIMENTACAO S.A.",
          "sector": "Consumer Services",
          "m1": 14.444444444444446,
          "m3": 25.609756097560986,
          "score": 59,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 82
        },
        {
          "symbol": "LOGG3",
          "name": "LOG COMMERCIAL PROPERTIES",
          "sector": "Industrial Services",
          "m1": 31.36268343815512,
          "m3": 16.3818722139673,
          "score": 59,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 83
        },
        {
          "symbol": "COCE5",
          "name": "CIA ENERGETICA DO CEARA - COELCE",
          "sector": "Utilities",
          "m1": 19.509043927648577,
          "m3": 22.11221122112211,
          "score": 58,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 84
        },
        {
          "symbol": "MTRE3",
          "name": "MITRE REALTY EMPREENDIMENTOS E PARTICIPAÇÕES S.A.",
          "sector": "Finance",
          "m1": 17.86743515850143,
          "m3": 22.822822822822815,
          "score": 58,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 85
        },
        {
          "symbol": "BLAU3",
          "name": "BLAU FARMACÊUTICA S.A.",
          "sector": "Health Technology",
          "m1": 23.870333988212177,
          "m3": 19.526066350710888,
          "score": 57,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 86
        },
        {
          "symbol": "PINE3",
          "name": "BCO PINE S.A.",
          "sector": "Finance",
          "m1": 30.271790065604502,
          "m3": 15.833333333333336,
          "score": 57,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 87
        },
        {
          "symbol": "PRNR3",
          "name": "PRINER SERVIÇOS INDUSTRIAIS S.A.",
          "sector": "Industrial Services",
          "m1": 25.00000000000002,
          "m3": 17.769671704012506,
          "score": 56,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 88
        },
        {
          "symbol": "IRBR3",
          "name": "IRB - BRASIL RESSEGUROS S.A.",
          "sector": "Finance",
          "m1": 16.1509184180043,
          "m3": 22.4956369982548,
          "score": 56,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 89
        },
        {
          "symbol": "WDCN3",
          "name": "WDC NETWORKS (LIVETECH DA BAHIA S.A.)",
          "sector": "Distribution Services",
          "m1": 8.727272727272736,
          "m3": 26.160337552742618,
          "score": 55,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 90
        },
        {
          "symbol": "HBSA3",
          "name": "HIDROVIAS DO BRASIL S.A.",
          "sector": "Transportation",
          "m1": 21.428571428571434,
          "m3": 18.260869565217387,
          "score": 55,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 91
        },
        {
          "symbol": "AMAR3",
          "name": "MARISA LOJAS S.A.",
          "sector": "Retail Trade",
          "m1": -6.818181818181825,
          "m3": 32.258064516129025,
          "score": 54,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 92
        },
        {
          "symbol": "ABCB4",
          "name": "BCO ABC BRASIL S.A.",
          "sector": "Finance",
          "m1": 17.768924302788832,
          "m3": 18.524458700882107,
          "score": 54,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 93
        },
        {
          "symbol": "RAIZ4",
          "name": "RAIZEN S.A.",
          "sector": "Retail Trade",
          "m1": 35.7142857142857,
          "m3": 8.57142857142858,
          "score": 53,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 94
        },
        {
          "symbol": "SMTO3",
          "name": "SAO MARTINHO S.A.",
          "sector": "Process Industries",
          "m1": 1.2720156555772897,
          "m3": 26.450824679291372,
          "score": 53,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 95
        },
        {
          "symbol": "LPSB3",
          "name": "LPS BRASIL - CONSULTORIA DE IMOVEIS S.A.",
          "sector": "Commercial Services",
          "m1": 28.68217054263565,
          "m3": 11.409395973154357,
          "score": 52,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 96
        },
        {
          "symbol": "EUCA4",
          "name": "EUCATEX S.A. INDUSTRIA E COMERCIO",
          "sector": "Non-Energy Minerals",
          "m1": 24.833808167141505,
          "m3": 13.27014218009478,
          "score": 52,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 97
        },
        {
          "symbol": "VULC3",
          "name": "VULCABRAS S.A.",
          "sector": "Consumer Non-Durables",
          "m1": 25.246398786959816,
          "m3": 12.995896032831741,
          "score": 51,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 98
        },
        {
          "symbol": "AZTE3",
          "name": "AZEVEDO & TRAVASSOS ENERGIA S.A.",
          "sector": "Energy Minerals",
          "m1": -6.962025316455701,
          "m3": 30.08849557522125,
          "score": 51,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 99
        },
        {
          "symbol": "ALUP11",
          "name": "ALUPAR INVESTIMENTO S/A",
          "sector": "Utilities",
          "m1": 17.723770005927673,
          "m3": 16.754850088183407,
          "score": 50,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 100
        },
        {
          "symbol": "SBFG3",
          "name": "GRUPO SBF SA",
          "sector": "Retail Trade",
          "m1": 27.69058295964126,
          "m3": 11.121951219512201,
          "score": 49,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 101
        },
        {
          "symbol": "MDIA3",
          "name": "M.DIAS BRANCO S.A. IND COM DE ALIMENTOS",
          "sector": "Consumer Non-Durables",
          "m1": 20.5968402574605,
          "m3": 14.69115191986645,
          "score": 49,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 102
        },
        {
          "symbol": "ITUB3",
          "name": "ITAU UNIBANCO HOLDING S.A.",
          "sector": "Finance",
          "m1": 16.277074844520687,
          "m3": 16.70253981919931,
          "score": 48,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 103
        },
        {
          "symbol": "VITT3",
          "name": "VITTIA S.A.",
          "sector": "Process Industries",
          "m1": 22.683706070287542,
          "m3": 12.941176470588234,
          "score": 48,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 104
        },
        {
          "symbol": "MELK3",
          "name": "MELNICK DESENVOLVIMENTO IMOBILIÁRIO S.A.",
          "sector": "Industrial Services",
          "m1": 23.050847457627107,
          "m3": 12.732919254658375,
          "score": 47,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 105
        },
        {
          "symbol": "PLPL3",
          "name": "PLANO & PLANO DESENVOLVIMENTO IMOBILIÁRIO S.A.",
          "sector": "Finance",
          "m1": 27.960057061340954,
          "m3": 10.061349693251536,
          "score": 47,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 106
        },
        {
          "symbol": "ALUP3",
          "name": "ALUPAR INVESTIMENTO S/A",
          "sector": "Utilities",
          "m1": 20.25423728813558,
          "m3": 14.067524115755628,
          "score": 46,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 107
        },
        {
          "symbol": "KEPL3",
          "name": "KEPLER WEBER S.A.",
          "sector": "Producer Manufacturing",
          "m1": 15.987933634992466,
          "m3": 16.16314199395771,
          "score": 46,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 108
        },
        {
          "symbol": "SHUL4",
          "name": "SCHULZ S.A.",
          "sector": "Producer Manufacturing",
          "m1": 19.954648526077097,
          "m3": 14.008620689655181,
          "score": 45,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 109
        },
        {
          "symbol": "PASS3",
          "name": "COMPASS GAS E ENERGIA S.A.",
          "sector": "Utilities",
          "m1": 19.670781893004104,
          "m3": 14.039215686274503,
          "score": 45,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 110
        },
        {
          "symbol": "SLCE3",
          "name": "SLC AGRICOLA S.A.",
          "sector": "Process Industries",
          "m1": -1.8952062430323289,
          "m3": 25.53495007132669,
          "score": 44,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 111
        },
        {
          "symbol": "ALUP4",
          "name": "ALUPAR INVESTIMENTO S/A",
          "sector": "Utilities",
          "m1": 14.963503649635024,
          "m3": 16.236162361623617,
          "score": 44,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 112
        },
        {
          "symbol": "RECV3",
          "name": "PETRORECÔNCAVO S.A.",
          "sector": "Energy Minerals",
          "m1": 7.570422535211279,
          "m3": 19.569471624266143,
          "score": 43,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 113
        },
        {
          "symbol": "BPAC3",
          "name": "BCO BTG PACTUAL S.A.",
          "sector": "Finance",
          "m1": 17.98227100042211,
          "m3": 13.849287169042764,
          "score": 43,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 114
        },
        {
          "symbol": "BIOM3",
          "name": "BIOMM S.A.",
          "sector": "Health Technology",
          "m1": 9.552238805970143,
          "m3": 18.38709677419354,
          "score": 42,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 115
        },
        {
          "symbol": "ITSA3",
          "name": "ITAUSA S.A.",
          "sector": "Finance",
          "m1": 14.707952146375792,
          "m3": 15.52090715804395,
          "score": 42,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 116
        },
        {
          "symbol": "LEVE3",
          "name": "MAHLE-METAL LEVE S.A.",
          "sector": "Producer Manufacturing",
          "m1": 15.446153846153857,
          "m3": 15.092024539877306,
          "score": 41,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 117
        },
        {
          "symbol": "ENGI3",
          "name": "ENERGISA S.A.",
          "sector": "Utilities",
          "m1": 15.832649712879407,
          "m3": 14.703493095044667,
          "score": 41,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 118
        },
        {
          "symbol": "TECN3",
          "name": "TECHNOS S.A.",
          "sector": "Consumer Durables",
          "m1": 11.999999999999993,
          "m3": 16.666666666666664,
          "score": 40,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 119
        },
        {
          "symbol": "VSTE3",
          "name": "VESTE S.A. ESTILO",
          "sector": "Consumer Non-Durables",
          "m1": 29.795918367346935,
          "m3": 6.354515050167222,
          "score": 40,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 120
        },
        {
          "symbol": "BMEB3",
          "name": "BCO MERCANTIL DO BRASIL S.A.",
          "sector": "Finance",
          "m1": 15.108759553203999,
          "m3": 14.05825242718447,
          "score": 39,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 121
        },
        {
          "symbol": "VLID3",
          "name": "VALID SOLUÇÕES S.A.",
          "sector": "Commercial Services",
          "m1": 13.560267857142854,
          "m3": 13.687150837988844,
          "score": 39,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 122
        },
        {
          "symbol": "MYPK3",
          "name": "IOCHPE MAXION S.A.",
          "sector": "Producer Manufacturing",
          "m1": 9.08173562058527,
          "m3": 15.987124463519315,
          "score": 38,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 123
        },
        {
          "symbol": "TAEE3",
          "name": "TRANSMISSORA ALIANÇA DE ENERGIA ELÉTRICA S.A.",
          "sector": "Industrial Services",
          "m1": 13.913690476190485,
          "m3": 12.079062957540266,
          "score": 38,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 124
        },
        {
          "symbol": "ISAE3",
          "name": "ISA ENERGIA BRASIL S.A",
          "sector": "Utilities",
          "m1": 11.420612813370466,
          "m3": 12.464854732895978,
          "score": 37,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 125
        },
        {
          "symbol": "HAGA4",
          "name": "HAGA S.A. INDUSTRIA E COMERCIO",
          "sector": "Consumer Durables",
          "m1": 3.2608695652173822,
          "m3": 16.564417177914113,
          "score": 37,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 126
        },
        {
          "symbol": "DEXP3",
          "name": "DEXXOS PARTICIPACOES S.A.",
          "sector": "Process Industries",
          "m1": 9.866666666666669,
          "m3": 12.876712328767129,
          "score": 36,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 127
        },
        {
          "symbol": "AXIA7",
          "name": "AXIA ENERGIA S.A.",
          "sector": "Utilities",
          "m1": 8.912331757002558,
          "m3": 13.301797540208138,
          "score": 36,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 128
        },
        {
          "symbol": "PDTC3",
          "name": "PADTEC HOLDING S.A.",
          "sector": "Electronic Technology",
          "m1": 12.499999999999998,
          "m3": 11.176470588235292,
          "score": 35,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 129
        },
        {
          "symbol": "FESA4",
          "name": "CIA FERRO LIGAS DA BAHIA - FERBASA",
          "sector": "Non-Energy Minerals",
          "m1": 14.186851211072653,
          "m3": 9.999999999999993,
          "score": 35,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 130
        },
        {
          "symbol": "FIQE3",
          "name": "UNIFIQUE TELECOMUNICAÇÕES S.A.",
          "sector": "Communications",
          "m1": 23.260437375745525,
          "m3": 5.0847457627118615,
          "score": 34,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 131
        },
        {
          "symbol": "TAEE4",
          "name": "TRANSMISSORA ALIANÇA DE ENERGIA ELÉTRICA S.A.",
          "sector": "Industrial Services",
          "m1": 12.165097755249816,
          "m3": 10.95988538681948,
          "score": 34,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 132
        },
        {
          "symbol": "NUTR3",
          "name": "NUTRIPLANT INDUSTRIA E COMERCIO S.A.",
          "sector": "Process Industries",
          "m1": 10.13215859030837,
          "m3": 11.607142857142847,
          "score": 33,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 133
        },
        {
          "symbol": "AZEV4",
          "name": "AZEVEDO E TRAVASSOS S.A.",
          "sector": "Industrial Services",
          "m1": 2.962962962962949,
          "m3": 14.876033057851235,
          "score": 33,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 134
        },
        {
          "symbol": "LOGN3",
          "name": "LOG-IN LOGISTICA INTERMODAL S.A.",
          "sector": "Transportation",
          "m1": 10.678571428571423,
          "m3": 10.678571428571423,
          "score": 32,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 135
        },
        {
          "symbol": "RNEW4",
          "name": "RENOVA ENERGIA S.A.",
          "sector": "Utilities",
          "m1": -2.0833333333333353,
          "m3": 17.49999999999999,
          "score": 32,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 136
        },
        {
          "symbol": "WIZC3",
          "name": "WIZ CO PARTICIPAÇÕES E CORRETAGEM DE SEGUROS S.A.",
          "sector": "Finance",
          "m1": 16.624040920716098,
          "m3": 7.168037602820205,
          "score": 31,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 137
        },
        {
          "symbol": "OFSA3",
          "name": "OUROFINO S.A.",
          "sector": "Health Technology",
          "m1": 11.193476649369902,
          "m3": 9.489051094890517,
          "score": 31,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 138
        },
        {
          "symbol": "BEES3",
          "name": "BANESTES S.A. - BCO EST ESPIRITO SANTO",
          "sector": "Finance",
          "m1": 6.976744186046521,
          "m3": 11.290322580645167,
          "score": 30,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 139
        },
        {
          "symbol": "CMIG3",
          "name": "CIA ENERGETICA DE MINAS GERAIS - CEMIG",
          "sector": "Utilities",
          "m1": 5.13992004568817,
          "m3": 11.575757575757576,
          "score": 30,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 140
        },
        {
          "symbol": "GOAU3",
          "name": "METALURGICA GERDAU S.A.",
          "sector": "Non-Energy Minerals",
          "m1": 0.48169556840076044,
          "m3": 13.36956521739131,
          "score": 29,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 141
        },
        {
          "symbol": "BRSR3",
          "name": "BCO ESTADO DO RIO GRANDE DO SUL S.A.",
          "sector": "Finance",
          "m1": 5.51611141452759,
          "m3": 10.400000000000002,
          "score": 29,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 142
        },
        {
          "symbol": "GGBR3",
          "name": "GERDAU S.A.",
          "sector": "Non-Energy Minerals",
          "m1": 0.5041246562786409,
          "m3": 12.924819773429444,
          "score": 28,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 143
        },
        {
          "symbol": "TFCO4",
          "name": "TRACK & FIELD CO S.A.",
          "sector": "Retail Trade",
          "m1": 18.97081413210446,
          "m3": 2.514890800794181,
          "score": 28,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 144
        },
        {
          "symbol": "BMKS3",
          "name": "BICICLETAS MONARK S.A.",
          "sector": "Consumer Durables",
          "m1": 10.193839617631435,
          "m3": 7.232558139534887,
          "score": 27,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 145
        },
        {
          "symbol": "RNEW3",
          "name": "RENOVA ENERGIA S.A.",
          "sector": "Utilities",
          "m1": -2.1276595744680753,
          "m3": 13.580246913580243,
          "score": 27,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 146
        },
        {
          "symbol": "CGRA4",
          "name": "GRAZZIOTIN S.A.",
          "sector": "Retail Trade",
          "m1": 12.160413971539457,
          "m3": 5.731707317073171,
          "score": 26,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 147
        },
        {
          "symbol": "BEES4",
          "name": "BANESTES S.A. - BCO EST ESPIRITO SANTO",
          "sector": "Finance",
          "m1": 5.875831485587596,
          "m3": 8.522727272727272,
          "score": 26,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 148
        },
        {
          "symbol": "CEBR3",
          "name": "CIA ENERGETICA DE BRASILIA",
          "sector": "Utilities",
          "m1": 9.201171058134669,
          "m3": 4.94372990353698,
          "score": 25,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 149
        },
        {
          "symbol": "DESK3",
          "name": "DESKTOP S.A.",
          "sector": "Communications",
          "m1": 0.7253886010362723,
          "m3": 8.542713567839202,
          "score": 25,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 150
        },
        {
          "symbol": "AERI3",
          "name": "AERIS IND. E COM. DE EQUIP. GERACAO DE ENERGIA S/A",
          "sector": "Producer Manufacturing",
          "m1": 2.7522935779816535,
          "m3": 7.177033492822985,
          "score": 24,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 151
        },
        {
          "symbol": "UCAS3",
          "name": "UNICASA INDÚSTRIA DE MÓVEIS S.A.",
          "sector": "Consumer Durables",
          "m1": 9.482758620689664,
          "m3": 3.2520325203252063,
          "score": 24,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 152
        },
        {
          "symbol": "EALT4",
          "name": "ELECTRO ACO ALTONA S.A.",
          "sector": "Producer Manufacturing",
          "m1": 8.771929824561402,
          "m3": 3.161397670549092,
          "score": 23,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 153
        },
        {
          "symbol": "RANI3",
          "name": "IRANI PAPEL E EMBALAGEM S.A.",
          "sector": "Process Industries",
          "m1": 5.408805031446549,
          "m3": 4.619225967540587,
          "score": 23,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 154
        },
        {
          "symbol": "EQPA3",
          "name": "EQUATORIAL PARA DISTRIBUIDORA DE ENERGIA S.A.",
          "sector": "Utilities",
          "m1": 3.102189781021896,
          "m3": 5.214152700186224,
          "score": 22,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 155
        },
        {
          "symbol": "MILS3",
          "name": "MILLS LOCAÇÃO. SERVIÇOS E LOGÍSTICA S.A",
          "sector": "Finance",
          "m1": 2.4050632911392342,
          "m3": 4.792746113989639,
          "score": 22,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 156
        },
        {
          "symbol": "OBTC3",
          "name": "ORANJEBTC S.A. - EDUCAÇÃO E INVESTIMENTO",
          "sector": "Technology Services",
          "m1": -10.400000000000004,
          "m3": 11.258278145695359,
          "score": 21,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 157
        },
        {
          "symbol": "SANB3",
          "name": "BCO SANTANDER (BRASIL) S.A.",
          "sector": "Finance",
          "m1": -6.013071895424836,
          "m3": 8.528301886792459,
          "score": 21,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 158
        },
        {
          "symbol": "CASH3",
          "name": "MÉLIUZ S.A.",
          "sector": "Commercial Services",
          "m1": -3.9999999999999996,
          "m3": 7.0063694267515935,
          "score": 20,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 159
        },
        {
          "symbol": "WHRL4",
          "name": "WHIRLPOOL S.A.",
          "sector": "Consumer Durables",
          "m1": 11.142061281337059,
          "m3": -1.4814814814814719,
          "score": 20,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 160
        },
        {
          "symbol": "CBAV3",
          "name": "COMPANHIA BRASILEIRA DE ALUMÍNIO",
          "sector": "Non-Energy Minerals",
          "m1": 0.08904719501335517,
          "m3": 3.977798334875113,
          "score": 19,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 161
        },
        {
          "symbol": "CEBR5",
          "name": "CIA ENERGETICA DE BRASILIA",
          "sector": "Utilities",
          "m1": 6.4830508474576165,
          "m3": 0.519999999999996,
          "score": 19,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 162
        },
        {
          "symbol": "SAUD3",
          "name": "BRADSAÚDE S.A.",
          "sector": "Health Services",
          "m1": 2.1456436931079326,
          "m3": 1.6828478964401397,
          "score": 18,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 163
        },
        {
          "symbol": "UNIP6",
          "name": "UNIPAR CARBOCLORO S.A.",
          "sector": "Process Industries",
          "m1": 8.2640240665369,
          "m3": -2.6571201272871945,
          "score": 18,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 164
        },
        {
          "symbol": "KLBN3",
          "name": "KLABIN S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -8.33333333333333,
          "m3": 6.250000000000005,
          "score": 17,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 165
        },
        {
          "symbol": "ESPA3",
          "name": "MPM CORPÓREOS S.A.",
          "sector": "Consumer Services",
          "m1": 7.297297297297297,
          "m3": -2.5766871165644165,
          "score": 17,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 166
        },
        {
          "symbol": "AGRO3",
          "name": "BRASILAGRO - CIA BRAS DE PROP AGRICOLAS",
          "sector": "Finance",
          "m1": 1.7599999999999907,
          "m3": 0.3682272488163952,
          "score": 16,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 167
        },
        {
          "symbol": "MNPR3",
          "name": "MINUPAR PARTICIPACOES S.A.",
          "sector": "Process Industries",
          "m1": 1.52284263959391,
          "m3": 0.25062656641603476,
          "score": 16,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 168
        },
        {
          "symbol": "KLBN4",
          "name": "KLABIN S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -5.714285714285719,
          "m3": 4.011461318051566,
          "score": 15,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 169
        },
        {
          "symbol": "CEBR6",
          "name": "CIA ENERGETICA DE BRASILIA",
          "sector": "Utilities",
          "m1": 4.298310066127853,
          "m3": -1.4236111111111116,
          "score": 15,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 170
        },
        {
          "symbol": "UNIP3",
          "name": "UNIPAR CARBOCLORO S.A.",
          "sector": "Process Industries",
          "m1": 5.4905490549054985,
          "m3": -2.251876563803172,
          "score": 14,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 171
        },
        {
          "symbol": "ETER3",
          "name": "ETERNIT S.A.",
          "sector": "Non-Energy Minerals",
          "m1": 0.540540540540541,
          "m3": 0,
          "score": 14,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 172
        },
        {
          "symbol": "SYNE3",
          "name": "SYN PROP E TECH S.A.",
          "sector": "Finance",
          "m1": 10.84010840108401,
          "m3": -5.76036866359447,
          "score": 13,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 173
        },
        {
          "symbol": "SEQL3",
          "name": "SEQUOIA LOGISTICA E TRANSPORTES S.A",
          "sector": "Transportation",
          "m1": 0,
          "m3": 0,
          "score": 13,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 174
        },
        {
          "symbol": "SCAR3",
          "name": "SAO CARLOS EMPREEND E PARTICIPACOES S.A.",
          "sector": "Finance",
          "m1": 0,
          "m3": -0.7692307692307665,
          "score": 12,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 175
        },
        {
          "symbol": "DMVF3",
          "name": "D1000 VAREJO FARMA PARTICIPAÇÕES S.A.",
          "sector": "Distribution Services",
          "m1": 5.345911949685532,
          "m3": -4.69416785206259,
          "score": 12,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 176
        },
        {
          "symbol": "BRAP3",
          "name": "BRADESPAR S.A.",
          "sector": "Finance",
          "m1": -3.5361414456578246,
          "m3": -0.3224073078989722,
          "score": 11,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 177
        },
        {
          "symbol": "PDGR3",
          "name": "PDG REALTY S.A. EMPREEND E PARTICIPACOES",
          "sector": "Finance",
          "m1": 4.347826086956526,
          "m3": -4.761904761904765,
          "score": 11,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 178
        },
        {
          "symbol": "SANB4",
          "name": "BCO SANTANDER (BRASIL) S.A.",
          "sector": "Finance",
          "m1": -5.843729481286937,
          "m3": 0.27972027972027375,
          "score": 10,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 179
        },
        {
          "symbol": "TTEN3",
          "name": "TRÊS TENTOS AGROINDUSTRIAL S/A",
          "sector": "Commercial Services",
          "m1": 18.947368421052634,
          "m3": -13.685550604710379,
          "score": 10,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 180
        },
        {
          "symbol": "GFSA3",
          "name": "GAFISA S.A.",
          "sector": "Finance",
          "m1": 46.66666666666667,
          "m3": -30.158730158730158,
          "score": 9,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 181
        },
        {
          "symbol": "OPCT3",
          "name": "OCEANPACT SERVICOS MARITIMOS S.A.",
          "sector": "Commercial Services",
          "m1": -3.79858657243816,
          "m3": -3.6283185840707977,
          "score": 9,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 182
        },
        {
          "symbol": "TCSA3",
          "name": "TECNISA S.A.",
          "sector": "Finance",
          "m1": 3.1250000000000027,
          "m3": -8.333333333333325,
          "score": 8,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 183
        },
        {
          "symbol": "USIM3",
          "name": "USINAS SID DE MINAS GERAIS S.A.-USIMINAS",
          "sector": "Non-Energy Minerals",
          "m1": 2.18340611353711,
          "m3": -7.8740157480315025,
          "score": 8,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 184
        },
        {
          "symbol": "POMO3",
          "name": "MARCOPOLO S.A.",
          "sector": "Producer Manufacturing",
          "m1": 8.70588235294118,
          "m3": -14.602587800369687,
          "score": 7,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 185
        },
        {
          "symbol": "AALR3",
          "name": "ALLIANÇA SAÚDE E PARTICIPAÇÕES S.A.",
          "sector": "Health Services",
          "m1": -11.403508771929829,
          "m3": -6.7692307692307745,
          "score": 7,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 186
        },
        {
          "symbol": "CAMB3",
          "name": "CAMBUCI S.A.",
          "sector": "Consumer Non-Durables",
          "m1": -2.150537634408599,
          "m3": -13.60759493670887,
          "score": 6,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 187
        },
        {
          "symbol": "BRKM3",
          "name": "BRASKEM S.A.",
          "sector": "Process Industries",
          "m1": 0.6880733944953982,
          "m3": -20.036429872495457,
          "score": 6,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 188
        },
        {
          "symbol": "AZUL3",
          "name": "AZUL S.A.",
          "sector": "Transportation",
          "m1": 3.4817351598173487,
          "m3": -22.85106382978724,
          "score": 5,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 189
        },
        {
          "symbol": "BSLI4",
          "name": "BRB BCO DE BRASILIA S.A.",
          "sector": "Finance",
          "m1": -7.031250000000005,
          "m3": -20.40133779264215,
          "score": 5,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 190
        },
        {
          "symbol": "IFCM3",
          "name": "INFRACOMMERCE CXAAS S.A.",
          "sector": "Distribution Services",
          "m1": -6.586826347305381,
          "m3": -23.902439024390233,
          "score": 4,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 191
        },
        {
          "symbol": "EPAR3",
          "name": "EMBPAR PARTICIPACOES S.A.",
          "sector": "Producer Manufacturing",
          "m1": -6.8702290076335935,
          "m3": -24.691358024691365,
          "score": 4,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 192
        },
        {
          "symbol": "INEP3",
          "name": "INEPAR S.A. INDUSTRIA E CONSTRUCOES",
          "sector": "Producer Manufacturing",
          "m1": -10.958904109589037,
          "m3": -27.77777777777778,
          "score": 3,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 193
        },
        {
          "symbol": "INEP4",
          "name": "INEPAR S.A. INDUSTRIA E CONSTRUCOES",
          "sector": "Producer Manufacturing",
          "m1": -10.563380281690135,
          "m3": -29.05027932960894,
          "score": 3,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 194
        },
        {
          "symbol": "BSLI3",
          "name": "BRB BCO DE BRASILIA S.A.",
          "sector": "Finance",
          "m1": -19.083969465648853,
          "m3": -29.33333333333333,
          "score": 2,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 195
        },
        {
          "symbol": "BRKM5",
          "name": "BRASKEM S.A.",
          "sector": "Process Industries",
          "m1": -17.07779886148007,
          "m3": -34.08748114630467,
          "score": 2,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 196
        },
        {
          "symbol": "ENJU3",
          "name": "ENJOEI S.A.",
          "sector": "Retail Trade",
          "m1": -2.3076923076923075,
          "m3": -18.06451612903226,
          "score": 1,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 197
        },
        {
          "symbol": "LUPA3",
          "name": "LUPATECH S.A.",
          "sector": "Producer Manufacturing",
          "m1": 13.150684931506849,
          "m3": -41,
          "score": 1,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 198
        },
        {
          "symbol": "ORVR3",
          "name": "ORIZON VALORIZACAO DE RESIDUOS S.A.",
          "sector": "Utilities",
          "m1": 26.551724137931043,
          "m3": -71.87739463601534,
          "score": 0,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 199
        }
      ]
    },
    "fii": {
      "key": "fii",
      "label": "FIIs",
      "benchmark": "IFIX",
      "items": [
        {
          "symbol": "JSRE11",
          "name": "JS Real Estate Multigestão",
          "sector": "Lajes corporativas",
          "m1": 16.431300880544942,
          "m3": 18.819938962360126,
          "score": 100,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IFIX",
          "rank": 1
        },
        {
          "symbol": "RBRL11",
          "name": "RBR Logística",
          "sector": "Híbridos",
          "m1": 16.680249932083672,
          "m3": 17.38179830554796,
          "score": 99,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 2
        },
        {
          "symbol": "VGRI11",
          "name": "Valora Gestão de Renda Imobiliária",
          "sector": "Outros",
          "m1": 12.730627306273071,
          "m3": 14.419475655430722,
          "score": 98,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 3
        },
        {
          "symbol": "RBRP11",
          "name": "RBR Properties",
          "sector": "Lajes corporativas",
          "m1": 11.303630363036312,
          "m3": 12.206279891869405,
          "score": 97,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IFIX",
          "rank": 4
        },
        {
          "symbol": "XPLG11",
          "name": "XP Logística",
          "sector": "Logística",
          "m1": 11.565739225313687,
          "m3": 11.687602403058442,
          "score": 96,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IFIX",
          "rank": 5
        },
        {
          "symbol": "KORE11",
          "name": "Kinea Oportunidades Real Estate",
          "sector": "Outros",
          "m1": 10.738461538461545,
          "m3": 12.031128404669268,
          "score": 95,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 6
        },
        {
          "symbol": "TGAR11",
          "name": "TG Ativo Real",
          "sector": "Híbridos",
          "m1": 20.43280182232346,
          "m3": 4.486166007905131,
          "score": 94,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 7
        },
        {
          "symbol": "HSML11",
          "name": "HSI Malls",
          "sector": "Shopping",
          "m1": 12.853873027346104,
          "m3": 7.616312464101102,
          "score": 93,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 8
        },
        {
          "symbol": "FATN11",
          "name": "BR Capital Distribuição",
          "sector": "Outros",
          "m1": 8.937228091982595,
          "m3": 9.687108886107627,
          "score": 92,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IFIX",
          "rank": 9
        },
        {
          "symbol": "URPR11",
          "name": "Urca Prime Renda",
          "sector": "Outros",
          "m1": 10.359187922956785,
          "m3": 7.233181588265047,
          "score": 91,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 10
        },
        {
          "symbol": "VISC11",
          "name": "Vinci Shopping Centers",
          "sector": "Shopping",
          "m1": 8.74749594581704,
          "m3": 7.913669064748201,
          "score": 90,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IFIX",
          "rank": 11
        },
        {
          "symbol": "BRCR11",
          "name": "BTG Pactual Corporate Office",
          "sector": "Lajes corporativas",
          "m1": 6.169604573606488,
          "m3": 9.186673199412052,
          "score": 89,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 12
        },
        {
          "symbol": "PMLL11",
          "name": "Pátria Malls",
          "sector": "Shopping",
          "m1": 7.281553398058252,
          "m3": 7.857491459248411,
          "score": 88,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IFIX",
          "rank": 13
        },
        {
          "symbol": "BPML11",
          "name": "BTG Pactual Shoppings",
          "sector": "Shopping",
          "m1": 7.809768038232881,
          "m3": 7.048611111111098,
          "score": 87,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IFIX",
          "rank": 14
        },
        {
          "symbol": "VILG11",
          "name": "Vinci Logística",
          "sector": "Logística",
          "m1": 8.953301127214159,
          "m3": 6.050156739811904,
          "score": 86,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 15
        },
        {
          "symbol": "VRTA11",
          "name": "Fator Verità",
          "sector": "Papel/CRI",
          "m1": 9.14245216158753,
          "m3": 5.580693815987924,
          "score": 85,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 16
        },
        {
          "symbol": "GARE11",
          "name": "Guardian Real Estate",
          "sector": "Outros",
          "m1": 4.018912529550826,
          "m3": 7.97546012269939,
          "score": 84,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IFIX",
          "rank": 17
        },
        {
          "symbol": "IRIM11",
          "name": "Iridium Recebíveis Imobiliários",
          "sector": "Papel/CRI",
          "m1": 13.266998341625207,
          "m3": 2.9079403344884627,
          "score": 83,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 18
        },
        {
          "symbol": "HGLG11",
          "name": "CSHG Logística",
          "sector": "Logística",
          "m1": 7.9315068493150775,
          "m3": 5.545880776959143,
          "score": 83,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 19
        },
        {
          "symbol": "RCRB11",
          "name": "Rio Bravo Renda Corporativa",
          "sector": "Lajes corporativas",
          "m1": 6.962120077855953,
          "m3": 5.8370370370370335,
          "score": 82,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 20
        },
        {
          "symbol": "KFOF11",
          "name": "Kinea Fundo de Fundos",
          "sector": "Híbridos",
          "m1": 7.491560633601675,
          "m3": 5.196950444726815,
          "score": 81,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 21
        },
        {
          "symbol": "JSAF11",
          "name": "JS Ativos Financeiros",
          "sector": "Híbridos",
          "m1": 9.42857142857143,
          "m3": 4.076086956521737,
          "score": 80,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 22
        },
        {
          "symbol": "BCIA11",
          "name": "Bradesco Carteira Imobiliária Ativa",
          "sector": "Híbridos",
          "m1": 5.284090909090915,
          "m3": 6.274374856618489,
          "score": 79,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 23
        },
        {
          "symbol": "TOPP11",
          "name": "Torre Almirante",
          "sector": "Outros",
          "m1": 7.88939228245586,
          "m3": 4.63636363636364,
          "score": 78,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 24
        },
        {
          "symbol": "XPSF11",
          "name": "XP Seleção FOF",
          "sector": "Híbridos",
          "m1": 2.6275115919629046,
          "m3": 7.443365695792881,
          "score": 77,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IFIX",
          "rank": 25
        },
        {
          "symbol": "BBIG11",
          "name": "BB Renda Imobiliária",
          "sector": "Outros",
          "m1": 13.752455795677804,
          "m3": 1.4010507880910694,
          "score": 76,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 26
        },
        {
          "symbol": "LIFE11",
          "name": "Life Capital Partners",
          "sector": "Lajes corporativas",
          "m1": 5.652173913043473,
          "m3": 5.346820809248556,
          "score": 75,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 27
        },
        {
          "symbol": "KNRI11",
          "name": "Kinea Renda Imobiliária",
          "sector": "Outros",
          "m1": 5.451080050825911,
          "m3": 5.4309851997713166,
          "score": 74,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IFIX",
          "rank": 28
        },
        {
          "symbol": "RPRI11",
          "name": "RBCap Renda Imobiliária",
          "sector": "Papel/CRI",
          "m1": 10.659756268384928,
          "m3": 2.610728666060534,
          "score": 73,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 29
        },
        {
          "symbol": "CPTS11",
          "name": "Capitânia Securities II",
          "sector": "Papel/CRI",
          "m1": 5.73333333333333,
          "m3": 5.172413793103444,
          "score": 72,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 30
        },
        {
          "symbol": "BROF11",
          "name": "BR Properties Corporate Offices",
          "sector": "Outros",
          "m1": 7.326007326007311,
          "m3": 4.304207119741095,
          "score": 71,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IFIX",
          "rank": 31
        },
        {
          "symbol": "HGRE11",
          "name": "CSHG Real Estate",
          "sector": "Lajes corporativas",
          "m1": 11.724865863312516,
          "m3": 1.4617780972921146,
          "score": 70,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 32
        },
        {
          "symbol": "HFOF11",
          "name": "Hedge Top FOFII",
          "sector": "Híbridos",
          "m1": 5.263157894736844,
          "m3": 4.928457869634334,
          "score": 69,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 33
        },
        {
          "symbol": "PCIP11",
          "name": "Polocred Índices de Preços",
          "sector": "Papel/CRI",
          "m1": 10.779023107790241,
          "m3": 1.393110435663638,
          "score": 68,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 34
        },
        {
          "symbol": "HGCR11",
          "name": "CSHG Recebíveis Imobiliários",
          "sector": "Papel/CRI",
          "m1": 2.09139391404371,
          "m3": 5.786109004225798,
          "score": 67,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IFIX",
          "rank": 35
        },
        {
          "symbol": "PSEC11",
          "name": "Pátria Securitizadora",
          "sector": "Papel/CRI",
          "m1": 8.658420551855386,
          "m3": 1.8733273862622735,
          "score": 66,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 36
        },
        {
          "symbol": "DEVA11",
          "name": "Devant Recebíveis Imobiliários",
          "sector": "Papel/CRI",
          "m1": 7.479387514723202,
          "m3": 2.470522178551383,
          "score": 65,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 37
        },
        {
          "symbol": "CPSH11",
          "name": "Capitânia Shopping",
          "sector": "Outros",
          "m1": 6.860706860706863,
          "m3": 2.594810379241515,
          "score": 64,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 38
        },
        {
          "symbol": "VGHF11",
          "name": "Valora Hedge Fund",
          "sector": "Outros",
          "m1": 15.049504950495047,
          "m3": -1.8581081081081134,
          "score": 63,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 39
        },
        {
          "symbol": "ITRI11",
          "name": "Inter Títulos Imobiliários",
          "sector": "Outros",
          "m1": 3.8941398865784542,
          "m3": 4.143506821627086,
          "score": 62,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 40
        },
        {
          "symbol": "VCJR11",
          "name": "Vectis Juros Real",
          "sector": "Papel/CRI",
          "m1": 11.675126903553288,
          "m3": -0.06680026720106501,
          "score": 61,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 41
        },
        {
          "symbol": "RBFM11",
          "name": "Rio Bravo Renda Comercial",
          "sector": "Híbridos",
          "m1": 8.367768595041328,
          "m3": 1.6472868217054255,
          "score": 60,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 42
        },
        {
          "symbol": "KNIP11",
          "name": "Kinea Índices de Preços",
          "sector": "Papel/CRI",
          "m1": 6.224719101123602,
          "m3": 2.727371509290454,
          "score": 59,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 43
        },
        {
          "symbol": "VINO11",
          "name": "Vinci Offices",
          "sector": "Lajes corporativas",
          "m1": 8.816705336426933,
          "m3": 0.8602150537634415,
          "score": 58,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 44
        },
        {
          "symbol": "ALZR11",
          "name": "Alianza Trust Renda Imobiliária",
          "sector": "Outros",
          "m1": 4.6000000000000085,
          "m3": 3.0541871921182313,
          "score": 57,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 45
        },
        {
          "symbol": "HSLG11",
          "name": "HSI Logística",
          "sector": "Logística",
          "m1": 7.871110564506201,
          "m3": 1.1066282420749207,
          "score": 56,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 46
        },
        {
          "symbol": "PORD11",
          "name": "Polo FII Recebíveis Imobiliários",
          "sector": "Outros",
          "m1": 5.224787363304978,
          "m3": 2.3640661938534193,
          "score": 55,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IFIX",
          "rank": 47
        },
        {
          "symbol": "RBRY11",
          "name": "RBR Crédito Imobiliário",
          "sector": "Papel/CRI",
          "m1": 7.612031921424189,
          "m3": 0.8050603795284679,
          "score": 54,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 48
        },
        {
          "symbol": "KCRE11",
          "name": "Kinea Crédito Agro",
          "sector": "Papel/CRI",
          "m1": 7.109004739336489,
          "m3": 0.8928571428571237,
          "score": 53,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 49
        },
        {
          "symbol": "XPML11",
          "name": "XP Malls",
          "sector": "Shopping",
          "m1": 5.280077934729651,
          "m3": 1.8279468576274358,
          "score": 52,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 50
        },
        {
          "symbol": "SNCI11",
          "name": "Suno Recebíveis Imobiliários",
          "sector": "Outros",
          "m1": 7.676220937384665,
          "m3": 0.4936854190585612,
          "score": 51,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 51
        },
        {
          "symbol": "KNHF11",
          "name": "Kinea Hedge Fund",
          "sector": "Papel/CRI",
          "m1": 4.534683326152514,
          "m3": 2.1794061907769984,
          "score": 50,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 52
        },
        {
          "symbol": "BTAL11",
          "name": "BTG Pactual Agro Logística",
          "sector": "Outros",
          "m1": 5.412216488659553,
          "m3": 1.6666666666666639,
          "score": 50,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 53
        },
        {
          "symbol": "BTLG11",
          "name": "BTG Pactual Logística",
          "sector": "Logística",
          "m1": 3.740992991807316,
          "m3": 2.5565964090554156,
          "score": 49,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 54
        },
        {
          "symbol": "BTHF11",
          "name": "BTG Pactual Hedge Fund",
          "sector": "Híbridos",
          "m1": 3.8374717832957095,
          "m3": 1.9955654101995532,
          "score": 48,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 55
        },
        {
          "symbol": "HGRU11",
          "name": "CSHG Renda Urbana",
          "sector": "Outros",
          "m1": 10.217391304347826,
          "m3": -1.8583042973286918,
          "score": 47,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 56
        },
        {
          "symbol": "AFHI11",
          "name": "AF Invest Cri",
          "sector": "Papel/CRI",
          "m1": 2.896566252369918,
          "m3": 1.9515758714255944,
          "score": 46,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 57
        },
        {
          "symbol": "BCRI11",
          "name": "Banestes Recebíveis Imobiliários",
          "sector": "Papel/CRI",
          "m1": 8.837727441515035,
          "m3": -1.313131313131315,
          "score": 45,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 58
        },
        {
          "symbol": "CYCR11",
          "name": "Cyrela Crédito Imobiliário",
          "sector": "Outros",
          "m1": 5.9107358262967455,
          "m3": 0.22831050228310015,
          "score": 44,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 59
        },
        {
          "symbol": "XPCI11",
          "name": "XP Crédito Imobiliário",
          "sector": "Papel/CRI",
          "m1": 6.915029344220466,
          "m3": -0.47505938242280954,
          "score": 43,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 60
        },
        {
          "symbol": "KIVO11",
          "name": "Kilima Vesta",
          "sector": "Papel/CRI",
          "m1": 8.283245679939888,
          "m3": -1.7552828902522175,
          "score": 42,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 61
        },
        {
          "symbol": "GTWR11",
          "name": "Green Towers Brasília",
          "sector": "Lajes corporativas",
          "m1": 4.8133211916222045,
          "m3": -0.03722084367245799,
          "score": 41,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 62
        },
        {
          "symbol": "RBRX11",
          "name": "RBR Plus Multiestratégia",
          "sector": "Híbridos",
          "m1": 10.152990264255903,
          "m3": -2.9411764705882377,
          "score": 40,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 63
        },
        {
          "symbol": "HABT11",
          "name": "Habitat II",
          "sector": "Papel/CRI",
          "m1": 9.43718905472638,
          "m3": -2.5743944636678195,
          "score": 39,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 64
        },
        {
          "symbol": "PVBI11",
          "name": "VBI Prime Properties",
          "sector": "Lajes corporativas",
          "m1": 5.268505079825828,
          "m3": -0.3571919219673102,
          "score": 38,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 65
        },
        {
          "symbol": "HGBS11",
          "name": "Hedge Brasil Shopping",
          "sector": "Shopping",
          "m1": 3.90792291220557,
          "m3": 0.3619441571871783,
          "score": 37,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 66
        },
        {
          "symbol": "ICRI11",
          "name": "Integral Brei CRI",
          "sector": "Papel/CRI",
          "m1": 5.317945236478845,
          "m3": -0.5661788270483935,
          "score": 36,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 67
        },
        {
          "symbol": "HTMX11",
          "name": "Hotel Maxinvest",
          "sector": "Outros",
          "m1": 2.908689248895426,
          "m3": 0.6191950464396384,
          "score": 35,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 68
        },
        {
          "symbol": "RZTR11",
          "name": "Riza Terrax",
          "sector": "Outros",
          "m1": 3.5319300749197273,
          "m3": 0.24179620034543234,
          "score": 34,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 69
        },
        {
          "symbol": "LVBI11",
          "name": "VBI Logística",
          "sector": "Logística",
          "m1": 5.177529929397321,
          "m3": -0.7722753161502047,
          "score": 33,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 70
        },
        {
          "symbol": "KNHY11",
          "name": "Kinea High Yield CRI",
          "sector": "Papel/CRI",
          "m1": 4.610644852863065,
          "m3": -0.6657923938262853,
          "score": 32,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 71
        },
        {
          "symbol": "HSAF11",
          "name": "HSI Ativos Financeiros",
          "sector": "Outros",
          "m1": 3.0099009900990117,
          "m3": 0.07695267410542808,
          "score": 31,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 72
        },
        {
          "symbol": "MANA11",
          "name": "MANA FII",
          "sector": "Outros",
          "m1": 1.0893246187363796,
          "m3": 1.0893246187363796,
          "score": 30,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 73
        },
        {
          "symbol": "SPXS11",
          "name": "Apex SPX Crédito Imobiliário",
          "sector": "Outros",
          "m1": 6.308724832214761,
          "m3": -1.7369727047146473,
          "score": 29,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 74
        },
        {
          "symbol": "RBVA11",
          "name": "Rio Bravo Renda Varejo",
          "sector": "Outros",
          "m1": 3.2295271049596237,
          "m3": -0.11160714285716028,
          "score": 28,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 75
        },
        {
          "symbol": "VGIR11",
          "name": "Valora RE III",
          "sector": "Papel/CRI",
          "m1": 2.6068821689259645,
          "m3": 0.10172939979653903,
          "score": 27,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IFIX",
          "rank": 76
        },
        {
          "symbol": "KNSC11",
          "name": "Kinea Securities",
          "sector": "Papel/CRI",
          "m1": 2.5669642857142705,
          "m3": -0.32537960954448086,
          "score": 26,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IFIX",
          "rank": 77
        },
        {
          "symbol": "TRBL11",
          "name": "TRBL11",
          "sector": "Logística",
          "m1": 13.153627888123214,
          "m3": -6.025921562026592,
          "score": 25,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 78
        },
        {
          "symbol": "RZAK11",
          "name": "Riza Akin",
          "sector": "Papel/CRI",
          "m1": 2.6416052832105645,
          "m3": -1.077111383108947,
          "score": 24,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 79
        },
        {
          "symbol": "RBRR11",
          "name": "RBR Rendimento High Grade",
          "sector": "Papel/CRI",
          "m1": 7.229431056609166,
          "m3": -3.589743589743586,
          "score": 23,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 80
        },
        {
          "symbol": "TEPP11",
          "name": "Tellus Properties",
          "sector": "Lajes corporativas",
          "m1": 3.7383177570093373,
          "m3": -1.8939393939393985,
          "score": 22,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 81
        },
        {
          "symbol": "GGRC11",
          "name": "GGR Covepi Renda Imobiliária",
          "sector": "Logística",
          "m1": 5.116796440489423,
          "m3": -2.7777777777777914,
          "score": 21,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 82
        },
        {
          "symbol": "OUJP11",
          "name": "Ourinvest JPP",
          "sector": "Papel/CRI",
          "m1": 1.6998401859654246,
          "m3": -0.9480684873355054,
          "score": 20,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 83
        },
        {
          "symbol": "MCCI11",
          "name": "Mauá Capital Recebíveis",
          "sector": "Papel/CRI",
          "m1": 0.1796090861066957,
          "m3": -0.2944269190325985,
          "score": 19,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IFIX",
          "rank": 84
        },
        {
          "symbol": "CLIN11",
          "name": "Clave Índices de Preços",
          "sector": "Papel/CRI",
          "m1": 2.1589343132751444,
          "m3": -1.592920353982314,
          "score": 18,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 85
        },
        {
          "symbol": "TVRI11",
          "name": "Tivio Renda Imobiliária",
          "sector": "Outros",
          "m1": 2.981969486823854,
          "m3": -2.516411378555811,
          "score": 17,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 86
        },
        {
          "symbol": "RZAT11",
          "name": "Riza Agro",
          "sector": "Outros",
          "m1": 2.9014844804318467,
          "m3": -2.607770090473659,
          "score": 17,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 87
        },
        {
          "symbol": "MXRF11",
          "name": "Maxi Renda",
          "sector": "Papel/CRI",
          "m1": 3.3916849015317143,
          "m3": -2.9774127310061695,
          "score": 16,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 88
        },
        {
          "symbol": "MCRE11",
          "name": "Mauá Capital Real Estate",
          "sector": "Papel/CRI",
          "m1": 7.816377171215868,
          "m3": -5.44069640914037,
          "score": 15,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 89
        },
        {
          "symbol": "BRCO11",
          "name": "Bresco Logística",
          "sector": "Logística",
          "m1": 1.9445706497046804,
          "m3": -2.443478260869567,
          "score": 14,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 90
        },
        {
          "symbol": "BTCI11",
          "name": "BTG Pactual Crédito Imobiliário",
          "sector": "Papel/CRI",
          "m1": -0.44247787610618533,
          "m3": -2.067464635473335,
          "score": 13,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 91
        },
        {
          "symbol": "KNUQ11",
          "name": "Kinea Unique",
          "sector": "Papel/CRI",
          "m1": 0.2922552362396465,
          "m3": -2.5094696969696892,
          "score": 12,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 92
        },
        {
          "symbol": "RECR11",
          "name": "REC Recebíveis Imobiliários",
          "sector": "Papel/CRI",
          "m1": 3.0687124749833186,
          "m3": -4.037267080745342,
          "score": 11,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 93
        },
        {
          "symbol": "WHGR11",
          "name": "WHG Real Estate",
          "sector": "Outros",
          "m1": 1.2658227848101407,
          "m3": -3.190319031903181,
          "score": 10,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 94
        },
        {
          "symbol": "VGIP11",
          "name": "Valora CRI Índice de Preço",
          "sector": "Papel/CRI",
          "m1": 4.9559918754231695,
          "m3": -5.2908113391984335,
          "score": 9,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 95
        },
        {
          "symbol": "KNCR11",
          "name": "Kinea Rendimentos Imobiliários",
          "sector": "Papel/CRI",
          "m1": -0.8928571428571455,
          "m3": -2.2343778972742414,
          "score": 8,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 96
        },
        {
          "symbol": "AZPL11",
          "name": "AZ Quest Panorama Logística",
          "sector": "Logística",
          "m1": 0.138121546961323,
          "m3": -3.3333333333333335,
          "score": 7,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 97
        },
        {
          "symbol": "SNEL11",
          "name": "Suno Energias Limpas",
          "sector": "Outros",
          "m1": 1.6455696202531518,
          "m3": -4.404761904761916,
          "score": 6,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 98
        },
        {
          "symbol": "VRTM11",
          "name": "Fator Verità Multiestratégia",
          "sector": "Outros",
          "m1": 0.1492537313432804,
          "m3": -4.005722460658086,
          "score": 5,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 99
        },
        {
          "symbol": "GZIT11",
          "name": "Gazit Malls",
          "sector": "Outros",
          "m1": 9.289924221161929,
          "m3": -9.336437718277079,
          "score": 4,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 100
        },
        {
          "symbol": "HCTR11",
          "name": "Hectare CE",
          "sector": "Papel/CRI",
          "m1": 6.084243369734784,
          "m3": -18.121613485851896,
          "score": 3,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 101
        },
        {
          "symbol": "TRXF11",
          "name": "TRX Real Estate",
          "sector": "Outros",
          "m1": -1.412313177019061,
          "m3": -21.07574094401755,
          "score": 2,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 102
        },
        {
          "symbol": "MFII11",
          "name": "Mérito Desenvolvimento Imobiliário",
          "sector": "Outros",
          "m1": 1.5344603381014206,
          "m3": -23.058730784391017,
          "score": 1,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 103
        },
        {
          "symbol": "CACR11",
          "name": "Cartesia Recebíveis Imobiliários",
          "sector": "Papel/CRI",
          "m1": -2.922077922077929,
          "m3": -31.42201834862386,
          "score": 0,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 104
        }
      ]
    },
    "bdr": {
      "key": "bdr",
      "label": "BDRs",
      "benchmark": "Universo BDR",
      "items": [
        {
          "symbol": "P2LT34",
          "name": "Palantir",
          "sector": "Technology Services",
          "m1": 20.40249826509369,
          "m3": 60.351201478743064,
          "score": 100,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "BDRX",
          "rank": 1
        },
        {
          "symbol": "M2ST34",
          "name": "MicroStrategy",
          "sector": "Technology Services",
          "m1": 14.091858037578284,
          "m3": 59.56204379562045,
          "score": 97,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "BDRX",
          "rank": 2
        },
        {
          "symbol": "MSFT34",
          "name": "Microsoft",
          "sector": "Technology Services",
          "m1": 5.017039000378642,
          "m3": 34.897859922178995,
          "score": 94,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "BDRX",
          "rank": 3
        },
        {
          "symbol": "PAGS34",
          "name": "PagSeguro",
          "sector": "Commercial Services",
          "m1": 5.243088655862716,
          "m3": 19.222462203023753,
          "score": 91,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "BDRX",
          "rank": 4
        },
        {
          "symbol": "ROXO34",
          "name": "Nu Holdings",
          "sector": "Finance",
          "m1": 6.666666666666668,
          "m3": 13.698630136986298,
          "score": 88,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "BDRX",
          "rank": 5
        },
        {
          "symbol": "CHVX34",
          "name": "Chevron",
          "sector": "Energy Minerals",
          "m1": -3.768752286864243,
          "m3": 18.57529305680794,
          "score": 85,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "BDRX",
          "rank": 6
        },
        {
          "symbol": "A1MD34",
          "name": "AMD",
          "sector": "Electronic Technology",
          "m1": 14.583333333333337,
          "m3": 5.419594988749685,
          "score": 82,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "BDRX",
          "rank": 7
        },
        {
          "symbol": "DISB34",
          "name": "Walt Disney",
          "sector": "Consumer Services",
          "m1": -0.7468879668049683,
          "m3": 11.3939770257684,
          "score": 79,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "BDRX",
          "rank": 8
        },
        {
          "symbol": "SPCX34",
          "name": "SpaceX / Destiny",
          "sector": "Tecnologia",
          "m1": 3.554868624420408,
          "m3": 7.868786476152151,
          "score": 76,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "BDRX",
          "rank": 9
        },
        {
          "symbol": "M1TA34",
          "name": "Meta Platforms",
          "sector": "Technology Services",
          "m1": 7.378151260504202,
          "m3": 4.310204081632654,
          "score": 73,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "BDRX",
          "rank": 10
        },
        {
          "symbol": "C2OI34",
          "name": "Coinbase",
          "sector": "Finance",
          "m1": -1.7906336088154233,
          "m3": 9.154929577464795,
          "score": 70,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "BDRX",
          "rank": 11
        },
        {
          "symbol": "NVDC34",
          "name": "NVIDIA",
          "sector": "Electronic Technology",
          "m1": 2.1021021021021107,
          "m3": 5.871886120996442,
          "score": 67,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "BDRX",
          "rank": 12
        },
        {
          "symbol": "AMZO34",
          "name": "Amazon",
          "sector": "Retail Trade",
          "m1": -0.8042488619119894,
          "m3": 4.158699808795421,
          "score": 64,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "BDRX",
          "rank": 13
        },
        {
          "symbol": "COCA34",
          "name": "Coca-Cola",
          "sector": "Consumer Non-Durables",
          "m1": -2.2000000000000073,
          "m3": 4.190340909090893,
          "score": 61,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "BDRX",
          "rank": 14
        },
        {
          "symbol": "MUTC34",
          "name": "Micron Technology",
          "sector": "Electronic Technology",
          "m1": 2.108805249859281,
          "m3": 1.3888228299643222,
          "score": 58,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "BDRX",
          "rank": 15
        },
        {
          "symbol": "TSMC34",
          "name": "TSMC",
          "sector": "Electronic Technology",
          "m1": 2.0555355210962816,
          "m3": 1.3319965625895258,
          "score": 55,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "BDRX",
          "rank": 16
        },
        {
          "symbol": "AAPL34",
          "name": "Apple",
          "sector": "Electronic Technology",
          "m1": -1.5882352941176403,
          "m3": 3.271604938271612,
          "score": 52,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "BDRX",
          "rank": 17
        },
        {
          "symbol": "BERK34",
          "name": "Berkshire Hathaway",
          "sector": "Finance",
          "m1": -1.6806077814442464,
          "m3": 1.521394611727418,
          "score": 48,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "BDRX",
          "rank": 18
        },
        {
          "symbol": "LILY34",
          "name": "Eli Lilly",
          "sector": "Health Technology",
          "m1": 2.8644608227484136,
          "m3": -2.843742285855354,
          "score": 45,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "BDRX",
          "rank": 19
        },
        {
          "symbol": "MELI34",
          "name": "MercadoLibre",
          "sector": "Retail Trade",
          "m1": -3.0456226880394563,
          "m3": -1.1937672782106092,
          "score": 42,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "BDRX",
          "rank": 20
        },
        {
          "symbol": "GOGL34",
          "name": "Alphabet",
          "sector": "Technology Services",
          "m1": 1.1460922397127842,
          "m3": -3.8713910761154895,
          "score": 39,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "BDRX",
          "rank": 21
        },
        {
          "symbol": "JNJB34",
          "name": "Johnson & Johnson",
          "sector": "Health Technology",
          "m1": -4.472173144876322,
          "m3": -1.018306636155607,
          "score": 36,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "BDRX",
          "rank": 22
        },
        {
          "symbol": "WALM34",
          "name": "Walmart",
          "sector": "Retail Trade",
          "m1": 1.3973799126637463,
          "m3": -4.260582737768016,
          "score": 33,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "BDRX",
          "rank": 23
        },
        {
          "symbol": "BABA34",
          "name": "Alibaba",
          "sector": "Retail Trade",
          "m1": -1.9470793809286095,
          "m3": -3.6310107948969503,
          "score": 30,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "BDRX",
          "rank": 24
        },
        {
          "symbol": "TSLA34",
          "name": "Tesla",
          "sector": "Consumer Durables",
          "m1": 2.4511484401782644,
          "m3": -8.257866462010748,
          "score": 27,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "BDRX",
          "rank": 25
        },
        {
          "symbol": "ORCL34",
          "name": "Oracle",
          "sector": "Technology Services",
          "m1": -8.348953452046235,
          "m3": -2.976436544026464,
          "score": 24,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "BDRX",
          "rank": 26
        },
        {
          "symbol": "ITLC34",
          "name": "Intel",
          "sector": "Electronic Technology",
          "m1": -1.2698412698412749,
          "m3": -7.361702127659576,
          "score": 21,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "BDRX",
          "rank": 27
        },
        {
          "symbol": "JPMC34",
          "name": "JPMorgan Chase",
          "sector": "Finance",
          "m1": -8.434925864909383,
          "m3": -3.5627530364372446,
          "score": 18,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "BDRX",
          "rank": 28
        },
        {
          "symbol": "NFLX34",
          "name": "Netflix",
          "sector": "Technology Services",
          "m1": -11.194968553459127,
          "m3": -5.8666666666666725,
          "score": 15,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "BDRX",
          "rank": 29
        },
        {
          "symbol": "AVGO34",
          "name": "Broadcom",
          "sector": "Electronic Technology",
          "m1": -3.3707865168539275,
          "m3": -11.065149948293694,
          "score": 12,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "BDRX",
          "rank": 30
        },
        {
          "symbol": "BKNG34",
          "name": "Booking Holdings",
          "sector": "Consumer Services",
          "m1": -9.842519685039369,
          "m3": -11.923076923076925,
          "score": 9,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "BDRX",
          "rank": 31
        },
        {
          "symbol": "BOAC34",
          "name": "Bank of America",
          "sector": "Finance",
          "m1": -15.770430442919526,
          "m3": -12.027625749283281,
          "score": 6,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "BDRX",
          "rank": 32
        },
        {
          "symbol": "S2GM34",
          "name": "Sigma Lithium",
          "sector": "Non-Energy Minerals",
          "m1": -4.993909866017064,
          "m3": -23.491907797940172,
          "score": 3,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "BDRX",
          "rank": 33
        },
        {
          "symbol": "NIKE34",
          "name": "Nike",
          "sector": "Consumer Non-Durables",
          "m1": -6.819392647842308,
          "m3": -22.95154185022027,
          "score": 0,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "BDRX",
          "rank": 34
        }
      ]
    }
  },
  "nasdaq": {
    "daily": {
      "displayDate": "01/10/2026 20:15",
      "baseDate": "2026-10-01",
      "source": "Twelve Data",
      "ranking": [
        {
          "symbol": "MRNA",
          "name": "Moderna Inc.",
          "sector": "Saúde",
          "m1": 22.47,
          "m3": 136.89,
          "score": 100,
          "trendState": "BULLISH",
          "rank": 1
        },
        {
          "symbol": "TEAM",
          "name": "Atlassian Corporation",
          "sector": "Tecnologia",
          "m1": 1.54,
          "m3": 126.51,
          "score": 99,
          "trendState": "BULLISH",
          "rank": 2
        },
        {
          "symbol": "MSTR",
          "name": "MicroStrategy Incorporated",
          "sector": "Tecnologia",
          "m1": 28.52,
          "m3": 59.27,
          "score": 98,
          "trendState": "BULLISH",
          "rank": 3
        },
        {
          "symbol": "SMCI",
          "name": "Super Micro Computer Inc.",
          "sector": "Tecnologia",
          "m1": 14.19,
          "m3": 54,
          "score": 97,
          "trendState": "BULLISH",
          "rank": 4
        },
        {
          "symbol": "ILMN",
          "name": "Illumina Inc.",
          "sector": "Saúde",
          "m1": 28.29,
          "m3": 40.83,
          "score": 96,
          "trendState": "BULLISH",
          "rank": 5
        },
        {
          "symbol": "PLTR",
          "name": "Palantir Technologies Inc.",
          "sector": "Tecnologia",
          "m1": 5.62,
          "m3": 46.98,
          "score": 95,
          "trendState": "BULLISH",
          "rank": 6
        },
        {
          "symbol": "CRWD",
          "name": "CrowdStrike Holdings Inc.",
          "sector": "Tecnologia",
          "m1": 23.72,
          "m3": 37.17,
          "score": 94,
          "trendState": "BULLISH",
          "rank": 7
        },
        {
          "symbol": "ZS",
          "name": "Zscaler Inc.",
          "sector": "Tecnologia",
          "m1": 11.44,
          "m3": 34.92,
          "score": 93,
          "trendState": "BULLISH",
          "rank": 8
        },
        {
          "symbol": "META",
          "name": "Meta Platforms Inc.",
          "sector": "Comunicação",
          "m1": 25.48,
          "m3": 24.54,
          "score": 92,
          "trendState": "BULLISH",
          "rank": 9
        },
        {
          "symbol": "AMD",
          "name": "Advanced Micro Devices Inc.",
          "sector": "Tecnologia",
          "m1": 33.97,
          "m3": 18.91,
          "score": 91,
          "trendState": "BULLISH",
          "rank": 10
        },
        {
          "symbol": "WDAY",
          "name": "Workday Inc.",
          "sector": "Tecnologia",
          "m1": -5.86,
          "m3": 37.92,
          "score": 90,
          "trendState": "NEUTRAL",
          "rank": 11
        },
        {
          "symbol": "MSFT",
          "name": "Microsoft Corporation",
          "sector": "Tecnologia",
          "m1": 2.35,
          "m3": 31.32,
          "score": 89,
          "trendState": "BULLISH",
          "rank": 12
        },
        {
          "symbol": "TER",
          "name": "Teradyne Inc.",
          "sector": "Tecnologia",
          "m1": 23.95,
          "m3": 12.65,
          "score": 88,
          "trendState": "BULLISH",
          "rank": 13
        },
        {
          "symbol": "SNPS",
          "name": "Synopsys Inc.",
          "sector": "Tecnologia",
          "m1": 18.25,
          "m3": 12.21,
          "score": 87,
          "trendState": "BULLISH",
          "rank": 14
        },
        {
          "symbol": "MU",
          "name": "Micron Technology Inc.",
          "sector": "Tecnologia",
          "m1": 17.56,
          "m3": 12.49,
          "score": 86,
          "trendState": "BULLISH",
          "rank": 15
        },
        {
          "symbol": "WBD",
          "name": "Warner Bros. Discovery Inc.",
          "sector": "Comunicação",
          "m1": 9.29,
          "m3": 16.88,
          "score": 85,
          "trendState": "BULLISH",
          "rank": 16
        },
        {
          "symbol": "NVDA",
          "name": "NVIDIA Corporation",
          "sector": "Tecnologia",
          "m1": 6.17,
          "m3": 18.49,
          "score": 84,
          "trendState": "BULLISH",
          "rank": 17
        },
        {
          "symbol": "FTNT",
          "name": "Fortinet Inc.",
          "sector": "Tecnologia",
          "m1": 10.42,
          "m3": 14.38,
          "score": 83,
          "trendState": "BULLISH",
          "rank": 18
        },
        {
          "symbol": "PANW",
          "name": "Palo Alto Networks Inc.",
          "sector": "Tecnologia",
          "m1": 9.43,
          "m3": 13.85,
          "score": 82,
          "trendState": "BULLISH",
          "rank": 19
        },
        {
          "symbol": "DDOG",
          "name": "Datadog Inc.",
          "sector": "Tecnologia",
          "m1": 23.51,
          "m3": 6.18,
          "score": 81,
          "trendState": "BULLISH",
          "rank": 20
        },
        {
          "symbol": "DXCM",
          "name": "DexCom Inc.",
          "sector": "Saúde",
          "m1": -4.34,
          "m3": 21.02,
          "score": 80,
          "trendState": "NEUTRAL",
          "rank": 21
        },
        {
          "symbol": "ADI",
          "name": "Analog Devices Inc.",
          "sector": "Tecnologia",
          "m1": 14.13,
          "m3": 7.28,
          "score": 78,
          "trendState": "BULLISH",
          "rank": 22
        },
        {
          "symbol": "MPWR",
          "name": "Monolithic Power Systems Inc.",
          "sector": "Tecnologia",
          "m1": 11.01,
          "m3": 5.65,
          "score": 77,
          "trendState": "NEUTRAL",
          "rank": 23
        },
        {
          "symbol": "GILD",
          "name": "Gilead Sciences Inc.",
          "sector": "Saúde",
          "m1": -1.61,
          "m3": 12.36,
          "score": 76,
          "trendState": "NEUTRAL",
          "rank": 24
        },
        {
          "symbol": "ROST",
          "name": "Ross Stores Inc.",
          "sector": "Consumo Discricionário",
          "m1": 2.12,
          "m3": 9.68,
          "score": 75,
          "trendState": "NEUTRAL",
          "rank": 25
        },
        {
          "symbol": "QCOM",
          "name": "QUALCOMM Incorporated",
          "sector": "Tecnologia",
          "m1": 9.29,
          "m3": 3.31,
          "score": 74,
          "trendState": "NEUTRAL",
          "rank": 26
        },
        {
          "symbol": "AAPL",
          "name": "Apple Inc.",
          "sector": "Tecnologia",
          "m1": 1.6,
          "m3": 7.03,
          "score": 73,
          "trendState": "NEUTRAL",
          "rank": 27
        },
        {
          "symbol": "ASML",
          "name": "ASML Holding N.V.",
          "sector": "Tecnologia",
          "m1": 8.61,
          "m3": 2.21,
          "score": 72,
          "trendState": "BULLISH",
          "rank": 28
        },
        {
          "symbol": "LRCX",
          "name": "Lam Research Corporation",
          "sector": "Tecnologia",
          "m1": 17.2,
          "m3": -3.22,
          "score": 69,
          "trendState": "BULLISH",
          "rank": 29
        },
        {
          "symbol": "ARM",
          "name": "Arm Holdings plc",
          "sector": "Tecnologia",
          "m1": 24.5,
          "m3": -7.28,
          "score": 68,
          "trendState": "BULLISH",
          "rank": 30
        },
        {
          "symbol": "FAST",
          "name": "Fastenal Company",
          "sector": "Industriais",
          "m1": 3.03,
          "m3": 3.34,
          "score": 65,
          "trendState": "BULLISH",
          "rank": 31
        },
        {
          "symbol": "BIIB",
          "name": "Biogen Inc.",
          "sector": "Saúde",
          "m1": 3.14,
          "m3": 3.1,
          "score": 64,
          "trendState": "BULLISH",
          "rank": 32
        },
        {
          "symbol": "TXN",
          "name": "Texas Instruments Incorporated",
          "sector": "Tecnologia",
          "m1": 11.04,
          "m3": -4.02,
          "score": 61,
          "trendState": "BULLISH",
          "rank": 33
        },
        {
          "symbol": "CDNS",
          "name": "Cadence Design Systems Inc.",
          "sector": "Tecnologia",
          "m1": 12.04,
          "m3": -6.01,
          "score": 58,
          "trendState": "NEUTRAL",
          "rank": 34
        },
        {
          "symbol": "ISRG",
          "name": "Intuitive Surgical Inc.",
          "sector": "Saúde",
          "m1": 8.66,
          "m3": -5.81,
          "score": 57,
          "trendState": "NEUTRAL",
          "rank": 35
        },
        {
          "symbol": "AMAT",
          "name": "Applied Materials Inc.",
          "sector": "Tecnologia",
          "m1": 19.79,
          "m3": -12.23,
          "score": 56,
          "trendState": "NEUTRAL",
          "rank": 36
        },
        {
          "symbol": "MAR",
          "name": "Marriott International Inc.",
          "sector": "Consumo Discricionário",
          "m1": 6.05,
          "m3": -4.87,
          "score": 55,
          "trendState": "NEUTRAL",
          "rank": 37
        },
        {
          "symbol": "MCHP",
          "name": "Microchip Technology Inc.",
          "sector": "Tecnologia",
          "m1": 9.93,
          "m3": -7.25,
          "score": 54,
          "trendState": "NEUTRAL",
          "rank": 38
        },
        {
          "symbol": "CSCO",
          "name": "Cisco Systems Inc.",
          "sector": "Tecnologia",
          "m1": -0.89,
          "m3": -3.49,
          "score": 52,
          "trendState": "NEUTRAL",
          "rank": 39
        },
        {
          "symbol": "COST",
          "name": "Costco Wholesale Corporation",
          "sector": "Consumo Básico",
          "m1": -2.66,
          "m3": -3.86,
          "score": 51,
          "trendState": "NEUTRAL",
          "rank": 40
        },
        {
          "symbol": "KLAC",
          "name": "KLA Corporation",
          "sector": "Tecnologia",
          "m1": 17.23,
          "m3": -14.95,
          "score": 47,
          "trendState": "NEUTRAL",
          "rank": 41
        },
        {
          "symbol": "HON",
          "name": "Honeywell International Inc.",
          "sector": "Industriais",
          "m1": 1.82,
          "m3": -6.99,
          "score": 46,
          "trendState": "NEUTRAL",
          "rank": 42
        },
        {
          "symbol": "ON",
          "name": "ON Semiconductor Corporation",
          "sector": "Tecnologia",
          "m1": 10.23,
          "m3": -12.21,
          "score": 43,
          "trendState": "NEUTRAL",
          "rank": 43
        },
        {
          "symbol": "PYPL",
          "name": "PayPal Holdings Inc.",
          "sector": "Tecnologia",
          "m1": 1.26,
          "m3": 16.69,
          "score": 79,
          "trendState": "BEARISH",
          "rank": 44
        },
        {
          "symbol": "CTAS",
          "name": "Cintas Corporation",
          "sector": "Industriais",
          "m1": -2.49,
          "m3": 7.85,
          "score": 71,
          "trendState": "BEARISH",
          "rank": 45
        },
        {
          "symbol": "REGN",
          "name": "Regeneron Pharmaceuticals Inc.",
          "sector": "Saúde",
          "m1": -10.8,
          "m3": 12.31,
          "score": 70,
          "trendState": "BEARISH",
          "rank": 46
        },
        {
          "symbol": "ADP",
          "name": "Automatic Data Processing Inc.",
          "sector": "Industriais",
          "m1": -6.89,
          "m3": 8.95,
          "score": 67,
          "trendState": "BEARISH",
          "rank": 47
        },
        {
          "symbol": "AMGN",
          "name": "Amgen Inc.",
          "sector": "Saúde",
          "m1": -7.04,
          "m3": 8.85,
          "score": 66,
          "trendState": "BEARISH",
          "rank": 48
        },
        {
          "symbol": "CEG",
          "name": "Constellation Energy Corporation",
          "sector": "Utilities",
          "m1": -7.63,
          "m3": 8.22,
          "score": 63,
          "trendState": "BEARISH",
          "rank": 49
        },
        {
          "symbol": "FANG",
          "name": "Diamondback Energy Inc.",
          "sector": "Energia",
          "m1": -8.69,
          "m3": 7.83,
          "score": 62,
          "trendState": "BEARISH",
          "rank": 50
        },
        {
          "symbol": "ABNB",
          "name": "Airbnb Inc.",
          "sector": "Consumo Discricionário",
          "m1": -12.09,
          "m3": 7.75,
          "score": 60,
          "trendState": "BEARISH",
          "rank": 51
        },
        {
          "symbol": "AMZN",
          "name": "Amazon.com Inc.",
          "sector": "Consumo Discricionário",
          "m1": -2.62,
          "m3": 2.29,
          "score": 59,
          "trendState": "BEARISH",
          "rank": 52
        },
        {
          "symbol": "CDW",
          "name": "CDW Corporation",
          "sector": "Tecnologia",
          "m1": -9.63,
          "m3": 1.84,
          "score": 53,
          "trendState": "BEARISH",
          "rank": 53
        },
        {
          "symbol": "GOOG",
          "name": "Alphabet Inc. (Class C)",
          "sector": "Comunicação",
          "m1": 0.87,
          "m3": -5.97,
          "score": 49,
          "trendState": "BEARISH",
          "rank": 54
        },
        {
          "symbol": "GOOGL",
          "name": "Alphabet Inc. (Class A)",
          "sector": "Comunicação",
          "m1": 0.96,
          "m3": -6.02,
          "score": 48,
          "trendState": "BEARISH",
          "rank": 55
        },
        {
          "symbol": "ADSK",
          "name": "Autodesk Inc.",
          "sector": "Tecnologia",
          "m1": -14.69,
          "m3": 1.85,
          "score": 45,
          "trendState": "BEARISH",
          "rank": 56
        },
        {
          "symbol": "BMRN",
          "name": "BioMarin Pharmaceutical Inc.",
          "sector": "Saúde",
          "m1": -9.87,
          "m3": -0.93,
          "score": 44,
          "trendState": "BEARISH",
          "rank": 57
        },
        {
          "symbol": "INTU",
          "name": "Intuit Inc.",
          "sector": "Tecnologia",
          "m1": -18.02,
          "m3": 2.7,
          "score": 42,
          "trendState": "BEARISH",
          "rank": 58
        },
        {
          "symbol": "CSX",
          "name": "CSX Corporation",
          "sector": "Industriais",
          "m1": -4.44,
          "m3": -4.81,
          "score": 41,
          "trendState": "BEARISH",
          "rank": 59
        },
        {
          "symbol": "GEHC",
          "name": "GE HealthCare Technologies Inc.",
          "sector": "Saúde",
          "m1": -9.15,
          "m3": -2.42,
          "score": 40,
          "trendState": "BEARISH",
          "rank": 60
        },
        {
          "symbol": "VRTX",
          "name": "Vertex Pharmaceuticals Inc.",
          "sector": "Saúde",
          "m1": -7.47,
          "m3": -4.03,
          "score": 37,
          "trendState": "NEUTRAL",
          "rank": 61
        },
        {
          "symbol": "NXPI",
          "name": "NXP Semiconductors N.V.",
          "sector": "Tecnologia",
          "m1": 7.55,
          "m3": -12.5,
          "score": 36,
          "trendState": "NEUTRAL",
          "rank": 62
        },
        {
          "symbol": "KDP",
          "name": "Keurig Dr Pepper Inc.",
          "sector": "Consumo Básico",
          "m1": -3.76,
          "m3": -7.84,
          "score": 32,
          "trendState": "NEUTRAL",
          "rank": 63
        },
        {
          "symbol": "TSLA",
          "name": "Tesla Inc.",
          "sector": "Consumo Discricionário",
          "m1": -0.56,
          "m3": -10,
          "score": 30,
          "trendState": "NEUTRAL",
          "rank": 64
        },
        {
          "symbol": "ORLY",
          "name": "O'Reilly Automotive Inc.",
          "sector": "Consumo Discricionário",
          "m1": -3.32,
          "m3": -5.78,
          "score": 39,
          "trendState": "BEARISH",
          "rank": 65
        },
        {
          "symbol": "ROP",
          "name": "Roper Technologies Inc.",
          "sector": "Tecnologia",
          "m1": -13.32,
          "m3": -0.44,
          "score": 38,
          "trendState": "BEARISH",
          "rank": 66
        },
        {
          "symbol": "AVGO",
          "name": "Broadcom Inc.",
          "sector": "Tecnologia",
          "m1": -7.04,
          "m3": -4.66,
          "score": 35,
          "trendState": "BEARISH",
          "rank": 67
        },
        {
          "symbol": "MDLZ",
          "name": "Mondelez International Inc.",
          "sector": "Consumo Básico",
          "m1": -6.25,
          "m3": -5.17,
          "score": 34,
          "trendState": "BEARISH",
          "rank": 68
        },
        {
          "symbol": "CCEP",
          "name": "Coca-Cola Europacific Partners plc",
          "sector": "Consumo Básico",
          "m1": -6.33,
          "m3": -5.46,
          "score": 33,
          "trendState": "BEARISH",
          "rank": 69
        },
        {
          "symbol": "IDXX",
          "name": "IDEXX Laboratories Inc.",
          "sector": "Saúde",
          "m1": -5.03,
          "m3": -7.18,
          "score": 31,
          "trendState": "BEARISH",
          "rank": 70
        },
        {
          "symbol": "MDB",
          "name": "MongoDB Inc.",
          "sector": "Tecnologia",
          "m1": -19,
          "m3": -0.89,
          "score": 29,
          "trendState": "BEARISH",
          "rank": 71
        },
        {
          "symbol": "PDD",
          "name": "PDD Holdings Inc.",
          "sector": "Consumo Discricionário",
          "m1": -8.02,
          "m3": -7.15,
          "score": 28,
          "trendState": "BEARISH",
          "rank": 72
        },
        {
          "symbol": "MELI",
          "name": "MercadoLibre Inc.",
          "sector": "Consumo Discricionário",
          "m1": -14.18,
          "m3": -4.44,
          "score": 27,
          "trendState": "BEARISH",
          "rank": 73
        },
        {
          "symbol": "PCAR",
          "name": "PACCAR Inc.",
          "sector": "Industriais",
          "m1": -10.22,
          "m3": -8,
          "score": 26,
          "trendState": "BEARISH",
          "rank": 74
        },
        {
          "symbol": "SBUX",
          "name": "Starbucks Corporation",
          "sector": "Consumo Discricionário",
          "m1": -10.62,
          "m3": -9.01,
          "score": 25,
          "trendState": "BEARISH",
          "rank": 75
        },
        {
          "symbol": "DLTR",
          "name": "Dollar Tree Inc.",
          "sector": "Consumo Básico",
          "m1": -13.12,
          "m3": -7.75,
          "score": 24,
          "trendState": "BEARISH",
          "rank": 76
        },
        {
          "symbol": "TMUS",
          "name": "T-Mobile US Inc.",
          "sector": "Comunicação",
          "m1": -11.22,
          "m3": -8.89,
          "score": 23,
          "trendState": "BEARISH",
          "rank": 77
        },
        {
          "symbol": "DASH",
          "name": "DoorDash Inc.",
          "sector": "Consumo Discricionário",
          "m1": -19.27,
          "m3": -5.12,
          "score": 22,
          "trendState": "BEARISH",
          "rank": 78
        },
        {
          "symbol": "PAYX",
          "name": "Paychex Inc.",
          "sector": "Industriais",
          "m1": -19.74,
          "m3": -5.18,
          "score": 21,
          "trendState": "BEARISH",
          "rank": 79
        },
        {
          "symbol": "LIN",
          "name": "Linde plc",
          "sector": "Materiais Básicos",
          "m1": -3.56,
          "m3": -14.12,
          "score": 20,
          "trendState": "BEARISH",
          "rank": 80
        },
        {
          "symbol": "MNST",
          "name": "Monster Beverage Corporation",
          "sector": "Consumo Básico",
          "m1": -6.33,
          "m3": -13.43,
          "score": 19,
          "trendState": "BEARISH",
          "rank": 81
        },
        {
          "symbol": "CPRT",
          "name": "Copart Inc.",
          "sector": "Industriais",
          "m1": -15.95,
          "m3": -9.06,
          "score": 18,
          "trendState": "BEARISH",
          "rank": 82
        },
        {
          "symbol": "VRSK",
          "name": "Verisk Analytics Inc.",
          "sector": "Industriais",
          "m1": -13.36,
          "m3": -10.6,
          "score": 17,
          "trendState": "BEARISH",
          "rank": 83
        },
        {
          "symbol": "CMCSA",
          "name": "Comcast Corporation",
          "sector": "Comunicação",
          "m1": -17.49,
          "m3": -8.79,
          "score": 16,
          "trendState": "BEARISH",
          "rank": 84
        },
        {
          "symbol": "PEP",
          "name": "PepsiCo Inc.",
          "sector": "Consumo Básico",
          "m1": -10.15,
          "m3": -12.91,
          "score": 15,
          "trendState": "BEARISH",
          "rank": 85
        },
        {
          "symbol": "KHC",
          "name": "The Kraft Heinz Company",
          "sector": "Consumo Básico",
          "m1": -13.18,
          "m3": -11.47,
          "score": 14,
          "trendState": "BEARISH",
          "rank": 86
        },
        {
          "symbol": "EXC",
          "name": "Exelon Corporation",
          "sector": "Utilities",
          "m1": -7.67,
          "m3": -15.48,
          "score": 13,
          "trendState": "BEARISH",
          "rank": 87
        },
        {
          "symbol": "SIRI",
          "name": "Sirius XM Holdings Inc.",
          "sector": "Comunicação",
          "m1": -7.17,
          "m3": -15.96,
          "score": 12,
          "trendState": "BEARISH",
          "rank": 88
        },
        {
          "symbol": "VRT",
          "name": "Vertiv Holdings Co",
          "sector": "Industriais",
          "m1": -3.85,
          "m3": -18.1,
          "score": 11,
          "trendState": "BEARISH",
          "rank": 89
        },
        {
          "symbol": "ODFL",
          "name": "Old Dominion Freight Line Inc.",
          "sector": "Industriais",
          "m1": -4.76,
          "m3": -18.17,
          "score": 10,
          "trendState": "BEARISH",
          "rank": 90
        },
        {
          "symbol": "NFLX",
          "name": "Netflix Inc.",
          "sector": "Comunicação",
          "m1": -16.04,
          "m3": -12.62,
          "score": 9,
          "trendState": "BEARISH",
          "rank": 91
        },
        {
          "symbol": "BKNG",
          "name": "Booking Holdings Inc.",
          "sector": "Consumo Discricionário",
          "m1": -18.09,
          "m3": -13.16,
          "score": 8,
          "trendState": "BEARISH",
          "rank": 92
        },
        {
          "symbol": "TTWO",
          "name": "Take-Two Interactive Software Inc.",
          "sector": "Comunicação",
          "m1": -6.03,
          "m3": -20.15,
          "score": 7,
          "trendState": "BEARISH",
          "rank": 93
        },
        {
          "symbol": "GFS",
          "name": "GlobalFoundries Inc.",
          "sector": "Tecnologia",
          "m1": 10.81,
          "m3": -30.3,
          "score": 6,
          "trendState": "NEUTRAL",
          "rank": 94
        },
        {
          "symbol": "ALGN",
          "name": "Align Technology Inc.",
          "sector": "Saúde",
          "m1": -6.2,
          "m3": -21.23,
          "score": 5,
          "trendState": "BEARISH",
          "rank": 95
        },
        {
          "symbol": "LULU",
          "name": "Lululemon Athletica Inc.",
          "sector": "Consumo Discricionário",
          "m1": -18.76,
          "m3": -19.06,
          "score": 4,
          "trendState": "BEARISH",
          "rank": 96
        },
        {
          "symbol": "CHTR",
          "name": "Charter Communications Inc.",
          "sector": "Comunicação",
          "m1": -23.82,
          "m3": -18.83,
          "score": 3,
          "trendState": "BEARISH",
          "rank": 97
        },
        {
          "symbol": "AXON",
          "name": "Axon Enterprise Inc.",
          "sector": "Industriais",
          "m1": -18.54,
          "m3": -29.28,
          "score": 2,
          "trendState": "BEARISH",
          "rank": 98
        },
        {
          "symbol": "TTD",
          "name": "The Trade Desk Inc.",
          "sector": "Tecnologia",
          "m1": -12.19,
          "m3": -36.65,
          "score": 1,
          "trendState": "BEARISH",
          "rank": 99
        },
        {
          "symbol": "APP",
          "name": "AppLovin Corporation",
          "sector": "Tecnologia",
          "m1": -9.76,
          "m3": -46.63,
          "score": 0,
          "trendState": "BEARISH",
          "rank": 100
        }
      ]
    },
    "weekly": {
      "displayDate": "01/10/2026 20:15",
      "baseDate": "2026-10-01",
      "source": "Twelve Data (Semanal)",
      "ranking": [
        {
          "symbol": "NVDA",
          "name": "NVIDIA Corporation",
          "sector": "Tecnologia",
          "m1": 0.21705157145337728,
          "m3": 18.49304521890879,
          "score": 100,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 1
        },
        {
          "symbol": "AVGO",
          "name": "Broadcom Inc.",
          "sector": "Tecnologia",
          "m1": -3.9843476944494984,
          "m3": -4.663614796404084,
          "score": 99,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 2
        },
        {
          "symbol": "TSLA",
          "name": "Tesla Inc.",
          "sector": "Consumo Discricionário",
          "m1": 0.00847350912266192,
          "m3": -9.998734019602653,
          "score": 98,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 3
        },
        {
          "symbol": "PLTR",
          "name": "Palantir Technologies Inc.",
          "sector": "Tecnologia",
          "m1": 9.011640566741235,
          "m3": 46.97601933488012,
          "score": 97,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 4
        },
        {
          "symbol": "AAPL",
          "name": "Apple Inc.",
          "sector": "Tecnologia",
          "m1": 3.2346813763790347,
          "m3": 7.027835920033707,
          "score": 96,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 5
        },
        {
          "symbol": "MSFT",
          "name": "Microsoft Corporation",
          "sector": "Tecnologia",
          "m1": 2.6215688889019555,
          "m3": 31.322185749242898,
          "score": 95,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 6
        },
        {
          "symbol": "AMZN",
          "name": "Amazon.com Inc.",
          "sector": "Consumo Discricionário",
          "m1": -3.9766390477490727,
          "m3": 2.2911773189928724,
          "score": 94,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 7
        },
        {
          "symbol": "META",
          "name": "Meta Platforms Inc.",
          "sector": "Comunicação",
          "m1": 17.698650462939156,
          "m3": 24.537650556265195,
          "score": 93,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 8
        },
        {
          "symbol": "GOOGL",
          "name": "Alphabet Inc. (Class A)",
          "sector": "Comunicação",
          "m1": -0.06500029737636856,
          "m3": -6.020952460337319,
          "score": 92,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 9
        },
        {
          "symbol": "GOOG",
          "name": "Alphabet Inc. (Class C)",
          "sector": "Comunicação",
          "m1": -0.11333094748144315,
          "m3": -5.96608473148646,
          "score": 91,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 10
        },
        {
          "symbol": "COST",
          "name": "Costco Wholesale Corporation",
          "sector": "Consumo Básico",
          "m1": -0.08735995028457584,
          "m3": -3.859529119537842,
          "score": 90,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 11
        },
        {
          "symbol": "AMD",
          "name": "Advanced Micro Devices Inc.",
          "sector": "Tecnologia",
          "m1": 28.929783509647084,
          "m3": 18.90810863025551,
          "score": 89,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 12
        },
        {
          "symbol": "NFLX",
          "name": "Netflix Inc.",
          "sector": "Comunicação",
          "m1": -13.29073482428116,
          "m3": -12.620734063103683,
          "score": 88,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 13
        },
        {
          "symbol": "PEP",
          "name": "PepsiCo Inc.",
          "sector": "Consumo Básico",
          "m1": -8.740826854610189,
          "m3": -12.910830675357095,
          "score": 87,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 14
        },
        {
          "symbol": "LIN",
          "name": "Linde plc",
          "sector": "Materiais Básicos",
          "m1": -1.7002742697348194,
          "m3": -14.120810512937016,
          "score": 86,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 15
        },
        {
          "symbol": "CSCO",
          "name": "Cisco Systems Inc.",
          "sector": "Tecnologia",
          "m1": -0.40293040293040083,
          "m3": -3.4874434288756704,
          "score": 85,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 16
        },
        {
          "symbol": "TMUS",
          "name": "T-Mobile US Inc.",
          "sector": "Comunicação",
          "m1": -10.902379903040998,
          "m3": -8.894772420009025,
          "score": 84,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 17
        },
        {
          "symbol": "QCOM",
          "name": "QUALCOMM Incorporated",
          "sector": "Tecnologia",
          "m1": 7.911571179828661,
          "m3": 3.3134729078014264,
          "score": 83,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 18
        },
        {
          "symbol": "INTU",
          "name": "Intuit Inc.",
          "sector": "Tecnologia",
          "m1": -15.004511120994568,
          "m3": 2.698380145328477,
          "score": 82,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 19
        },
        {
          "symbol": "TXN",
          "name": "Texas Instruments Incorporated",
          "sector": "Tecnologia",
          "m1": 8.849249342207091,
          "m3": -4.0159640787755375,
          "score": 81,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 20
        },
        {
          "symbol": "AMAT",
          "name": "Applied Materials Inc.",
          "sector": "Tecnologia",
          "m1": 16.403862162782033,
          "m3": -12.228043030341189,
          "score": 80,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 21
        },
        {
          "symbol": "ISRG",
          "name": "Intuitive Surgical Inc.",
          "sector": "Saúde",
          "m1": 9.419138003295926,
          "m3": -5.814422060176484,
          "score": 79,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 22
        },
        {
          "symbol": "BKNG",
          "name": "Booking Holdings Inc.",
          "sector": "Consumo Discricionário",
          "m1": -17.077961460911652,
          "m3": -13.155613350671869,
          "score": 78,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 23
        },
        {
          "symbol": "HON",
          "name": "Honeywell International Inc.",
          "sector": "Industriais",
          "m1": 1.998950431754209,
          "m3": -6.9868615679109025,
          "score": 77,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 24
        },
        {
          "symbol": "VRTX",
          "name": "Vertex Pharmaceuticals Inc.",
          "sector": "Saúde",
          "m1": -7.210871237090755,
          "m3": -4.03378321480046,
          "score": 76,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 25
        },
        {
          "symbol": "CMCSA",
          "name": "Comcast Corporation",
          "sector": "Comunicação",
          "m1": -18.08229520573801,
          "m3": -8.78520386717108,
          "score": 75,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 26
        },
        {
          "symbol": "ADP",
          "name": "Automatic Data Processing Inc.",
          "sector": "Industriais",
          "m1": -4.920398386283409,
          "m3": 8.952817104882978,
          "score": 74,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 27
        },
        {
          "symbol": "PANW",
          "name": "Palo Alto Networks Inc.",
          "sector": "Tecnologia",
          "m1": 18.90115468699649,
          "m3": 13.845314680487931,
          "score": 73,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 28
        },
        {
          "symbol": "AMGN",
          "name": "Amgen Inc.",
          "sector": "Saúde",
          "m1": -6.852233221594278,
          "m3": 8.85206491653254,
          "score": 72,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 29
        },
        {
          "symbol": "LRCX",
          "name": "Lam Research Corporation",
          "sector": "Tecnologia",
          "m1": 10.547707152533954,
          "m3": -3.218459918613593,
          "score": 71,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 30
        },
        {
          "symbol": "ADI",
          "name": "Analog Devices Inc.",
          "sector": "Tecnologia",
          "m1": 11.690824016563147,
          "m3": 7.275429525930632,
          "score": 70,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 31
        },
        {
          "symbol": "MU",
          "name": "Micron Technology Inc.",
          "sector": "Tecnologia",
          "m1": 7.948138149653122,
          "m3": 12.48821292385913,
          "score": 69,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 32
        },
        {
          "symbol": "GILD",
          "name": "Gilead Sciences Inc.",
          "sector": "Saúde",
          "m1": -2.3178807947019866,
          "m3": 12.363830273482128,
          "score": 68,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 33
        },
        {
          "symbol": "MELI",
          "name": "MercadoLibre Inc.",
          "sector": "Consumo Discricionário",
          "m1": -14.822377700834924,
          "m3": -4.436983397814307,
          "score": 67,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 34
        },
        {
          "symbol": "KLAC",
          "name": "KLA Corporation",
          "sector": "Tecnologia",
          "m1": 7.936416598253425,
          "m3": -14.952239439609425,
          "score": 66,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 35
        },
        {
          "symbol": "SBUX",
          "name": "Starbucks Corporation",
          "sector": "Consumo Discricionário",
          "m1": -9.17966880444147,
          "m3": -9.005466577155463,
          "score": 65,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 36
        },
        {
          "symbol": "CRWD",
          "name": "CrowdStrike Holdings Inc.",
          "sector": "Tecnologia",
          "m1": 24.866252235276757,
          "m3": 37.17393339519538,
          "score": 64,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 37
        },
        {
          "symbol": "MDLZ",
          "name": "Mondelez International Inc.",
          "sector": "Consumo Básico",
          "m1": -5.744125326370762,
          "m3": -5.171564603513378,
          "score": 63,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 38
        },
        {
          "symbol": "REGN",
          "name": "Regeneron Pharmaceuticals Inc.",
          "sector": "Saúde",
          "m1": -11.224807104750662,
          "m3": 12.309899206446888,
          "score": 62,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 39
        },
        {
          "symbol": "SNPS",
          "name": "Synopsys Inc.",
          "sector": "Tecnologia",
          "m1": 24.553120556571205,
          "m3": 12.210634550279066,
          "score": 61,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 40
        },
        {
          "symbol": "CDNS",
          "name": "Cadence Design Systems Inc.",
          "sector": "Tecnologia",
          "m1": 19.82575948664982,
          "m3": -6.005788551058897,
          "score": 60,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 41
        },
        {
          "symbol": "ASML",
          "name": "ASML Holding N.V.",
          "sector": "Tecnologia",
          "m1": 5.458690403993278,
          "m3": 2.2138471902721704,
          "score": 59,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 42
        },
        {
          "symbol": "ABNB",
          "name": "Airbnb Inc.",
          "sector": "Consumo Discricionário",
          "m1": -11.800593602286467,
          "m3": 7.748613962842538,
          "score": 58,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 43
        },
        {
          "symbol": "CEG",
          "name": "Constellation Energy Corporation",
          "sector": "Utilities",
          "m1": -13.39308982449458,
          "m3": 8.22152978056426,
          "score": 57,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 44
        },
        {
          "symbol": "CTAS",
          "name": "Cintas Corporation",
          "sector": "Industriais",
          "m1": -2.4292861774829158,
          "m3": 7.8458455091801245,
          "score": 56,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 45
        },
        {
          "symbol": "MAR",
          "name": "Marriott International Inc.",
          "sector": "Consumo Discricionário",
          "m1": 5.43223067866539,
          "m3": -4.869285296439601,
          "score": 55,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 46
        },
        {
          "symbol": "DASH",
          "name": "DoorDash Inc.",
          "sector": "Consumo Discricionário",
          "m1": -13.958815472535768,
          "m3": -5.122126338064133,
          "score": 54,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 47
        },
        {
          "symbol": "PYPL",
          "name": "PayPal Holdings Inc.",
          "sector": "Tecnologia",
          "m1": -3.4570578602620103,
          "m3": 16.69232680888498,
          "score": 53,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 48
        },
        {
          "symbol": "ORLY",
          "name": "O'Reilly Automotive Inc.",
          "sector": "Consumo Discricionário",
          "m1": -3.2540687222664655,
          "m3": -5.783934626038778,
          "score": 52,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 49
        },
        {
          "symbol": "PCAR",
          "name": "PACCAR Inc.",
          "sector": "Industriais",
          "m1": -11.8364073777065,
          "m3": -8.000000000000002,
          "score": 51,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 50
        },
        {
          "symbol": "NXPI",
          "name": "NXP Semiconductors N.V.",
          "sector": "Tecnologia",
          "m1": 4.9815660112359526,
          "m3": -12.49999679909265,
          "score": 49,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 51
        },
        {
          "symbol": "KDP",
          "name": "Keurig Dr Pepper Inc.",
          "sector": "Consumo Básico",
          "m1": -5.830009205277698,
          "m3": -7.837837837837826,
          "score": 48,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 52
        },
        {
          "symbol": "MNST",
          "name": "Monster Beverage Corporation",
          "sector": "Consumo Básico",
          "m1": -3.833865814696485,
          "m3": -13.647540983606552,
          "score": 47,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 53
        },
        {
          "symbol": "ROP",
          "name": "Roper Technologies Inc.",
          "sector": "Tecnologia",
          "m1": -10.972795128658417,
          "m3": -0.44206753316674674,
          "score": 46,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 54
        },
        {
          "symbol": "MCHP",
          "name": "Microchip Technology Inc.",
          "sector": "Tecnologia",
          "m1": 5.837939867871104,
          "m3": -7.254253308128546,
          "score": 45,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 55
        },
        {
          "symbol": "LULU",
          "name": "Lululemon Athletica Inc.",
          "sector": "Consumo Discricionário",
          "m1": -4.721200675877149,
          "m3": -19.057671198176145,
          "score": 44,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 56
        },
        {
          "symbol": "ADSK",
          "name": "Autodesk Inc.",
          "sector": "Tecnologia",
          "m1": -3.0243186335162293,
          "m3": 1.8459610564873785,
          "score": 43,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 57
        },
        {
          "symbol": "DXCM",
          "name": "DexCom Inc.",
          "sector": "Saúde",
          "m1": -1.899886234357226,
          "m3": 21.024561403508777,
          "score": 42,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 58
        },
        {
          "symbol": "IDXX",
          "name": "IDEXX Laboratories Inc.",
          "sector": "Saúde",
          "m1": -3.2929881579438893,
          "m3": -7.179991164933506,
          "score": 41,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 59
        },
        {
          "symbol": "PAYX",
          "name": "Paychex Inc.",
          "sector": "Industriais",
          "m1": -17.14731739380494,
          "m3": -5.181006111894678,
          "score": 40,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 60
        },
        {
          "symbol": "ROST",
          "name": "Ross Stores Inc.",
          "sector": "Consumo Discricionário",
          "m1": 1.4781785079543976,
          "m3": 9.684683956551744,
          "score": 39,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 61
        },
        {
          "symbol": "KHC",
          "name": "The Kraft Heinz Company",
          "sector": "Consumo Básico",
          "m1": -9.61770623742455,
          "m3": -11.470240441466299,
          "score": 38,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 62
        },
        {
          "symbol": "FTNT",
          "name": "Fortinet Inc.",
          "sector": "Tecnologia",
          "m1": 14.351533325966692,
          "m3": 14.380799999999999,
          "score": 37,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 63
        },
        {
          "symbol": "CPRT",
          "name": "Copart Inc.",
          "sector": "Industriais",
          "m1": -19.06880189798339,
          "m3": -9.063645451516168,
          "score": 36,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 64
        },
        {
          "symbol": "TEAM",
          "name": "Atlassian Corporation",
          "sector": "Tecnologia",
          "m1": 0.1740689946196772,
          "m3": 126.51479007633586,
          "score": 35,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 65
        },
        {
          "symbol": "CHTR",
          "name": "Charter Communications Inc.",
          "sector": "Comunicação",
          "m1": -26.725447284331388,
          "m3": -18.826530612244888,
          "score": 34,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 66
        },
        {
          "symbol": "FAST",
          "name": "Fastenal Company",
          "sector": "Industriais",
          "m1": 1.2600806451612903,
          "m3": 3.343621399176955,
          "score": 33,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 67
        },
        {
          "symbol": "EXC",
          "name": "Exelon Corporation",
          "sector": "Utilities",
          "m1": -7.263978001833184,
          "m3": -15.476190476190482,
          "score": 32,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 68
        },
        {
          "symbol": "BIIB",
          "name": "Biogen Inc.",
          "sector": "Saúde",
          "m1": 0.9011502060408386,
          "m3": 3.100134184712193,
          "score": 31,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 69
        },
        {
          "symbol": "ODFL",
          "name": "Old Dominion Freight Line Inc.",
          "sector": "Industriais",
          "m1": -4.180335718512943,
          "m3": -18.171367708310026,
          "score": 30,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 70
        },
        {
          "symbol": "GEHC",
          "name": "GE HealthCare Technologies Inc.",
          "sector": "Saúde",
          "m1": -7.086842869590478,
          "m3": -2.4174483337146357,
          "score": 29,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 71
        },
        {
          "symbol": "CSX",
          "name": "CSX Corporation",
          "sector": "Industriais",
          "m1": -5.8085407812183725,
          "m3": -4.8067089384332204,
          "score": 28,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 72
        },
        {
          "symbol": "VRSK",
          "name": "Verisk Analytics Inc.",
          "sector": "Industriais",
          "m1": -9.370790105537976,
          "m3": -10.602606286030992,
          "score": 27,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 73
        },
        {
          "symbol": "DDOG",
          "name": "Datadog Inc.",
          "sector": "Tecnologia",
          "m1": 29.83609777091522,
          "m3": 6.1837458205464,
          "score": 26,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 74
        },
        {
          "symbol": "WBD",
          "name": "Warner Bros. Discovery Inc.",
          "sector": "Comunicação",
          "m1": 9.557522123893802,
          "m3": 16.88066465256797,
          "score": 25,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 75
        },
        {
          "symbol": "TER",
          "name": "Teradyne Inc.",
          "sector": "Tecnologia",
          "m1": 16.458003855300692,
          "m3": 12.65274445422791,
          "score": 24,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 76
        },
        {
          "symbol": "DLTR",
          "name": "Dollar Tree Inc.",
          "sector": "Consumo Básico",
          "m1": -12.92801704458985,
          "m3": -7.75493975602725,
          "score": 23,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 77
        },
        {
          "symbol": "TTWO",
          "name": "Take-Two Interactive Software Inc.",
          "sector": "Comunicação",
          "m1": -5.156271833806881,
          "m3": -20.14589120569861,
          "score": 22,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 78
        },
        {
          "symbol": "MDB",
          "name": "MongoDB Inc.",
          "sector": "Tecnologia",
          "m1": -4.6130011556381465,
          "m3": -0.8876211677186661,
          "score": 21,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 79
        },
        {
          "symbol": "ILMN",
          "name": "Illumina Inc.",
          "sector": "Saúde",
          "m1": 21.767024104115126,
          "m3": 40.831044139868794,
          "score": 20,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 80
        },
        {
          "symbol": "ZS",
          "name": "Zscaler Inc.",
          "sector": "Tecnologia",
          "m1": 17.067137809187273,
          "m3": 34.921604561189156,
          "score": 19,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 81
        },
        {
          "symbol": "ON",
          "name": "ON Semiconductor Corporation",
          "sector": "Tecnologia",
          "m1": 7.663353051895669,
          "m3": -12.212231966673981,
          "score": 18,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 82
        },
        {
          "symbol": "CDW",
          "name": "CDW Corporation",
          "sector": "Tecnologia",
          "m1": -10.861005381283622,
          "m3": 1.844492764489771,
          "score": 17,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 83
        },
        {
          "symbol": "MRNA",
          "name": "Moderna Inc.",
          "sector": "Saúde",
          "m1": 29.81106149089659,
          "m3": 136.88565697091272,
          "score": 16,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 84
        },
        {
          "symbol": "BMRN",
          "name": "BioMarin Pharmaceutical Inc.",
          "sector": "Saúde",
          "m1": -12.159927852096803,
          "m3": -0.9323614171893613,
          "score": 15,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 85
        },
        {
          "symbol": "ALGN",
          "name": "Align Technology Inc.",
          "sector": "Saúde",
          "m1": -8.380610186585974,
          "m3": -21.23076089312812,
          "score": 14,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 86
        },
        {
          "symbol": "SIRI",
          "name": "Sirius XM Holdings Inc.",
          "sector": "Comunicação",
          "m1": -11.555708865125899,
          "m3": -15.961979678793842,
          "score": 13,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 87
        },
        {
          "symbol": "FANG",
          "name": "Diamondback Energy Inc.",
          "sector": "Energia",
          "m1": -6.881844192350171,
          "m3": 7.829573092344858,
          "score": 12,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 88
        },
        {
          "symbol": "CCEP",
          "name": "Coca-Cola Europacific Partners plc",
          "sector": "Consumo Básico",
          "m1": -4.699319213313161,
          "m3": -5.459150173529681,
          "score": 11,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 89
        },
        {
          "symbol": "AXON",
          "name": "Axon Enterprise Inc.",
          "sector": "Industriais",
          "m1": -18.123992790893123,
          "m3": -29.282794191714917,
          "score": 10,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 90
        },
        {
          "symbol": "APP",
          "name": "AppLovin Corporation",
          "sector": "Tecnologia",
          "m1": -12.244197654105315,
          "m3": -46.62656982744495,
          "score": 9,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 91
        },
        {
          "symbol": "ARM",
          "name": "Arm Holdings plc",
          "sector": "Tecnologia",
          "m1": 15.966521733770014,
          "m3": -7.276072062928191,
          "score": 8,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 92
        },
        {
          "symbol": "MSTR",
          "name": "MicroStrategy Incorporated",
          "sector": "Tecnologia",
          "m1": 12.394957983193269,
          "m3": 59.273593331348614,
          "score": 7,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 93
        },
        {
          "symbol": "TTD",
          "name": "The Trade Desk Inc.",
          "sector": "Tecnologia",
          "m1": -16.146916146916148,
          "m3": -36.64921465968587,
          "score": 6,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 94
        },
        {
          "symbol": "PDD",
          "name": "PDD Holdings Inc.",
          "sector": "Consumo Discricionário",
          "m1": -6.945627052669985,
          "m3": -7.148925840514626,
          "score": 5,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 95
        },
        {
          "symbol": "GFS",
          "name": "GlobalFoundries Inc.",
          "sector": "Tecnologia",
          "m1": 7.675293076752928,
          "m3": -30.29782359679267,
          "score": 4,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 96
        },
        {
          "symbol": "VRT",
          "name": "Vertiv Holdings Co",
          "sector": "Industriais",
          "m1": -12.266067800235259,
          "m3": -18.104681728945522,
          "score": 3,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "QQQ",
          "rank": 97
        },
        {
          "symbol": "MPWR",
          "name": "Monolithic Power Systems Inc.",
          "sector": "Tecnologia",
          "m1": 11.203077240886042,
          "m3": 5.652243378487695,
          "score": 2,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "QQQ",
          "rank": 98
        },
        {
          "symbol": "SMCI",
          "name": "Super Micro Computer Inc.",
          "sector": "Tecnologia",
          "m1": 5.885324576913358,
          "m3": 54.00440852314476,
          "score": 1,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 99
        },
        {
          "symbol": "WDAY",
          "name": "Workday Inc.",
          "sector": "Tecnologia",
          "m1": -4.617187017579392,
          "m3": 37.924677837863946,
          "score": 0,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "QQQ",
          "rank": 100
        }
      ]
    }
  }
};
  root.__relativeStrengthStaticCache = staticCache;

  // Hidratação imediata do estado global para inicialização instantânea
  if (!root.relativeStrengthClassesState) {
    root.relativeStrengthClassesState = {
      selected: 'stock_ibov',
      classes: staticCache.daily,
      dailyClasses: staticCache.daily,
      weeklyClasses: staticCache.weekly,
      updatedAt: staticCache.updatedAt,
      dataAsOf: staticCache.dataAsOf,
      source: staticCache.source,
      loading: false,
      error: false
    };
  } else {
    root.relativeStrengthClassesState.dailyClasses = root.relativeStrengthClassesState.dailyClasses || staticCache.daily;
    root.relativeStrengthClassesState.weeklyClasses = root.relativeStrengthClassesState.weeklyClasses || staticCache.weekly;
    if (!root.relativeStrengthClassesState.classes || !root.relativeStrengthClassesState.classes.stock_ibov) {
      root.relativeStrengthClassesState.classes = staticCache.daily;
    }
    if (!root.relativeStrengthClassesState.selected || root.relativeStrengthClassesState.selected === 'stock') {
      root.relativeStrengthClassesState.selected = 'stock_ibov';
    }
  }

  // Hidratação do cache do Nasdaq
  root.__nasdaqRelativeStrengthCache_daily = staticCache.nasdaq.daily;
  root.__nasdaqRelativeStrengthCache_weekly = staticCache.nasdaq.weekly;
  if (!root.__nasdaqRelativeStrengthCache) {
    root.__nasdaqRelativeStrengthCache = staticCache.nasdaq.daily;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = staticCache;
  }
})();

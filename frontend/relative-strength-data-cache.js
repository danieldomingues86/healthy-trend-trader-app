/* ==========================================================================
   Healthy Trend Trader — Cache de Dados de Força Relativa (B3 e Nasdaq)
   Gerado automaticamente a partir do último fechamento em market-cache.json
   Garante disponibilidade instantânea dos dados reais mesmo em modo offline.
   ========================================================================== */
(function() {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const staticCache = {
  "updatedAt": "2026-10-12T11:58:34.473Z",
  "dataAsOf": "2026-10-07",
  "source": "B3 (COTAHIST)",
  "daily": {
    "stock_ibov": {
      "key": "stock_ibov",
      "label": "Ações Ibovespa",
      "benchmark": "IBOV",
      "items": [
        {
          "symbol": "MGLU3",
          "name": "MAGAZINE LUIZA S.A.",
          "sector": "Retail Trade",
          "m1": 105.72390572390572,
          "m3": 141.501976284585,
          "score": 100,
          "benchmark": "IBOV",
          "rank": 1
        },
        {
          "symbol": "VAMO3",
          "name": "VAMOS LOCAÇÃO DE CAMINHÕES. MÁQUINAS E EQUIP. S.A.",
          "sector": "Finance",
          "m1": 99.41860465116281,
          "m3": 127.15231788079473,
          "score": 99,
          "benchmark": "IBOV",
          "rank": 2
        },
        {
          "symbol": "FLRY3",
          "name": "FLEURY S.A.",
          "sector": "Health Services",
          "m1": 32.299618320610676,
          "m3": 71.70278637770899,
          "score": 97,
          "benchmark": "IBOV",
          "rank": 3
        },
        {
          "symbol": "YDUQ3",
          "name": "YDUQS PARTICIPACOES S.A.",
          "sector": "Commercial Services",
          "m1": 44.20218037661052,
          "m3": 63.85135135135134,
          "score": 96,
          "benchmark": "IBOV",
          "rank": 4
        },
        {
          "symbol": "MRVE3",
          "name": "MRV ENGENHARIA E PARTICIPACOES S.A.",
          "sector": "Consumer Durables",
          "m1": 36.71328671328673,
          "m3": 64.9789029535865,
          "score": 95,
          "benchmark": "IBOV",
          "rank": 5
        },
        {
          "symbol": "CYRE3",
          "name": "CYRELA BRAZIL REALTY S.A.EMPREEND E PART",
          "sector": "Finance",
          "m1": 34.61979365685899,
          "m3": 56.9964349376114,
          "score": 93,
          "benchmark": "IBOV",
          "rank": 6
        },
        {
          "symbol": "B3SA3",
          "name": "B3 S.A. - BRASIL. BOLSA. BALCÃO",
          "sector": "Finance",
          "m1": 32.21970554926388,
          "m3": 54.43121693121695,
          "score": 92,
          "benchmark": "IBOV",
          "rank": 7
        },
        {
          "symbol": "ASAI3",
          "name": "SENDAS DISTRIBUIDORA S.A.",
          "sector": "Retail Trade",
          "m1": 34.58417849898581,
          "m3": 52.35361653272099,
          "score": 91,
          "benchmark": "IBOV",
          "rank": 8
        },
        {
          "symbol": "AZZA3",
          "name": "AZZAS 2154 S.A.",
          "sector": "Consumer Non-Durables",
          "m1": 54.117647058823515,
          "m3": 36.316337148803335,
          "score": 89,
          "benchmark": "IBOV",
          "rank": 9
        },
        {
          "symbol": "RENT3",
          "name": "LOCALIZA RENT A CAR S.A.",
          "sector": "Finance",
          "m1": 48.08475957620211,
          "m3": 35.59701492537313,
          "score": 88,
          "benchmark": "IBOV",
          "rank": 10
        },
        {
          "symbol": "BPAC11",
          "name": "BCO BTG PACTUAL S.A.",
          "sector": "Finance",
          "m1": 34.82216708023158,
          "m3": 41.68984700973573,
          "score": 87,
          "benchmark": "IBOV",
          "rank": 11
        },
        {
          "symbol": "CSAN3",
          "name": "COSAN S.A.",
          "sector": "Utilities",
          "m1": 40.25974025974026,
          "m3": 38.46153846153848,
          "score": 85,
          "benchmark": "IBOV",
          "rank": 12
        },
        {
          "symbol": "TOTS3",
          "name": "TOTVS S.A.",
          "sector": "Technology Services",
          "m1": 27.878787878787882,
          "m3": 44.42162902121836,
          "score": 84,
          "benchmark": "IBOV",
          "rank": 13
        },
        {
          "symbol": "CEAB3",
          "name": "CEA MODAS S.A.",
          "sector": "Retail Trade",
          "m1": 45.08547008547011,
          "m3": 31.972789115646272,
          "score": 83,
          "benchmark": "IBOV",
          "rank": 14
        },
        {
          "symbol": "COGN3",
          "name": "COGNA EDUCAÇÃO S.A.",
          "sector": "Commercial Services",
          "m1": 33.613445378151276,
          "m3": 35.897435897435905,
          "score": 81,
          "benchmark": "IBOV",
          "rank": 15
        },
        {
          "symbol": "ENGI11",
          "name": "ENERGISA S.A.",
          "sector": "Utilities",
          "m1": 32.61918548542751,
          "m3": 34.83124018838304,
          "score": 80,
          "benchmark": "IBOV",
          "rank": 16
        },
        {
          "symbol": "MOTV3",
          "name": "MOTIVA INFRAESTRUTURA DE MOBILIDADE S.A.",
          "sector": "Transportation",
          "m1": 22.975404919016174,
          "m3": 36.940547762191045,
          "score": 79,
          "benchmark": "IBOV",
          "rank": 17
        },
        {
          "symbol": "RAIL3",
          "name": "RUMO S.A.",
          "sector": "Transportation",
          "m1": 26.086956521739136,
          "m3": 33.59319631467046,
          "score": 77,
          "benchmark": "IBOV",
          "rank": 18
        },
        {
          "symbol": "PETR3",
          "name": "PETROLEO BRASILEIRO S.A. PETROBRAS",
          "sector": "Energy Minerals",
          "m1": 15.409956076134712,
          "m3": 37.956683439072414,
          "score": 76,
          "benchmark": "IBOV",
          "rank": 19
        },
        {
          "symbol": "MULT3",
          "name": "MULTIPLAN - EMPREEND IMOBILIARIOS S.A.",
          "sector": "Finance",
          "m1": 28.035538005922977,
          "m3": 30.789915966386538,
          "score": 75,
          "benchmark": "IBOV",
          "rank": 20
        },
        {
          "symbol": "PETR4",
          "name": "PETROLEO BRASILEIRO S.A. PETROBRAS",
          "sector": "Energy Minerals",
          "m1": 14.006514657980462,
          "m3": 37.72749631087065,
          "score": 73,
          "benchmark": "IBOV",
          "rank": 21
        },
        {
          "symbol": "SMFT3",
          "name": "SMARTFIT ESCOLA DE GINÁSTICA E DANÇA S.A.",
          "sector": "Consumer Services",
          "m1": 42.66441821247893,
          "m3": 21.72661870503596,
          "score": 72,
          "benchmark": "IBOV",
          "rank": 22
        },
        {
          "symbol": "VIVA3",
          "name": "VIVARA PARTICIPAÇOES S.A",
          "sector": "Consumer Durables",
          "m1": 29.450549450549456,
          "m3": 27.4340112505409,
          "score": 71,
          "benchmark": "IBOV",
          "rank": 23
        },
        {
          "symbol": "AURE3",
          "name": "AUREN ENERGIA S.A.",
          "sector": "Utilities",
          "m1": 28.842975206611566,
          "m3": 26.542207792207794,
          "score": 69,
          "benchmark": "IBOV",
          "rank": 24
        },
        {
          "symbol": "IGTI11",
          "name": "IGUATEMI S.A.",
          "sector": "Finance",
          "m1": 25.36750848096494,
          "m3": 27.726574500768052,
          "score": 68,
          "benchmark": "IBOV",
          "rank": 25
        },
        {
          "symbol": "EQTL3",
          "name": "EQUATORIAL S.A.",
          "sector": "Utilities",
          "m1": 26.558603491271814,
          "m3": 26.21238497886098,
          "score": 67,
          "benchmark": "IBOV",
          "rank": 26
        },
        {
          "symbol": "ALOS3",
          "name": "ALLOS S.A",
          "sector": "Finance",
          "m1": 23.254213966288262,
          "m3": 27.463536108146556,
          "score": 65,
          "benchmark": "IBOV",
          "rank": 27
        },
        {
          "symbol": "RDOR3",
          "name": "REDE DOR SÃO LUIZ S.A.",
          "sector": "Health Services",
          "m1": 20.20493956910141,
          "m3": 28.655793025871755,
          "score": 64,
          "benchmark": "IBOV",
          "rank": 28
        },
        {
          "symbol": "HYPE3",
          "name": "HYPERA S.A.",
          "sector": "Health Technology",
          "m1": 17.907180385288957,
          "m3": 29.658160808858923,
          "score": 63,
          "benchmark": "IBOV",
          "rank": 29
        },
        {
          "symbol": "BEEF3",
          "name": "MINERVA S.A.",
          "sector": "Distribution Services",
          "m1": 13.065326633165819,
          "m3": 21.62162162162162,
          "score": 61,
          "benchmark": "IBOV",
          "rank": 30
        },
        {
          "symbol": "UGPA3",
          "name": "ULTRAPAR PARTICIPACOES S.A.",
          "sector": "Retail Trade",
          "m1": 1.4534129249935246,
          "m3": 26.382153249272555,
          "score": 60,
          "benchmark": "IBOV",
          "rank": 31
        },
        {
          "symbol": "ITUB4",
          "name": "ITAU UNIBANCO HOLDING S.A.",
          "sector": "Finance",
          "m1": 19.17355371900826,
          "m3": 15.969669117647056,
          "score": 59,
          "benchmark": "IBOV",
          "rank": 32
        },
        {
          "symbol": "ITSA4",
          "name": "ITAUSA S.A.",
          "sector": "Finance",
          "m1": 15.102328863796743,
          "m3": 18.01736613603473,
          "score": 57,
          "benchmark": "IBOV",
          "rank": 33
        },
        {
          "symbol": "BBAS3",
          "name": "BCO BRASIL S.A.",
          "sector": "Finance",
          "m1": 8.070175438596493,
          "m3": 21.739130434782616,
          "score": 56,
          "benchmark": "IBOV",
          "rank": 34
        },
        {
          "symbol": "BBDC3",
          "name": "BCO BRADESCO S.A.",
          "sector": "Finance",
          "m1": 17.11822660098523,
          "m3": 16.472749540722596,
          "score": 55,
          "benchmark": "IBOV",
          "rank": 35
        },
        {
          "symbol": "MBRF3",
          "name": "MBRF GLOBAL FOODS COMPANY S.A.",
          "sector": "Consumer Non-Durables",
          "m1": 10.684769775678848,
          "m3": 19.274809160305328,
          "score": 53,
          "benchmark": "IBOV",
          "rank": 36
        },
        {
          "symbol": "BBDC4",
          "name": "BCO BRADESCO S.A.",
          "sector": "Finance",
          "m1": 16.93722943722944,
          "m3": 15.13052743740011,
          "score": 52,
          "benchmark": "IBOV",
          "rank": 37
        },
        {
          "symbol": "ENEV3",
          "name": "ENEVA S.A",
          "sector": "Utilities",
          "m1": 13.475433526011571,
          "m3": 16.85267857142858,
          "score": 51,
          "benchmark": "IBOV",
          "rank": 38
        },
        {
          "symbol": "LREN3",
          "name": "LOJAS RENNER S.A.",
          "sector": "Retail Trade",
          "m1": 31.528384279475997,
          "m3": 6.431095406360421,
          "score": 49,
          "benchmark": "IBOV",
          "rank": 39
        },
        {
          "symbol": "SBSP3",
          "name": "CIA SANEAMENTO BASICO EST SAO PAULO",
          "sector": "Utilities",
          "m1": 23.122022718944677,
          "m3": 10.635495554823837,
          "score": 48,
          "benchmark": "IBOV",
          "rank": 40
        },
        {
          "symbol": "RADL3",
          "name": "RAIA DROGASIL S.A.",
          "sector": "Retail Trade",
          "m1": 8.603238866396756,
          "m3": 17.912087912087916,
          "score": 47,
          "benchmark": "IBOV",
          "rank": 41
        },
        {
          "symbol": "CSNA3",
          "name": "CIA SIDERURGICA NACIONAL",
          "sector": "Non-Energy Minerals",
          "m1": -8.066759388038946,
          "m3": 26.14503816793894,
          "score": 45,
          "benchmark": "IBOV",
          "rank": 42
        },
        {
          "symbol": "CPLE3",
          "name": "CIA PARANAENSE DE ENERGIA - COPEL",
          "sector": "Utilities",
          "m1": 9.355638166047076,
          "m3": 16.348055372445614,
          "score": 44,
          "benchmark": "IBOV",
          "rank": 43
        },
        {
          "symbol": "CPFE3",
          "name": "CPFL ENERGIA S.A.",
          "sector": "Utilities",
          "m1": 13.372093023255815,
          "m3": 12.403928266438925,
          "score": 43,
          "benchmark": "IBOV",
          "rank": 44
        },
        {
          "symbol": "TAEE11",
          "name": "TRANSMISSORA ALIANÇA DE ENERGIA ELÉTRICA S.A.",
          "sector": "Industrial Services",
          "m1": 12.496972632598702,
          "m3": 12.333736396614281,
          "score": 41,
          "benchmark": "IBOV",
          "rank": 45
        },
        {
          "symbol": "AXIA3",
          "name": "AXIA ENERGIA S.A.",
          "sector": "Utilities",
          "m1": 7.432675044883297,
          "m3": 14.242077128675067,
          "score": 40,
          "benchmark": "IBOV",
          "rank": 46
        },
        {
          "symbol": "WEGE3",
          "name": "WEG S.A.",
          "sector": "Producer Manufacturing",
          "m1": -1.3417672992141139,
          "m3": 15.949538184275735,
          "score": 39,
          "benchmark": "IBOV",
          "rank": 47
        },
        {
          "symbol": "GOAU4",
          "name": "METALURGICA GERDAU S.A.",
          "sector": "Non-Energy Minerals",
          "m1": 0.6081668114682914,
          "m3": 14.426877470355738,
          "score": 37,
          "benchmark": "IBOV",
          "rank": 48
        },
        {
          "symbol": "BRAV3",
          "name": "BRAVA ENERGIA S.A.",
          "sector": "Energy Minerals",
          "m1": 9.35672514619883,
          "m3": 9.414893617021281,
          "score": 36,
          "benchmark": "IBOV",
          "rank": 49
        },
        {
          "symbol": "PRIO3",
          "name": "PRIO S.A.",
          "sector": "Energy Minerals",
          "m1": 0.40504751518928295,
          "m3": 12.674825174825166,
          "score": 35,
          "benchmark": "IBOV",
          "rank": 50
        },
        {
          "symbol": "CMIG4",
          "name": "CIA ENERGETICA DE MINAS GERAIS - CEMIG",
          "sector": "Utilities",
          "m1": 5.846422338568935,
          "m3": 9.57542908762421,
          "score": 33,
          "benchmark": "IBOV",
          "rank": 51
        },
        {
          "symbol": "GGBR4",
          "name": "GERDAU S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -1.2302960399846241,
          "m3": 12.576687116564411,
          "score": 32,
          "benchmark": "IBOV",
          "rank": 52
        },
        {
          "symbol": "VBBR3",
          "name": "VIBRA ENERGIA S.A.",
          "sector": "Retail Trade",
          "m1": -3.5816993464052205,
          "m3": 12.5763125763126,
          "score": 31,
          "benchmark": "IBOV",
          "rank": 53
        },
        {
          "symbol": "CURY3",
          "name": "CURY CONSTRUTORA E INCORPORADORA S.A.",
          "sector": "Finance",
          "m1": 6.609017912291537,
          "m3": 4.227053140096637,
          "score": 29,
          "benchmark": "IBOV",
          "rank": 54
        },
        {
          "symbol": "CSMG3",
          "name": "CIA SANEAMENTO DE MINAS GERAIS-COPASA MG",
          "sector": "Utilities",
          "m1": 13.902611150317568,
          "m3": -2.5803531009506497,
          "score": 28,
          "benchmark": "IBOV",
          "rank": 55
        },
        {
          "symbol": "EMBJ3",
          "name": "EMBRAER S.A.",
          "sector": "Electronic Technology",
          "m1": -6.8983510749321635,
          "m3": 7.468979641007101,
          "score": 27,
          "benchmark": "IBOV",
          "rank": 56
        },
        {
          "symbol": "SANB11",
          "name": "BCO SANTANDER (BRASIL) S.A.",
          "sector": "Finance",
          "m1": -3.6430481283422522,
          "m3": 5.334307636097901,
          "score": 25,
          "benchmark": "IBOV",
          "rank": 57
        },
        {
          "symbol": "ISAE4",
          "name": "ISA ENERGIA BRASIL S.A",
          "sector": "Utilities",
          "m1": 4.415954415954415,
          "m3": 0.4109589041095818,
          "score": 24,
          "benchmark": "IBOV",
          "rank": 58
        },
        {
          "symbol": "DIRR3",
          "name": "DIRECIONAL ENGENHARIA S.A.",
          "sector": "Finance",
          "m1": 12.431444241316282,
          "m3": -4.130943102104434,
          "score": 23,
          "benchmark": "IBOV",
          "rank": 59
        },
        {
          "symbol": "ABEV3",
          "name": "AMBEV S.A.",
          "sector": "Consumer Non-Durables",
          "m1": 1.5883100381194337,
          "m3": 1.0107391029690493,
          "score": 21,
          "benchmark": "IBOV",
          "rank": 60
        },
        {
          "symbol": "BBSE3",
          "name": "BB SEGURIDADE PARTICIPAÇÕES S.A.",
          "sector": "Finance",
          "m1": -0.9223300970873871,
          "m3": 1.3406156901688115,
          "score": 20,
          "benchmark": "IBOV",
          "rank": 61
        },
        {
          "symbol": "PSSA3",
          "name": "PORTO SEGURO S.A.",
          "sector": "Finance",
          "m1": 3.6257309941520433,
          "m3": -1.6284233900814238,
          "score": 19,
          "benchmark": "IBOV",
          "rank": 62
        },
        {
          "symbol": "KLBN11",
          "name": "KLABIN S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -7.3582013285641406,
          "m3": 3.7185354691075423,
          "score": 17,
          "benchmark": "IBOV",
          "rank": 63
        },
        {
          "symbol": "EGIE3",
          "name": "ENGIE BRASIL ENERGIA S.A.",
          "sector": "Utilities",
          "m1": 2.3548387096774315,
          "m3": -2.188655980271259,
          "score": 16,
          "benchmark": "IBOV",
          "rank": 64
        },
        {
          "symbol": "CXSE3",
          "name": "CAIXA SEGURIDADE PARTICIPAÇÕES S.A.",
          "sector": "Finance",
          "m1": 2.7572624322993677,
          "m3": -4.134129536058795,
          "score": 15,
          "benchmark": "IBOV",
          "rank": 65
        },
        {
          "symbol": "SUZB3",
          "name": "SUZANO S.A.",
          "sector": "Process Industries",
          "m1": -11.288981288981292,
          "m3": 2.8440588093516572,
          "score": 13,
          "benchmark": "IBOV",
          "rank": 66
        },
        {
          "symbol": "HAPV3",
          "name": "HAPVIDA PARTICIPACOES E INVESTIMENTOS SA",
          "sector": "Health Services",
          "m1": 21.448087431693995,
          "m3": -15.009560229445507,
          "score": 12,
          "benchmark": "IBOV",
          "rank": 67
        },
        {
          "symbol": "BRAP4",
          "name": "BRADESPAR S.A.",
          "sector": "Finance",
          "m1": -7.86416443252903,
          "m3": -3.147017379051187,
          "score": 11,
          "benchmark": "IBOV",
          "rank": 68
        },
        {
          "symbol": "POMO4",
          "name": "MARCOPOLO S.A.",
          "sector": "Producer Manufacturing",
          "m1": 7.860262008733621,
          "m3": -12.411347517730487,
          "score": 9,
          "benchmark": "IBOV",
          "rank": 69
        },
        {
          "symbol": "VIVT3",
          "name": "TELEFÔNICA BRASIL S.A",
          "sector": "Communications",
          "m1": -0.36112934996717083,
          "m3": -12.611575007198372,
          "score": 8,
          "benchmark": "IBOV",
          "rank": 70
        },
        {
          "symbol": "VALE3",
          "name": "VALE S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -13.204652946439976,
          "m3": -6.794783802333548,
          "score": 7,
          "benchmark": "IBOV",
          "rank": 71
        },
        {
          "symbol": "TEND3",
          "name": "CONSTRUTORA TENDA S.A.",
          "sector": "Finance",
          "m1": -6.646525679758319,
          "m3": -10.564399421128801,
          "score": 5,
          "benchmark": "IBOV",
          "rank": 72
        },
        {
          "symbol": "USIM5",
          "name": "USINAS SID DE MINAS GERAIS S.A.-USIMINAS",
          "sector": "Non-Energy Minerals",
          "m1": -4.575163398692816,
          "m3": -12.887828162291182,
          "score": 4,
          "benchmark": "IBOV",
          "rank": 73
        },
        {
          "symbol": "NATU3",
          "name": "NATURA COSMETICOS S.A.",
          "sector": "Consumer Non-Durables",
          "m1": -12.455934195064621,
          "m3": -13.372093023255804,
          "score": 3,
          "benchmark": "IBOV",
          "rank": 74
        },
        {
          "symbol": "CMIN3",
          "name": "CSN MINERAÇÃO S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -28.326180257510735,
          "m3": -8.073394495412856,
          "score": 1,
          "benchmark": "IBOV",
          "rank": 75
        },
        {
          "symbol": "TIMS3",
          "name": "TIM S.A.",
          "sector": "Communications",
          "m1": -7.369498464687807,
          "m3": -19.412288512911836,
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
          "symbol": "AZEV3",
          "name": "AZEVEDO E TRAVASSOS S.A.",
          "sector": "Industrial Services",
          "m1": 50.14619883040936,
          "m3": 603.4246575342465,
          "score": 100,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 1
        },
        {
          "symbol": "RCSL3",
          "name": "RECRUSUL S.A.",
          "sector": "Producer Manufacturing",
          "m1": 371.42857142857144,
          "m3": 407.6923076923077,
          "score": 100,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 2
        },
        {
          "symbol": "DOTZ3",
          "name": "DOTZ S.A.",
          "sector": "Technology Services",
          "m1": 26.69902912621358,
          "m3": 239.84375000000006,
          "score": 99,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 3
        },
        {
          "symbol": "LJQQ3",
          "name": "LOJAS QUERO-QUERO S/A",
          "sector": "Retail Trade",
          "m1": 120.30075187969925,
          "m3": 146.218487394958,
          "score": 99,
          "benchmark": "SMLL",
          "rank": 4
        },
        {
          "symbol": "JSLG3",
          "name": "JSL S.A.",
          "sector": "Transportation",
          "m1": 114.00000000000001,
          "m3": 130.93525179856118,
          "score": 98,
          "benchmark": "SMLL",
          "rank": 5
        },
        {
          "symbol": "MOVI3",
          "name": "MOVIDA PARTICIPACOES SA",
          "sector": "Finance",
          "m1": 133.82716049382717,
          "m3": 116.21004566210047,
          "score": 98,
          "benchmark": "SMLL",
          "rank": 6
        },
        {
          "symbol": "RCSL4",
          "name": "RECRUSUL S.A.",
          "sector": "Producer Manufacturing",
          "m1": 132.50000000000003,
          "m3": 116.27906976744188,
          "score": 97,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 7
        },
        {
          "symbol": "SIMH3",
          "name": "SIMPAR S.A.",
          "sector": "Transportation",
          "m1": 118.75792141951842,
          "m3": 117.65447667087012,
          "score": 97,
          "benchmark": "SMLL",
          "rank": 8
        },
        {
          "symbol": "TASA3",
          "name": "TAURUS ARMAS S.A.",
          "sector": "Electronic Technology",
          "m1": 87.75510204081631,
          "m3": 110.68702290076335,
          "score": 96,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 9
        },
        {
          "symbol": "DASA3",
          "name": "DIAGNOSTICOS DA AMERICA S.A.",
          "sector": "Health Services",
          "m1": 88.44765342960288,
          "m3": 103.90625,
          "score": 96,
          "benchmark": "SMLL",
          "rank": 10
        },
        {
          "symbol": "PTBL3",
          "name": "PBG S/A",
          "sector": "Producer Manufacturing",
          "m1": 100,
          "m3": 85.31073446327682,
          "score": 95,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 11
        },
        {
          "symbol": "ECOR3",
          "name": "ECORODOVIAS INFRAESTRUTURA E LOGÍSTICA S.A.",
          "sector": "Transportation",
          "m1": 79.44038929440387,
          "m3": 92.55874673629243,
          "score": 95,
          "benchmark": "SMLL",
          "rank": 12
        },
        {
          "symbol": "ANIM3",
          "name": "ANIMA HOLDING S.A.",
          "sector": "Consumer Services",
          "m1": 82.41379310344827,
          "m3": 87.58865248226952,
          "score": 94,
          "benchmark": "SMLL",
          "rank": 13
        },
        {
          "symbol": "RAPT3",
          "name": "RANDONCORP S.A.",
          "sector": "Producer Manufacturing",
          "m1": 17.579908675799103,
          "m3": 121.505376344086,
          "score": 94,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 14
        },
        {
          "symbol": "TASA4",
          "name": "TAURUS ARMAS S.A.",
          "sector": "Electronic Technology",
          "m1": 60.68376068376069,
          "m3": 95.0207468879668,
          "score": 93,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 15
        },
        {
          "symbol": "ARML3",
          "name": "ARMAC LOCAÇÃO. LOGÍSTICA E SERVIÇOS S.A.",
          "sector": "Finance",
          "m1": 68.31168831168833,
          "m3": 90.58823529411765,
          "score": 93,
          "benchmark": "SMLL",
          "rank": 16
        },
        {
          "symbol": "WEST3",
          "name": "WESTWING COMERCIO VAREJISTA S.A.",
          "sector": "Retail Trade",
          "m1": 93.66197183098592,
          "m3": 55.367231638418076,
          "score": 92,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 17
        },
        {
          "symbol": "RAPT4",
          "name": "RANDONCORP S.A.",
          "sector": "Producer Manufacturing",
          "m1": 54.296875,
          "m3": 66.31578947368422,
          "score": 92,
          "benchmark": "SMLL",
          "rank": 18
        },
        {
          "symbol": "VVEO3",
          "name": "CM HOSPITALAR S.A.",
          "sector": "Distribution Services",
          "m1": 24.35897435897436,
          "m3": 70.17543859649125,
          "score": 91,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 19
        },
        {
          "symbol": "CSED3",
          "name": "CRUZEIRO DO SUL EDUCACIONAL S.A.",
          "sector": "Consumer Services",
          "m1": 27.919708029197075,
          "m3": 66.90476190476188,
          "score": 91,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 20
        },
        {
          "symbol": "QUAL3",
          "name": "QUALICORP CONSULTORIA E CORRETORA DE SEGUROS S.A.",
          "sector": "Health Services",
          "m1": 63.08724832214767,
          "m3": 46.38554216867472,
          "score": 90,
          "benchmark": "SMLL",
          "rank": 21
        },
        {
          "symbol": "CYRE4",
          "name": "CYRELA BRAZIL REALTY S.A.EMPREEND E PART",
          "sector": "Finance",
          "m1": 35.954600729631125,
          "m3": 60.55528961225465,
          "score": 90,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 22
        },
        {
          "symbol": "TRIS3",
          "name": "TRISUL S.A.",
          "sector": "Consumer Durables",
          "m1": 37.32534930139722,
          "m3": 59.628770301624144,
          "score": 89,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 23
        },
        {
          "symbol": "EZTC3",
          "name": "EZ TEC EMPREEND. E PARTICIPACOES S.A.",
          "sector": "Finance",
          "m1": 50.38051750380519,
          "m3": 52,
          "score": 89,
          "benchmark": "SMLL",
          "rank": 24
        },
        {
          "symbol": "PGMN3",
          "name": "EMPREENDIMENTOS PAGUE MENOS S.A.",
          "sector": "Retail Trade",
          "m1": 43.603133159268936,
          "m3": 55.367231638418076,
          "score": 88,
          "benchmark": "SMLL",
          "rank": 25
        },
        {
          "symbol": "DXCO3",
          "name": "DEXCO S.A.",
          "sector": "Producer Manufacturing",
          "m1": 36.29893238434163,
          "m3": 54.74747474747475,
          "score": 88,
          "benchmark": "SMLL",
          "rank": 26
        },
        {
          "symbol": "VTRU3",
          "name": "VITRU EDUCAÇÃO S.A",
          "sector": "Commercial Services",
          "m1": 34.00000000000001,
          "m3": 53.43511450381682,
          "score": 87,
          "benchmark": "SMLL",
          "rank": 27
        },
        {
          "symbol": "AUAU3",
          "name": "UNIÃO PET PARTICIPAÇÕES S.A.",
          "sector": "Process Industries",
          "m1": 23.32506203473943,
          "m3": 57.27848101265822,
          "score": 87,
          "benchmark": "SMLL",
          "rank": 28
        },
        {
          "symbol": "LAVV3",
          "name": "LAVVI EMPREENDIMENTOS IMOBILIÁRIOS S.A.",
          "sector": "Finance",
          "m1": 46.09800362976409,
          "m3": 44.91449144914495,
          "score": 86,
          "benchmark": "SMLL",
          "rank": 29
        },
        {
          "symbol": "INTB3",
          "name": "INTELBRAS S.A. IND DE TELEC ELETRONICA BRASILEIRA",
          "sector": "Technology Services",
          "m1": 28.358208955223894,
          "m3": 52.741312741312754,
          "score": 86,
          "benchmark": "SMLL",
          "rank": 30
        },
        {
          "symbol": "VIVR3",
          "name": "VIVER INCORPORADORA E CONSTRUTORA S.A.",
          "sector": "Consumer Durables",
          "m1": 58.38926174496643,
          "m3": 36.41618497109826,
          "score": 85,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 31
        },
        {
          "symbol": "TGMA3",
          "name": "TEGMA GESTAO LOGISTICA S.A.",
          "sector": "Transportation",
          "m1": 30.230547550432263,
          "m3": 49.63576158940397,
          "score": 85,
          "benchmark": "SMLL",
          "rank": 32
        },
        {
          "symbol": "BMOB3",
          "name": "BEMOBI MOBILE TECH S.A.",
          "sector": "Technology Services",
          "m1": 31.81991606257153,
          "m3": 48.2832618025751,
          "score": 84,
          "benchmark": "SMLL",
          "rank": 33
        },
        {
          "symbol": "ALPK3",
          "name": "ALLPARK EMPREENDIMENTOS PARTICIPACOES SERVICOS S.A",
          "sector": "Consumer Services",
          "m1": 37.49999999999998,
          "m3": 44.047619047619044,
          "score": 84,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 34
        },
        {
          "symbol": "LWSA3",
          "name": "LWSA S.A.",
          "sector": "Technology Services",
          "m1": 41.481481481481495,
          "m3": 40.78624078624078,
          "score": 83,
          "benchmark": "SMLL",
          "rank": 35
        },
        {
          "symbol": "RENT4",
          "name": "LOCALIZA RENT A CAR S.A.",
          "sector": "Finance",
          "m1": 46.72561481072122,
          "m3": 37.2093023255814,
          "score": 83,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 36
        },
        {
          "symbol": "ENGI4",
          "name": "ENERGISA S.A.",
          "sector": "Utilities",
          "m1": 37.97979797979798,
          "m3": 40.82474226804125,
          "score": 82,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 37
        },
        {
          "symbol": "MATD3",
          "name": "HOSPITAL MATER DEI S/A",
          "sector": "Health Services",
          "m1": 36.182902584493036,
          "m3": 39.511201629327886,
          "score": 82,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 38
        },
        {
          "symbol": "SEER3",
          "name": "SER EDUCACIONAL S.A.",
          "sector": "Consumer Services",
          "m1": 23.758865248226947,
          "m3": 45.17470881863561,
          "score": 81,
          "benchmark": "SMLL",
          "rank": 39
        },
        {
          "symbol": "MLAS3",
          "name": "GRUPO MULTI S.A.",
          "sector": "Electronic Technology",
          "m1": 28.494623655913976,
          "m3": 41.42011834319528,
          "score": 81,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 40
        },
        {
          "symbol": "GGPS3",
          "name": "GPS PARTICIPACOES E EMPREENDIMENTOS S.A.",
          "sector": "Commercial Services",
          "m1": 35.05311077389985,
          "m3": 37.66434648105184,
          "score": 80,
          "benchmark": "SMLL",
          "rank": 41
        },
        {
          "symbol": "HBRE3",
          "name": "HBR REALTY EMPREENDIMENTOS IMOBILIARIOS S/A",
          "sector": "Finance",
          "m1": 26.119402985074625,
          "m3": 42.01680672268908,
          "score": 80,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 42
        },
        {
          "symbol": "JALL3",
          "name": "JALLES MACHADO S.A.",
          "sector": "Process Industries",
          "m1": 14.828897338403046,
          "m3": 48.03921568627452,
          "score": 79,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 43
        },
        {
          "symbol": "PNVL3",
          "name": "DIMED S.A. DISTRIBUIDORA DE MEDICAMENTOS",
          "sector": "Retail Trade",
          "m1": 22.374429223744265,
          "m3": 43.957027752909575,
          "score": 79,
          "benchmark": "SMLL",
          "rank": 44
        },
        {
          "symbol": "AMOB3",
          "name": "AUTOMOB PARTICIPAÇÕES S.A.",
          "sector": "Retail Trade",
          "m1": 41.96502914238136,
          "m3": 33.30727130570761,
          "score": 78,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 45
        },
        {
          "symbol": "GMAT3",
          "name": "GRUPO MATEUS S.A.",
          "sector": "Retail Trade",
          "m1": 18.012422360248447,
          "m3": 44.67005076142132,
          "score": 78,
          "benchmark": "SMLL",
          "rank": 46
        },
        {
          "symbol": "CAML3",
          "name": "CAMIL ALIMENTOS S.A.",
          "sector": "Process Industries",
          "m1": 34.57943925233646,
          "m3": 34.8314606741573,
          "score": 77,
          "benchmark": "SMLL",
          "rank": 47
        },
        {
          "symbol": "ONCO3",
          "name": "ONCOCLINICAS DO BRASIL SERVICOS MEDICOS  S.A.",
          "sector": "Health Services",
          "m1": 4.587155963302725,
          "m3": 49.99999999999998,
          "score": 77,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 48
        },
        {
          "symbol": "ALPA4",
          "name": "ALPARGATAS S.A.",
          "sector": "Consumer Non-Durables",
          "m1": 25.811320754716995,
          "m3": 38.3402489626556,
          "score": 76,
          "benchmark": "SMLL",
          "rank": 49
        },
        {
          "symbol": "BPAC5",
          "name": "BCO BTG PACTUAL S.A.",
          "sector": "Finance",
          "m1": 29.24205378973106,
          "m3": 35.53846153846154,
          "score": 76,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 50
        },
        {
          "symbol": "PCAR3",
          "name": "CIA BRASILEIRA DE DISTRIBUICAO",
          "sector": "Retail Trade",
          "m1": 23.448275862068968,
          "m3": 38.223938223938234,
          "score": 75,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 51
        },
        {
          "symbol": "SOJA3",
          "name": "BOA SAFRA SEMENTES S.A.",
          "sector": "Process Industries",
          "m1": 12.28978007761965,
          "m3": 43.94693200663349,
          "score": 75,
          "benchmark": "SMLL",
          "rank": 52
        },
        {
          "symbol": "POSI3",
          "name": "POSITIVO TECNOLOGIA S.A.",
          "sector": "Electronic Technology",
          "m1": 43.58974358974359,
          "m3": 26.315789473684205,
          "score": 74,
          "benchmark": "SMLL",
          "rank": 53
        },
        {
          "symbol": "CLSC4",
          "name": "CENTRAIS ELET DE SANTA CATARINA S.A.",
          "sector": "Utilities",
          "m1": 19.544829310991616,
          "m3": 38.91310665504215,
          "score": 74,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 54
        },
        {
          "symbol": "RIAA3",
          "name": "RIACHUELO S.A.",
          "sector": "Distribution Services",
          "m1": 47.1311475409836,
          "m3": 23.367697594501703,
          "score": 73,
          "benchmark": "SMLL",
          "rank": 55
        },
        {
          "symbol": "JHSF3",
          "name": "JHSF PARTICIPACOES S.A.",
          "sector": "Finance",
          "m1": 21.786310517529216,
          "m3": 35.97390493942216,
          "score": 73,
          "benchmark": "SMLL",
          "rank": 56
        },
        {
          "symbol": "ALLD3",
          "name": "ALLIED TECNOLOGIA S.A.",
          "sector": "Technology Services",
          "m1": 21.9607843137255,
          "m3": 35.21739130434782,
          "score": 72,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 57
        },
        {
          "symbol": "BRBI11",
          "name": "BRBI BR PARTNERS S.A.",
          "sector": "Finance",
          "m1": 33.10344827586207,
          "m3": 29.183400267737625,
          "score": 72,
          "benchmark": "SMLL",
          "rank": 58
        },
        {
          "symbol": "FRAS3",
          "name": "FRASLE MOBILITY S.A.",
          "sector": "Producer Manufacturing",
          "m1": 18.657033574160643,
          "m3": 35.20581113801455,
          "score": 71,
          "benchmark": "SMLL",
          "rank": 59
        },
        {
          "symbol": "ROMI3",
          "name": "ROMI S.A.",
          "sector": "Producer Manufacturing",
          "m1": 31.438127090301005,
          "m3": 28.221859706362153,
          "score": 71,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 60
        },
        {
          "symbol": "MEAL3",
          "name": "INTERNATIONAL MEAL COMPANY ALIMENTACAO S.A.",
          "sector": "Consumer Services",
          "m1": 27.16049382716048,
          "m3": 30.379746835443044,
          "score": 70,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 61
        },
        {
          "symbol": "PINE4",
          "name": "BCO PINE S.A.",
          "sector": "Finance",
          "m1": 31.891433418150996,
          "m3": 27.773212818405923,
          "score": 70,
          "benchmark": "SMLL",
          "rank": 62
        },
        {
          "symbol": "TUPY3",
          "name": "TUPY S.A.",
          "sector": "Producer Manufacturing",
          "m1": 27.420362273579002,
          "m3": 29.606099110546367,
          "score": 69,
          "benchmark": "SMLL",
          "rank": 63
        },
        {
          "symbol": "PFRM3",
          "name": "PROFARMA DISTRIB PROD FARMACEUTICOS S.A.",
          "sector": "Distribution Services",
          "m1": 14.739517153748395,
          "m3": 36.404833836857996,
          "score": 69,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 64
        },
        {
          "symbol": "BMEB4",
          "name": "BCO MERCANTIL DO BRASIL S.A.",
          "sector": "Finance",
          "m1": 25.80805569368474,
          "m3": 30.144032921810716,
          "score": 68,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 65
        },
        {
          "symbol": "SAPR3",
          "name": "CIA SANEAMENTO DO PARANA - SANEPAR",
          "sector": "Utilities",
          "m1": 33.204633204633204,
          "m3": 25.45454545454544,
          "score": 68,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 66
        },
        {
          "symbol": "LAND3",
          "name": "TERRA SANTA PROPRIEDADES AGRICOLAS S.A.",
          "sector": "Finance",
          "m1": 15.399999999999991,
          "m3": 34.81308411214952,
          "score": 67,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 67
        },
        {
          "symbol": "BRSR6",
          "name": "BCO ESTADO DO RIO GRANDE DO SUL S.A.",
          "sector": "Finance",
          "m1": 22.215025906735764,
          "m3": 30.950728660652338,
          "score": 67,
          "benchmark": "SMLL",
          "rank": 68
        },
        {
          "symbol": "CVCB3",
          "name": "CVC BRASIL OPERADORA E AGÊNCIA DE VIAGENS S.A.",
          "sector": "Consumer Services",
          "m1": 7.499999999999996,
          "m3": 37.59999999999999,
          "score": 66,
          "benchmark": "SMLL",
          "rank": 69
        },
        {
          "symbol": "HBOR3",
          "name": "HELBOR EMPREENDIMENTOS S.A.",
          "sector": "Consumer Durables",
          "m1": 26.046511627906987,
          "m3": 27.230046948356822,
          "score": 66,
          "benchmark": "SMLL",
          "rank": 70
        },
        {
          "symbol": "BRST3",
          "name": "BRISANET SERVIÇOS DE TELECOMUNICAÇÕES S.A.",
          "sector": "Communications",
          "m1": 25.52447552447552,
          "m3": 27.304964539007102,
          "score": 65,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 71
        },
        {
          "symbol": "ALPA3",
          "name": "ALPARGATAS S.A.",
          "sector": "Consumer Non-Durables",
          "m1": 18.913480885311884,
          "m3": 30.752212389380553,
          "score": 65,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 72
        },
        {
          "symbol": "TPIS3",
          "name": "TPI - TRIUNFO PARTICIP. E INVEST. S.A.",
          "sector": "Transportation",
          "m1": 14.915572232645392,
          "m3": 32.863340563991315,
          "score": 64,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 73
        },
        {
          "symbol": "BMGB4",
          "name": "BANCO BMG S.A.",
          "sector": "Finance",
          "m1": 15.51155115511551,
          "m3": 32.32514177693761,
          "score": 64,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 74
        },
        {
          "symbol": "MTRE3",
          "name": "MITRE REALTY EMPREENDIMENTOS E PARTICIPAÇÕES S.A.",
          "sector": "Finance",
          "m1": 16.85714285714286,
          "m3": 31.5112540192926,
          "score": 63,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 75
        },
        {
          "symbol": "GFSA3",
          "name": "GAFISA S.A.",
          "sector": "Finance",
          "m1": 119.99999999999997,
          "m3": -24.13793103448275,
          "score": 63,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 76
        },
        {
          "symbol": "MDNE3",
          "name": "MOURA DUBEUX ENGENHARIA S/A",
          "sector": "Finance",
          "m1": 25.248281130634066,
          "m3": 25.296140619029405,
          "score": 62,
          "benchmark": "SMLL",
          "rank": 77
        },
        {
          "symbol": "BAZA3",
          "name": "BCO AMAZONIA S.A.",
          "sector": "Finance",
          "m1": 15.247700978937996,
          "m3": 30.369127516778516,
          "score": 62,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 78
        },
        {
          "symbol": "IGTI3",
          "name": "IGUATEMI S.A.",
          "sector": "Finance",
          "m1": 28.440366972477072,
          "m3": 22.44897959183674,
          "score": 61,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 79
        },
        {
          "symbol": "CSUD3",
          "name": "CSU DIGITAL S.A.",
          "sector": "Commercial Services",
          "m1": 24.270462633451963,
          "m3": 24.358974358974383,
          "score": 61,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 80
        },
        {
          "symbol": "BLAU3",
          "name": "BLAU FARMACÊUTICA S.A.",
          "sector": "Health Technology",
          "m1": 25.848303393213577,
          "m3": 22.427184466019412,
          "score": 60,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 81
        },
        {
          "symbol": "EVEN3",
          "name": "EVEN CONSTRUTORA E INCORPORADORA S.A.",
          "sector": "Finance",
          "m1": 47.85714285714284,
          "m3": 10.301953818827702,
          "score": 60,
          "benchmark": "SMLL",
          "rank": 82
        },
        {
          "symbol": "SAPR11",
          "name": "CIA SANEAMENTO DO PARANA - SANEPAR",
          "sector": "Utilities",
          "m1": 25.858698687517446,
          "m3": 21.81081081081082,
          "score": 59,
          "benchmark": "SMLL",
          "rank": 83
        },
        {
          "symbol": "LOGG3",
          "name": "LOG COMMERCIAL PROPERTIES",
          "sector": "Industrial Services",
          "m1": 27.20259845716606,
          "m3": 19.99234009957871,
          "score": 59,
          "benchmark": "SMLL",
          "rank": 84
        },
        {
          "symbol": "WDCN3",
          "name": "WDC NETWORKS (LIVETECH DA BAHIA S.A.)",
          "sector": "Distribution Services",
          "m1": 11.567164179104484,
          "m3": 28.326180257510725,
          "score": 58,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 85
        },
        {
          "symbol": "GRND3",
          "name": "GRENDENE S.A.",
          "sector": "Consumer Non-Durables",
          "m1": 24.668435013262613,
          "m3": 21.134020618556715,
          "score": 58,
          "benchmark": "SMLL",
          "rank": 86
        },
        {
          "symbol": "RAIZ4",
          "name": "RAIZEN S.A.",
          "sector": "Retail Trade",
          "m1": 35.7142857142857,
          "m3": 15.151515151515138,
          "score": 57,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 87
        },
        {
          "symbol": "ABCB4",
          "name": "BCO ABC BRASIL S.A.",
          "sector": "Finance",
          "m1": 18.239999999999988,
          "m3": 24.25388818831442,
          "score": 57,
          "benchmark": "SMLL",
          "rank": 88
        },
        {
          "symbol": "IRBR3",
          "name": "IRB - BRASIL RESSEGUROS S.A.",
          "sector": "Finance",
          "m1": 16.18937262042708,
          "m3": 24.804409672830708,
          "score": 56,
          "benchmark": "SMLL",
          "rank": 89
        },
        {
          "symbol": "SAPR4",
          "name": "CIA SANEAMENTO DO PARANA - SANEPAR",
          "sector": "Utilities",
          "m1": 24.81962481962483,
          "m3": 19.806094182825483,
          "score": 56,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 90
        },
        {
          "symbol": "COCE5",
          "name": "CIA ENERGETICA DO CEARA - COELCE",
          "sector": "Utilities",
          "m1": 17.909496494582534,
          "m3": 23.33333333333334,
          "score": 55,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 91
        },
        {
          "symbol": "PRNR3",
          "name": "PRINER SERVIÇOS INDUSTRIAIS S.A.",
          "sector": "Industrial Services",
          "m1": 24.244090159428254,
          "m3": 19.072708113804016,
          "score": 55,
          "benchmark": "SMLL",
          "rank": 92
        },
        {
          "symbol": "PINE3",
          "name": "BCO PINE S.A.",
          "sector": "Finance",
          "m1": 29.42271880819367,
          "m3": 15.833333333333343,
          "score": 54,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 93
        },
        {
          "symbol": "PASS3",
          "name": "COMPASS GAS E ENERGIA S.A.",
          "sector": "Utilities",
          "m1": 21.62275198661647,
          "m3": 17.400080742834078,
          "score": 54,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 94
        },
        {
          "symbol": "LPSB3",
          "name": "LPS BRASIL - CONSULTORIA DE IMOVEIS S.A.",
          "sector": "Commercial Services",
          "m1": 27.692307692307683,
          "m3": 13.698630136986289,
          "score": 53,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 95
        },
        {
          "symbol": "VULC3",
          "name": "VULCABRAS S.A.",
          "sector": "Consumer Non-Durables",
          "m1": 24.679245283018858,
          "m3": 15.041782729805009,
          "score": 53,
          "benchmark": "SMLL",
          "rank": 96
        },
        {
          "symbol": "HBSA3",
          "name": "HIDROVIAS DO BRASIL S.A.",
          "sector": "Transportation",
          "m1": 19.648093841642233,
          "m3": 17.579250720461093,
          "score": 52,
          "benchmark": "SMLL",
          "rank": 97
        },
        {
          "symbol": "AMAR3",
          "name": "MARISA LOJAS S.A.",
          "sector": "Retail Trade",
          "m1": -7.86516853932585,
          "m3": 32.258064516129025,
          "score": 52,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 98
        },
        {
          "symbol": "ITUB3",
          "name": "ITAU UNIBANCO HOLDING S.A.",
          "sector": "Finance",
          "m1": 16.903837861147043,
          "m3": 18.591426071741026,
          "score": 51,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 99
        },
        {
          "symbol": "SBFG3",
          "name": "GRUPO SBF SA",
          "sector": "Retail Trade",
          "m1": 25.027442371020882,
          "m3": 13.900000000000002,
          "score": 51,
          "benchmark": "SMLL",
          "rank": 100
        },
        {
          "symbol": "ALUP11",
          "name": "ALUPAR INVESTIMENTO S/A",
          "sector": "Utilities",
          "m1": 16.857899382171215,
          "m3": 17.828537525956676,
          "score": 50,
          "benchmark": "SMLL",
          "rank": 101
        },
        {
          "symbol": "BMEB3",
          "name": "BCO MERCANTIL DO BRASIL S.A.",
          "sector": "Finance",
          "m1": 13.070259865255052,
          "m3": 19.85309120587635,
          "score": 50,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 102
        },
        {
          "symbol": "VITT3",
          "name": "VITTIA S.A.",
          "sector": "Process Industries",
          "m1": 18.885448916408663,
          "m3": 16.71732522796352,
          "score": 49,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 103
        },
        {
          "symbol": "BPAC3",
          "name": "BCO BTG PACTUAL S.A.",
          "sector": "Finance",
          "m1": 17.43697478991595,
          "m3": 17.141659681475275,
          "score": 49,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 104
        },
        {
          "symbol": "MDIA3",
          "name": "M.DIAS BRANCO S.A. IND COM DE ALIMENTOS",
          "sector": "Consumer Non-Durables",
          "m1": 19.825581395348845,
          "m3": 15.786516853932575,
          "score": 48,
          "benchmark": "SMLL",
          "rank": 105
        },
        {
          "symbol": "EUCA4",
          "name": "EUCATEX S.A. INDUSTRIA E COMERCIO",
          "sector": "Non-Energy Minerals",
          "m1": 24.47916666666665,
          "m3": 13.27014218009477,
          "score": 48,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 106
        },
        {
          "symbol": "ALUP3",
          "name": "ALUPAR INVESTIMENTO S/A",
          "sector": "Utilities",
          "m1": 20.86882453151617,
          "m3": 15.17857142857142,
          "score": 47,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 107
        },
        {
          "symbol": "EMAE4",
          "name": "EMAE - EMPRESA METROP.AGUAS ENERGIA S.A.",
          "sector": "Utilities",
          "m1": 22.034867104887113,
          "m3": 14.140604116546406,
          "score": 47,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 108
        },
        {
          "symbol": "SMTO3",
          "name": "SAO MARTINHO S.A.",
          "sector": "Process Industries",
          "m1": -1.4285714285714346,
          "m3": 26.450824679291387,
          "score": 46,
          "benchmark": "SMLL",
          "rank": 109
        },
        {
          "symbol": "ENGI3",
          "name": "ENERGISA S.A.",
          "sector": "Utilities",
          "m1": 16.694214876033065,
          "m3": 16.5016501650165,
          "score": 45,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 110
        },
        {
          "symbol": "MELK3",
          "name": "MELNICK DESENVOLVIMENTO IMOBILIÁRIO S.A.",
          "sector": "Industrial Services",
          "m1": 20.598006644518275,
          "m3": 14.1509433962264,
          "score": 45,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 111
        },
        {
          "symbol": "KEPL3",
          "name": "KEPLER WEBER S.A.",
          "sector": "Producer Manufacturing",
          "m1": 15.292353823088467,
          "m3": 16.8693009118541,
          "score": 44,
          "benchmark": "SMLL",
          "rank": 112
        },
        {
          "symbol": "ALUP4",
          "name": "ALUPAR INVESTIMENTO S/A",
          "sector": "Utilities",
          "m1": 14.027149321266963,
          "m3": 17.537313432835823,
          "score": 44,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 113
        },
        {
          "symbol": "ITSA3",
          "name": "ITAUSA S.A.",
          "sector": "Finance",
          "m1": 14.466292134831459,
          "m3": 17.097701149425305,
          "score": 44,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 114
        },
        {
          "symbol": "SLCE3",
          "name": "SLC AGRICOLA S.A.",
          "sector": "Process Industries",
          "m1": -4.503526858383067,
          "m3": 26.8925739005047,
          "score": 43,
          "benchmark": "SMLL",
          "rank": 115
        },
        {
          "symbol": "PLPL3",
          "name": "PLANO & PLANO DESENVOLVIMENTO IMOBILIÁRIO S.A.",
          "sector": "Finance",
          "m1": 24.583333333333336,
          "m3": 10.740740740740762,
          "score": 43,
          "benchmark": "SMLL",
          "rank": 116
        },
        {
          "symbol": "LEVE3",
          "name": "MAHLE-METAL LEVE S.A.",
          "sector": "Producer Manufacturing",
          "m1": 13.456304807983077,
          "m3": 16.413279553211325,
          "score": 42,
          "benchmark": "SMLL",
          "rank": 117
        },
        {
          "symbol": "BIOM3",
          "name": "BIOMM S.A.",
          "sector": "Health Technology",
          "m1": 11.550151975683898,
          "m3": 17.252396166134186,
          "score": 42,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 118
        },
        {
          "symbol": "SHUL4",
          "name": "SCHULZ S.A.",
          "sector": "Producer Manufacturing",
          "m1": 17.555555555555546,
          "m3": 13.763440860215038,
          "score": 41,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 119
        },
        {
          "symbol": "HAGA4",
          "name": "HAGA S.A. INDUSTRIA E COMERCIO",
          "sector": "Consumer Durables",
          "m1": 2.7027027027026973,
          "m3": 21.019108280254773,
          "score": 41,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 120
        },
        {
          "symbol": "VSTE3",
          "name": "VESTE S.A. ESTILO",
          "sector": "Consumer Non-Durables",
          "m1": 29.795918367346943,
          "m3": 6.000000000000005,
          "score": 40,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 121
        },
        {
          "symbol": "AXIA7",
          "name": "AXIA ENERGIA S.A.",
          "sector": "Utilities",
          "m1": 7.1965628356605915,
          "m3": 17.411764705882348,
          "score": 40,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 122
        },
        {
          "symbol": "MYPK3",
          "name": "IOCHPE MAXION S.A.",
          "sector": "Producer Manufacturing",
          "m1": 8.208208208208202,
          "m3": 16.86486486486487,
          "score": 39,
          "benchmark": "SMLL",
          "rank": 123
        },
        {
          "symbol": "RECV3",
          "name": "PETRORECÔNCAVO S.A.",
          "sector": "Energy Minerals",
          "m1": 4.355251921434666,
          "m3": 18.640776699029125,
          "score": 39,
          "benchmark": "SMLL",
          "rank": 124
        },
        {
          "symbol": "TECN3",
          "name": "TECHNOS S.A.",
          "sector": "Consumer Durables",
          "m1": 11.665004985044858,
          "m3": 14.63664278403276,
          "score": 38,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 125
        },
        {
          "symbol": "RNEW4",
          "name": "RENOVA ENERGIA S.A.",
          "sector": "Utilities",
          "m1": 2.1739130434782483,
          "m3": 18.98734177215189,
          "score": 38,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 126
        },
        {
          "symbol": "VLID3",
          "name": "VALID SOLUÇÕES S.A.",
          "sector": "Commercial Services",
          "m1": 13.941769316909314,
          "m3": 12.555309734513287,
          "score": 37,
          "benchmark": "SMLL",
          "rank": 127
        },
        {
          "symbol": "DEXP3",
          "name": "DEXXOS PARTICIPACOES S.A.",
          "sector": "Process Industries",
          "m1": 11.051212938005396,
          "m3": 13.812154696132595,
          "score": 37,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 128
        },
        {
          "symbol": "TAEE3",
          "name": "TRANSMISSORA ALIANÇA DE ENERGIA ELÉTRICA S.A.",
          "sector": "Industrial Services",
          "m1": 13.072378138847874,
          "m3": 11.997073884418441,
          "score": 36,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 129
        },
        {
          "symbol": "FESA4",
          "name": "CIA FERRO LIGAS DA BAHIA - FERBASA",
          "sector": "Non-Energy Minerals",
          "m1": 12.82051282051282,
          "m3": 12.05432937181663,
          "score": 36,
          "benchmark": "SMLL",
          "rank": 130
        },
        {
          "symbol": "CMIG3",
          "name": "CIA ENERGETICA DE MINAS GERAIS - CEMIG",
          "sector": "Utilities",
          "m1": 5.9873344847438,
          "m3": 14.347826086956506,
          "score": 35,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 131
        },
        {
          "symbol": "FIQE3",
          "name": "UNIFIQUE TELECOMUNICAÇÕES S.A.",
          "sector": "Communications",
          "m1": 21.568627450980404,
          "m3": 5.802047781569963,
          "score": 35,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 132
        },
        {
          "symbol": "TAEE4",
          "name": "TRANSMISSORA ALIANÇA DE ENERGIA ELÉTRICA S.A.",
          "sector": "Industrial Services",
          "m1": 11.679884643114647,
          "m3": 11.039426523297502,
          "score": 34,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 133
        },
        {
          "symbol": "OFSA3",
          "name": "OUROFINO S.A.",
          "sector": "Health Technology",
          "m1": 9.329446064139946,
          "m3": 11.940298507462677,
          "score": 34,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 134
        },
        {
          "symbol": "LOGN3",
          "name": "LOG-IN LOGISTICA INTERMODAL S.A.",
          "sector": "Transportation",
          "m1": 10.678571428571427,
          "m3": 11.075268817204309,
          "score": 33,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 135
        },
        {
          "symbol": "ISAE3",
          "name": "ISA ENERGIA BRASIL S.A",
          "sector": "Utilities",
          "m1": 6.951871657754016,
          "m3": 12.923462986198242,
          "score": 33,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 136
        },
        {
          "symbol": "SEQL3",
          "name": "SEQUOIA LOGISTICA E TRANSPORTES S.A",
          "sector": "Transportation",
          "m1": 0,
          "m3": 16.666666666666675,
          "score": 32,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 137
        },
        {
          "symbol": "BEES3",
          "name": "BANESTES S.A. - BCO EST ESPIRITO SANTO",
          "sector": "Finance",
          "m1": 8.539325842696632,
          "m3": 10.526315789473673,
          "score": 32,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 138
        },
        {
          "symbol": "WIZC3",
          "name": "WIZ CO PARTICIPAÇÕES E CORRETAGEM DE SEGUROS S.A.",
          "sector": "Finance",
          "m1": 13.15136476426797,
          "m3": 7.547169811320731,
          "score": 31,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 139
        },
        {
          "symbol": "PDTC3",
          "name": "PADTEC HOLDING S.A.",
          "sector": "Electronic Technology",
          "m1": 13.855421686746983,
          "m3": 6.779661016949157,
          "score": 31,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 140
        },
        {
          "symbol": "RNEW3",
          "name": "RENOVA ENERGIA S.A.",
          "sector": "Utilities",
          "m1": 1.098901098901095,
          "m3": 13.58024691358024,
          "score": 30,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 141
        },
        {
          "symbol": "GOAU3",
          "name": "METALURGICA GERDAU S.A.",
          "sector": "Non-Energy Minerals",
          "m1": 1.4591439688715901,
          "m3": 13.3695652173913,
          "score": 30,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 142
        },
        {
          "symbol": "BRSR3",
          "name": "BCO ESTADO DO RIO GRANDE DO SUL S.A.",
          "sector": "Finance",
          "m1": 5.979155238617673,
          "m3": 10.716332378223491,
          "score": 29,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 143
        },
        {
          "symbol": "CGRA4",
          "name": "GRAZZIOTIN S.A.",
          "sector": "Retail Trade",
          "m1": 13.333333333333353,
          "m3": 6.554690700532584,
          "score": 29,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 144
        },
        {
          "symbol": "TFCO4",
          "name": "TRACK & FIELD CO S.A.",
          "sector": "Retail Trade",
          "m1": 18.697318007662833,
          "m3": 3.12916111850865,
          "score": 28,
          "benchmark": "SMLL",
          "rank": 145
        },
        {
          "symbol": "NUTR3",
          "name": "NUTRIPLANT INDUSTRIA E COMERCIO S.A.",
          "sector": "Process Industries",
          "m1": 9.170305676855882,
          "m3": 7.758620689655182,
          "score": 28,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 146
        },
        {
          "symbol": "BMKS3",
          "name": "BICICLETAS MONARK S.A.",
          "sector": "Consumer Durables",
          "m1": 10.885771543086165,
          "m3": 6.683976451836804,
          "score": 27,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 147
        },
        {
          "symbol": "UCAS3",
          "name": "UNICASA INDÚSTRIA DE MÓVEIS S.A.",
          "sector": "Consumer Durables",
          "m1": 8.547008547008561,
          "m3": 7.6271186440677985,
          "score": 27,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 148
        },
        {
          "symbol": "BEES4",
          "name": "BANESTES S.A. - BCO EST ESPIRITO SANTO",
          "sector": "Finance",
          "m1": 5.87583148558759,
          "m3": 8.399545970488088,
          "score": 26,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 149
        },
        {
          "symbol": "GGBR3",
          "name": "GERDAU S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -0.7692307692307776,
          "m3": 11.48957803762074,
          "score": 26,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 150
        },
        {
          "symbol": "AERI3",
          "name": "AERIS IND. E COM. DE EQUIP. GERACAO DE ENERGIA S/A",
          "sector": "Producer Manufacturing",
          "m1": 5.660377358490565,
          "m3": 7.692307692307709,
          "score": 25,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 151
        },
        {
          "symbol": "CEBR3",
          "name": "CIA ENERGETICA DE BRASILIA",
          "sector": "Utilities",
          "m1": 9.47589098532493,
          "m3": 5.452342487883666,
          "score": 25,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 152
        },
        {
          "symbol": "DESK3",
          "name": "DESKTOP S.A.",
          "sector": "Communications",
          "m1": 1.4084507042253502,
          "m3": 8.907563025210074,
          "score": 24,
          "benchmark": "SMLL",
          "rank": 153
        },
        {
          "symbol": "RANI3",
          "name": "IRANI PAPEL E EMBALAGEM S.A.",
          "sector": "Process Industries",
          "m1": 6.751592356687919,
          "m3": 5.40880503144654,
          "score": 24,
          "benchmark": "SMLL",
          "rank": 154
        },
        {
          "symbol": "AZEV4",
          "name": "AZEVEDO E TRAVASSOS S.A.",
          "sector": "Industrial Services",
          "m1": 1.4598540145985162,
          "m3": 6.923076923076921,
          "score": 23,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 155
        },
        {
          "symbol": "OBTC3",
          "name": "ORANJEBTC S.A. - EDUCAÇÃO E INVESTIMENTO",
          "sector": "Technology Services",
          "m1": -8.321964529331517,
          "m3": 11.627906976744185,
          "score": 23,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 156
        },
        {
          "symbol": "ESPA3",
          "name": "MPM CORPÓREOS S.A.",
          "sector": "Consumer Services",
          "m1": 10.277777777777786,
          "m3": 1.0178117048346147,
          "score": 22,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 157
        },
        {
          "symbol": "SANB3",
          "name": "BCO SANTANDER (BRASIL) S.A.",
          "sector": "Finance",
          "m1": -3.6838580040187474,
          "m3": 8.446455505279049,
          "score": 22,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 158
        },
        {
          "symbol": "EQPA3",
          "name": "EQUATORIAL PARA DISTRIBUIDORA DE ENERGIA S.A.",
          "sector": "Utilities",
          "m1": 2.914389799635697,
          "m3": 4.629629629629628,
          "score": 21,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 159
        },
        {
          "symbol": "MILS3",
          "name": "MILLS LOCAÇÃO. SERVIÇOS E LOGÍSTICA S.A",
          "sector": "Finance",
          "m1": 1.953371140516702,
          "m3": 5.064935064935061,
          "score": 21,
          "benchmark": "SMLL",
          "rank": 160
        },
        {
          "symbol": "EALT4",
          "name": "ELECTRO ACO ALTONA S.A.",
          "sector": "Producer Manufacturing",
          "m1": 7.826086956521738,
          "m3": 1.7227235438884492,
          "score": 20,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 161
        },
        {
          "symbol": "CEBR5",
          "name": "CIA ENERGETICA DE BRASILIA",
          "sector": "Utilities",
          "m1": 6.1681453316434265,
          "m3": 2.5295797633618777,
          "score": 20,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 162
        },
        {
          "symbol": "CBAV3",
          "name": "COMPANHIA BRASILEIRA DE ALUMÍNIO",
          "sector": "Non-Energy Minerals",
          "m1": 0.3571428571428559,
          "m3": 3.9777983348751045,
          "score": 19,
          "benchmark": "SMLL",
          "rank": 163
        },
        {
          "symbol": "SAUD3",
          "name": "BRADSAÚDE S.A.",
          "sector": "Health Services",
          "m1": 1.3548387096774306,
          "m3": 3.0163934426229666,
          "score": 19,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 164
        },
        {
          "symbol": "CASH3",
          "name": "MÉLIUZ S.A.",
          "sector": "Commercial Services",
          "m1": -4.545454545454552,
          "m3": 5.882352941176472,
          "score": 18,
          "benchmark": "SMLL",
          "rank": 165
        },
        {
          "symbol": "UNIP6",
          "name": "UNIPAR CARBOCLORO S.A.",
          "sector": "Process Industries",
          "m1": 7.730234196161301,
          "m3": -1.1791309966079688,
          "score": 18,
          "benchmark": "SMLL",
          "rank": 166
        },
        {
          "symbol": "SYNE3",
          "name": "SYN PROP E TECH S.A.",
          "sector": "Finance",
          "m1": 8.48806366047745,
          "m3": -1.6826923076923128,
          "score": 17,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 167
        },
        {
          "symbol": "WHRL4",
          "name": "WHIRLPOOL S.A.",
          "sector": "Consumer Durables",
          "m1": 6.970509383378021,
          "m3": -1.2376237623762387,
          "score": 17,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 168
        },
        {
          "symbol": "MNPR3",
          "name": "MINUPAR PARTICIPACOES S.A.",
          "sector": "Process Industries",
          "m1": -0.4975124378109319,
          "m3": 2.564102564102577,
          "score": 16,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 169
        },
        {
          "symbol": "KLBN3",
          "name": "KLABIN S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -9.443099273607736,
          "m3": 6.857142857142873,
          "score": 16,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 170
        },
        {
          "symbol": "UNIP3",
          "name": "UNIPAR CARBOCLORO S.A.",
          "sector": "Process Industries",
          "m1": 4.605498036415567,
          "m3": -0.8795669824086527,
          "score": 15,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 171
        },
        {
          "symbol": "DMVF3",
          "name": "D1000 VAREJO FARMA PARTICIPAÇÕES S.A.",
          "sector": "Distribution Services",
          "m1": 3.076923076923088,
          "m3": -0.29761904761904656,
          "score": 15,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 172
        },
        {
          "symbol": "SCAR3",
          "name": "SAO CARLOS EMPREEND E PARTICIPACOES S.A.",
          "sector": "Finance",
          "m1": -0.23201856148491462,
          "m3": 1.2558869701726927,
          "score": 14,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 173
        },
        {
          "symbol": "KLBN4",
          "name": "KLABIN S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -5.46875,
          "m3": 4.011461318051568,
          "score": 14,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 174
        },
        {
          "symbol": "CEBR6",
          "name": "CIA ENERGETICA DE BRASILIA",
          "sector": "Utilities",
          "m1": 2.306306306306305,
          "m3": -0.5604203152364318,
          "score": 13,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 175
        },
        {
          "symbol": "SANB4",
          "name": "BCO SANTANDER (BRASIL) S.A.",
          "sector": "Finance",
          "m1": -3.1735313977042545,
          "m3": 2.0640569395017794,
          "score": 13,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 176
        },
        {
          "symbol": "ETER3",
          "name": "ETERNIT S.A.",
          "sector": "Non-Energy Minerals",
          "m1": 0,
          "m3": -0.7999999999999896,
          "score": 12,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 177
        },
        {
          "symbol": "BRAP3",
          "name": "BRADESPAR S.A.",
          "sector": "Finance",
          "m1": -3.4357105674128086,
          "m3": 1.0348583877995754,
          "score": 12,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 178
        },
        {
          "symbol": "AGRO3",
          "name": "BRASILAGRO - CIA BRAS DE PROP AGRICOLAS",
          "sector": "Finance",
          "m1": -1.0373443983402675,
          "m3": -0.31347962382446415,
          "score": 11,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 179
        },
        {
          "symbol": "AZTE3",
          "name": "AZEVEDO & TRAVASSOS ENERGIA S.A.",
          "sector": "Energy Minerals",
          "m1": -10.909090909090901,
          "m3": 4.255319148936176,
          "score": 11,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 180
        },
        {
          "symbol": "OPCT3",
          "name": "OCEANPACT SERVICOS MARITIMOS S.A.",
          "sector": "Commercial Services",
          "m1": -2.331838565022415,
          "m3": -2.506714413607869,
          "score": 10,
          "benchmark": "SMLL",
          "rank": 181
        },
        {
          "symbol": "TTEN3",
          "name": "TRÊS TENTOS AGROINDUSTRIAL S/A",
          "sector": "Commercial Services",
          "m1": 15.01272264631044,
          "m3": -12.233009708737852,
          "score": 10,
          "benchmark": "SMLL",
          "rank": 182
        },
        {
          "symbol": "PDGR3",
          "name": "PDG REALTY S.A. EMPREEND E PARTICIPACOES",
          "sector": "Finance",
          "m1": 0,
          "m3": -5.511811023622048,
          "score": 9,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 183
        },
        {
          "symbol": "POMO3",
          "name": "MARCOPOLO S.A.",
          "sector": "Producer Manufacturing",
          "m1": 8.450704225352123,
          "m3": -11.494252873563216,
          "score": 9,
          "benchmark": "SMLL",
          "rank": 184
        },
        {
          "symbol": "USIM3",
          "name": "USINAS SID DE MINAS GERAIS S.A.-USIMINAS",
          "sector": "Non-Energy Minerals",
          "m1": -0.8474576271186529,
          "m3": -7.509881422924902,
          "score": 8,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 185
        },
        {
          "symbol": "TCSA3",
          "name": "TECNISA S.A.",
          "sector": "Finance",
          "m1": 0,
          "m3": -10.8108108108108,
          "score": 8,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 186
        },
        {
          "symbol": "AALR3",
          "name": "ALLIANÇA SAÚDE E PARTICIPAÇÕES S.A.",
          "sector": "Health Services",
          "m1": -10.882352941176476,
          "m3": -5.312500000000009,
          "score": 7,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 187
        },
        {
          "symbol": "CAMB3",
          "name": "CAMBUCI S.A.",
          "sector": "Consumer Non-Durables",
          "m1": -4.098360655737698,
          "m3": -12.872340425531926,
          "score": 7,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 188
        },
        {
          "symbol": "AZUL3",
          "name": "AZUL S.A.",
          "sector": "Transportation",
          "m1": 0.4432132963988922,
          "m3": -19.458018658374066,
          "score": 6,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 189
        },
        {
          "symbol": "BRKM3",
          "name": "BRASKEM S.A.",
          "sector": "Process Industries",
          "m1": 2.0930232558139528,
          "m3": -22.438162544169614,
          "score": 6,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 190
        },
        {
          "symbol": "EPAR3",
          "name": "EMBPAR PARTICIPACOES S.A.",
          "sector": "Producer Manufacturing",
          "m1": -8.955223880597018,
          "m3": -18.666666666666664,
          "score": 5,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 191
        },
        {
          "symbol": "BSLI4",
          "name": "BRB BCO DE BRASILIA S.A.",
          "sector": "Finance",
          "m1": -7.031250000000011,
          "m3": -20.666666666666668,
          "score": 5,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 192
        },
        {
          "symbol": "AXIA6",
          "name": "AXIA ENERGIA S.A.",
          "sector": "Não classificado",
          "m1": -18.271062271062267,
          "m3": -16.584417526544048,
          "score": 4,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 193
        },
        {
          "symbol": "IFCM3",
          "name": "INFRACOMMERCE CXAAS S.A.",
          "sector": "Distribution Services",
          "m1": -7.14285714285714,
          "m3": -24.271844660194176,
          "score": 4,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 194
        },
        {
          "symbol": "INEP4",
          "name": "INEPAR S.A. INDUSTRIA E CONSTRUCOES",
          "sector": "Producer Manufacturing",
          "m1": -8.633093525179847,
          "m3": -24.852071005917153,
          "score": 3,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 195
        },
        {
          "symbol": "INEP3",
          "name": "INEPAR S.A. INDUSTRIA E CONSTRUCOES",
          "sector": "Producer Manufacturing",
          "m1": -7.142857142857128,
          "m3": -27.37430167597765,
          "score": 3,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 196
        },
        {
          "symbol": "BSLI3",
          "name": "BRB BCO DE BRASILIA S.A.",
          "sector": "Finance",
          "m1": -19.083969465648853,
          "m3": -29.333333333333332,
          "score": 2,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 197
        },
        {
          "symbol": "BRKM5",
          "name": "BRASKEM S.A.",
          "sector": "Process Industries",
          "m1": -17.85714285714286,
          "m3": -37.031700288184446,
          "score": 2,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 198
        },
        {
          "symbol": "ENJU3",
          "name": "ENJOEI S.A.",
          "sector": "Retail Trade",
          "m1": -2.3076923076923075,
          "m3": -18.06451612903226,
          "score": 1,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 199,
          "relativeScore": -33.13
        },
        {
          "symbol": "ORVR3",
          "name": "ORIZON VALORIZACAO DE RESIDUOS S.A.",
          "sector": "Utilities",
          "m1": 24.900737379466833,
          "m3": -70.95753099446056,
          "score": 1,
          "benchmark": "SMLL",
          "rank": 200
        },
        {
          "symbol": "LUPA3",
          "name": "LUPATECH S.A.",
          "sector": "Producer Manufacturing",
          "m1": 14.08839779005524,
          "m3": -39.42857142857143,
          "score": 0,
          "benchmark": "B3 fora de IBOV/SMLL",
          "rank": 201,
          "relativeScore": -41.28
        }
      ]
    },
    "fii": {
      "key": "fii",
      "label": "FIIs",
      "benchmark": "IFIX",
      "items": [
        {
          "symbol": "RBRL11",
          "name": "RBR Logística",
          "sector": "Híbridos",
          "m1": 17.832647462277084,
          "m3": 19.804741980474194,
          "score": 100,
          "rank": 1
        },
        {
          "symbol": "JSRE11",
          "name": "JS Real Estate Multigestão",
          "sector": "Lajes corporativas",
          "m1": 15.853860142172248,
          "m3": 18.238569259321746,
          "score": 99,
          "rank": 2
        },
        {
          "symbol": "RBRP11",
          "name": "RBR Properties",
          "sector": "Lajes corporativas",
          "m1": 17.304347826086964,
          "m3": 13.88771633600674,
          "score": 98,
          "rank": 3
        },
        {
          "symbol": "VGRI11",
          "name": "Valora Gestão de Renda Imobiliária",
          "sector": "Outros",
          "m1": 15.283018867924536,
          "m3": 14.205607476635528,
          "score": 97,
          "rank": 4
        },
        {
          "symbol": "XPLG11",
          "name": "XP Logística",
          "sector": "Logística",
          "m1": 11.663208474391173,
          "m3": 13.384342426258588,
          "score": 96,
          "rank": 5
        },
        {
          "symbol": "TGAR11",
          "name": "TG Ativo Real",
          "sector": "Híbridos",
          "m1": 21.37281910009181,
          "m3": 4.942437475188566,
          "score": 95,
          "rank": 6
        },
        {
          "symbol": "KORE11",
          "name": "Kinea Oportunidades Real Estate",
          "sector": "Outros",
          "m1": 8.912089574822213,
          "m3": 10.483499616270153,
          "score": 94,
          "rank": 7
        },
        {
          "symbol": "HSML11",
          "name": "HSI Malls",
          "sector": "Shopping",
          "m1": 12.853873027346108,
          "m3": 8.050749711649363,
          "score": 93,
          "rank": 8
        },
        {
          "symbol": "FATN11",
          "name": "BR Capital Distribuição",
          "sector": "Outros",
          "m1": 8.599752168525399,
          "m3": 9.632224168126102,
          "score": 92,
          "rank": 9
        },
        {
          "symbol": "BRCR11",
          "name": "BTG Pactual Corporate Office",
          "sector": "Lajes corporativas",
          "m1": 8.84004884004883,
          "m3": 9.079784630445431,
          "score": 91,
          "rank": 10
        },
        {
          "symbol": "PMLL11",
          "name": "Pátria Malls",
          "sector": "Shopping",
          "m1": 7.229500242600673,
          "m3": 9.50351798632445,
          "score": 90,
          "rank": 11
        },
        {
          "symbol": "VISC11",
          "name": "Vinci Shopping Centers",
          "sector": "Shopping",
          "m1": 9.97491800115764,
          "m3": 7.89324247586598,
          "score": 90,
          "rank": 12
        },
        {
          "symbol": "URPR11",
          "name": "Urca Prime Renda",
          "sector": "Outros",
          "m1": 8.43989769820972,
          "m3": 8.384458077709622,
          "score": 89,
          "rank": 13
        },
        {
          "symbol": "BPML11",
          "name": "BTG Pactual Shoppings",
          "sector": "Shopping",
          "m1": 7.721872816212438,
          "m3": 7.409127859714304,
          "score": 88,
          "rank": 14
        },
        {
          "symbol": "RCRB11",
          "name": "Rio Bravo Renda Corporativa",
          "sector": "Lajes corporativas",
          "m1": 8.201438848920862,
          "m3": 6.67463043153651,
          "score": 87,
          "rank": 15
        },
        {
          "symbol": "PCIP11",
          "name": "Polocred Índices de Preços",
          "sector": "Papel/CRI",
          "m1": 9.881965413121051,
          "m3": 5.661871453081702,
          "score": 86,
          "rank": 16
        },
        {
          "symbol": "VILG11",
          "name": "Vinci Logística",
          "sector": "Logística",
          "m1": 8.953301127214154,
          "m3": 6.161087866108783,
          "score": 85,
          "rank": 17
        },
        {
          "symbol": "GARE11",
          "name": "Guardian Real Estate",
          "sector": "Outros",
          "m1": 4.389086595492309,
          "m3": 8.241082410824108,
          "score": 84,
          "rank": 18
        },
        {
          "symbol": "HGLG11",
          "name": "CSHG Logística",
          "sector": "Logística",
          "m1": 7.607211144496051,
          "m3": 6.408265244108313,
          "score": 83,
          "rank": 19
        },
        {
          "symbol": "BBIG11",
          "name": "BB Renda Imobiliária",
          "sector": "Outros",
          "m1": 14.426877470355738,
          "m3": 2.659574468085113,
          "score": 82,
          "rank": 20
        },
        {
          "symbol": "IRIM11",
          "name": "Iridium Recebíveis Imobiliários",
          "sector": "Papel/CRI",
          "m1": 11.637790127492643,
          "m3": 4.052407068860453,
          "score": 81,
          "rank": 21
        },
        {
          "symbol": "LIFE11",
          "name": "Life Capital Partners",
          "sector": "Lajes corporativas",
          "m1": 6.113537117903922,
          "m3": 6.891495601173014,
          "score": 80,
          "rank": 22
        },
        {
          "symbol": "JSAF11",
          "name": "JS Ativos Financeiros",
          "sector": "Híbridos",
          "m1": 9.116809116809122,
          "m3": 5.075445816186552,
          "score": 79,
          "rank": 23
        },
        {
          "symbol": "KFOF11",
          "name": "Kinea Fundo de Fundos",
          "sector": "Híbridos",
          "m1": 6.236365969459778,
          "m3": 6.359198355601237,
          "score": 78,
          "rank": 24
        },
        {
          "symbol": "HGRE11",
          "name": "CSHG Real Estate",
          "sector": "Lajes corporativas",
          "m1": 10.750719330368819,
          "m3": 3.774509803921555,
          "score": 77,
          "rank": 25
        },
        {
          "symbol": "XPSF11",
          "name": "XP Seleção FOF",
          "sector": "Híbridos",
          "m1": 3.105590062111796,
          "m3": 7.792207792207795,
          "score": 76,
          "rank": 26
        },
        {
          "symbol": "VRTA11",
          "name": "Fator Verità",
          "sector": "Papel/CRI",
          "m1": 7.48185371300949,
          "m3": 5.191256830601088,
          "score": 75,
          "rank": 27
        },
        {
          "symbol": "KNRI11",
          "name": "Kinea Renda Imobiliária",
          "sector": "Outros",
          "m1": 5.598676676421932,
          "m3": 6.091403004154694,
          "score": 74,
          "rank": 28
        },
        {
          "symbol": "BROF11",
          "name": "BR Properties Corporate Offices",
          "sector": "Outros",
          "m1": 6.281945589447635,
          "m3": 5.672131147540971,
          "score": 73,
          "rank": 29
        },
        {
          "symbol": "HFOF11",
          "name": "Hedge Top FOFII",
          "sector": "Híbridos",
          "m1": 4.761904761904767,
          "m3": 5.939004815409299,
          "score": 72,
          "rank": 30
        },
        {
          "symbol": "BCIA11",
          "name": "Bradesco Carteira Imobiliária Ativa",
          "sector": "Híbridos",
          "m1": 5.284090909090922,
          "m3": 5.656289200593001,
          "score": 71,
          "rank": 31
        },
        {
          "symbol": "CPTS11",
          "name": "Capitânia Securities II",
          "sector": "Papel/CRI",
          "m1": 6.016042780748654,
          "m3": 5.1724137931034475,
          "score": 70,
          "rank": 32
        },
        {
          "symbol": "RPRI11",
          "name": "RBCap Renda Imobiliária",
          "sector": "Papel/CRI",
          "m1": 9.75270908585717,
          "m3": 2.784283112151975,
          "score": 70,
          "rank": 33
        },
        {
          "symbol": "VGHF11",
          "name": "Valora Hedge Fund",
          "sector": "Outros",
          "m1": 15.968063872255488,
          "m3": -0.8532423208191253,
          "score": 69,
          "rank": 34
        },
        {
          "symbol": "TOPP11",
          "name": "Torre Almirante",
          "sector": "Outros",
          "m1": 6.08294930875577,
          "m3": 3.8496240601503695,
          "score": 68,
          "rank": 35
        },
        {
          "symbol": "VCJR11",
          "name": "Vectis Juros Real",
          "sector": "Papel/CRI",
          "m1": 12.009583707696914,
          "m3": 0.4836109618484574,
          "score": 67,
          "rank": 36
        },
        {
          "symbol": "ALZR11",
          "name": "Alianza Trust Renda Imobiliária",
          "sector": "Outros",
          "m1": 4.809619238476959,
          "m3": 4.287138584247274,
          "score": 66,
          "rank": 37
        },
        {
          "symbol": "PSEC11",
          "name": "Pátria Securitizadora",
          "sector": "Papel/CRI",
          "m1": 8.26697004171406,
          "m3": 2.3847946924870023,
          "score": 65,
          "rank": 38
        },
        {
          "symbol": "VINO11",
          "name": "Vinci Offices",
          "sector": "Lajes corporativas",
          "m1": 9.324009324009342,
          "m3": 1.7353579175704903,
          "score": 64,
          "rank": 39
        },
        {
          "symbol": "CPSH11",
          "name": "Capitânia Shopping",
          "sector": "Outros",
          "m1": 7.1949947862356645,
          "m3": 2.8000000000000025,
          "score": 63,
          "rank": 40
        },
        {
          "symbol": "DEVA11",
          "name": "Devant Recebíveis Imobiliários",
          "sector": "Papel/CRI",
          "m1": 8.37292161520191,
          "m3": 1.8983807928531604,
          "score": 62,
          "rank": 41
        },
        {
          "symbol": "RBFM11",
          "name": "Rio Bravo Renda Comercial",
          "sector": "Híbridos",
          "m1": 7.589743589743603,
          "m3": 2.2417153996101336,
          "score": 61,
          "rank": 42
        },
        {
          "symbol": "HGCR11",
          "name": "CSHG Recebíveis Imobiliários",
          "sector": "Papel/CRI",
          "m1": 1.4232287554539758,
          "m3": 5.5459459459459515,
          "score": 60,
          "rank": 43
        },
        {
          "symbol": "KNIP11",
          "name": "Kinea Índices de Preços",
          "sector": "Papel/CRI",
          "m1": 5.927170868347353,
          "m3": 3.0408719346049162,
          "score": 59,
          "rank": 44
        },
        {
          "symbol": "KNHF11",
          "name": "Kinea Hedge Fund",
          "sector": "Papel/CRI",
          "m1": 6.1119615132298355,
          "m3": 2.5898520084566723,
          "score": 58,
          "rank": 45
        },
        {
          "symbol": "ITRI11",
          "name": "Inter Títulos Imobiliários",
          "sector": "Outros",
          "m1": 2.6522226372805324,
          "m3": 4.407294832826758,
          "score": 57,
          "rank": 46
        },
        {
          "symbol": "PORD11",
          "name": "Polo FII Recebíveis Imobiliários",
          "sector": "Outros",
          "m1": 4.842615012106544,
          "m3": 2.7283511269276417,
          "score": 56,
          "rank": 47
        },
        {
          "symbol": "KCRE11",
          "name": "Kinea Crédito Agro",
          "sector": "Papel/CRI",
          "m1": 6.982248520710055,
          "m3": 1.2318029115341522,
          "score": 55,
          "rank": 48
        },
        {
          "symbol": "BTLG11",
          "name": "BTG Pactual Logística",
          "sector": "Logística",
          "m1": 4.681274900398402,
          "m3": 2.4366471734892814,
          "score": 54,
          "rank": 49
        },
        {
          "symbol": "BTHF11",
          "name": "BTG Pactual Hedge Fund",
          "sector": "Híbridos",
          "m1": 5.142857142857138,
          "m3": 2.1087680355160954,
          "score": 53,
          "rank": 50
        },
        {
          "symbol": "SNCI11",
          "name": "Suno Recebíveis Imobiliários",
          "sector": "Outros",
          "m1": 7.8354071701367545,
          "m3": 0.6091954022988455,
          "score": 52,
          "rank": 51
        },
        {
          "symbol": "XPCI11",
          "name": "XP Crédito Imobiliário",
          "sector": "Papel/CRI",
          "m1": 6.860494771741887,
          "m3": 0.7211538461538325,
          "score": 51,
          "rank": 52
        },
        {
          "symbol": "XPML11",
          "name": "XP Malls",
          "sector": "Shopping",
          "m1": 4.465925567907192,
          "m3": 1.962449287668644,
          "score": 50,
          "rank": 53
        },
        {
          "symbol": "HGRU11",
          "name": "CSHG Renda Urbana",
          "sector": "Outros",
          "m1": 10.911795589779484,
          "m3": -1.5228032009944936,
          "score": 50,
          "rank": 54
        },
        {
          "symbol": "RBRY11",
          "name": "RBR Crédito Imobiliário",
          "sector": "Papel/CRI",
          "m1": 5.272639923132361,
          "m3": 1.4702477425330152,
          "score": 49,
          "rank": 55
        },
        {
          "symbol": "AFHI11",
          "name": "AF Invest Cri",
          "sector": "Papel/CRI",
          "m1": 3.1573389651531114,
          "m3": 2.4863617289131446,
          "score": 48,
          "rank": 56
        },
        {
          "symbol": "BTAL11",
          "name": "BTG Pactual Agro Logística",
          "sector": "Outros",
          "m1": 5.084340232085172,
          "m3": 1.3031945565678882,
          "score": 47,
          "rank": 57
        },
        {
          "symbol": "BCRI11",
          "name": "Banestes Recebíveis Imobiliários",
          "sector": "Papel/CRI",
          "m1": 8.35489833641403,
          "m3": -0.7450050795800967,
          "score": 46,
          "rank": 58
        },
        {
          "symbol": "CYCR11",
          "name": "Cyrela Crédito Imobiliário",
          "sector": "Outros",
          "m1": 6.295399515738498,
          "m3": 0.22831050228309113,
          "score": 45,
          "rank": 59
        },
        {
          "symbol": "VGIR11",
          "name": "Valora RE III",
          "sector": "Papel/CRI",
          "m1": 1.5479876160990669,
          "m3": 2.5000000000000133,
          "score": 44,
          "rank": 60
        },
        {
          "symbol": "GTWR11",
          "name": "Green Towers Brasília",
          "sector": "Lajes corporativas",
          "m1": 5.100443516827546,
          "m3": 0.39875389408099426,
          "score": 43,
          "rank": 61
        },
        {
          "symbol": "HABT11",
          "name": "Habitat II",
          "sector": "Papel/CRI",
          "m1": 8.125960061443948,
          "m3": -1.4421730607672933,
          "score": 42,
          "rank": 62
        },
        {
          "symbol": "RBRX11",
          "name": "RBR Plus Multiestratégia",
          "sector": "Híbridos",
          "m1": 9.392265193370154,
          "m3": -2.2222222222222143,
          "score": 41,
          "rank": 63
        },
        {
          "symbol": "KIVO11",
          "name": "Kilima Vesta",
          "sector": "Papel/CRI",
          "m1": 8.630111173921229,
          "m3": -1.8389238889834791,
          "score": 40,
          "rank": 64
        },
        {
          "symbol": "HGBS11",
          "name": "Hedge Brasil Shopping",
          "sector": "Shopping",
          "m1": 4.186795491143314,
          "m3": 0.5178663904712666,
          "score": 39,
          "rank": 65
        },
        {
          "symbol": "RZTR11",
          "name": "Riza Terrax",
          "sector": "Outros",
          "m1": 2.9686575990538255,
          "m3": 1.1149825783972167,
          "score": 38,
          "rank": 66
        },
        {
          "symbol": "PVBI11",
          "name": "VBI Prime Properties",
          "sector": "Lajes corporativas",
          "m1": 5.605707629586476,
          "m3": -0.5075445816186575,
          "score": 37,
          "rank": 67
        },
        {
          "symbol": "TRBL11",
          "name": "TRBL11",
          "sector": "Logística",
          "m1": 14.35886931585415,
          "m3": -5.244399185336057,
          "score": 36,
          "rank": 68
        },
        {
          "symbol": "HTMX11",
          "name": "Hotel Maxinvest",
          "sector": "Outros",
          "m1": 2.908689248895424,
          "m3": 0.7207207207207134,
          "score": 35,
          "rank": 69
        },
        {
          "symbol": "LVBI11",
          "name": "VBI Logística",
          "sector": "Logística",
          "m1": 5.177529929397329,
          "m3": -0.6091665055115048,
          "score": 34,
          "rank": 70
        },
        {
          "symbol": "SNFF11",
          "name": "Suno Fundo de Fundos",
          "sector": "Híbridos",
          "m1": 3.9851449792886573,
          "m3": -0.1371742112482921,
          "score": 33,
          "rank": 71
        },
        {
          "symbol": "SPXS11",
          "name": "Apex SPX Crédito Imobiliário",
          "sector": "Outros",
          "m1": 6.451612903225801,
          "m3": -1.492537313432829,
          "score": 32,
          "rank": 72
        },
        {
          "symbol": "HSAF11",
          "name": "HSI Ativos Financeiros",
          "sector": "Outros",
          "m1": 2.9147982062780464,
          "m3": 0.3214193880174854,
          "score": 31,
          "rank": 73
        },
        {
          "symbol": "ICRI11",
          "name": "Integral Brei CRI",
          "sector": "Papel/CRI",
          "m1": 4.584269662921336,
          "m3": -0.6086492258409071,
          "score": 30,
          "rank": 74
        },
        {
          "symbol": "MANA11",
          "name": "MANA FII",
          "sector": "Outros",
          "m1": 0.8695652173912993,
          "m3": 1.3100436681222627,
          "score": 30,
          "rank": 75
        },
        {
          "symbol": "TEPP11",
          "name": "Tellus Properties",
          "sector": "Lajes corporativas",
          "m1": 4.295302013422808,
          "m3": -0.8928571428571508,
          "score": 29,
          "rank": 76
        },
        {
          "symbol": "RBVA11",
          "name": "Rio Bravo Renda Varejo",
          "sector": "Outros",
          "m1": 2.7554535017221493,
          "m3": -0.22296544035675936,
          "score": 28,
          "rank": 77
        },
        {
          "symbol": "KNSC11",
          "name": "Kinea Securities",
          "sector": "Papel/CRI",
          "m1": 2.3385300668151254,
          "m3": -0.21715526601521207,
          "score": 27,
          "rank": 78
        },
        {
          "symbol": "MCCI11",
          "name": "Mauá Capital Recebíveis",
          "sector": "Papel/CRI",
          "m1": 0.12671594508975037,
          "m3": 0.9045440034053387,
          "score": 26,
          "rank": 79
        },
        {
          "symbol": "MCRE11",
          "name": "Mauá Capital Real Estate",
          "sector": "Papel/CRI",
          "m1": 7.283950617283952,
          "m3": -3.0133928571428714,
          "score": 25,
          "rank": 80
        },
        {
          "symbol": "RZAK11",
          "name": "Riza Akin",
          "sector": "Papel/CRI",
          "m1": 2.615540883697287,
          "m3": -1.2463343108504499,
          "score": 24,
          "rank": 81
        },
        {
          "symbol": "HSLG11",
          "name": "HSI Logística",
          "sector": "Logística",
          "m1": 9.912280701754383,
          "m3": -5.17837837837839,
          "score": 23,
          "rank": 82
        },
        {
          "symbol": "GGRC11",
          "name": "GGR Covepi Renda Imobiliária",
          "sector": "Logística",
          "m1": 4.999999999999982,
          "m3": -2.6776519052523318,
          "score": 22,
          "rank": 83
        },
        {
          "symbol": "BRCO11",
          "name": "Bresco Logística",
          "sector": "Logística",
          "m1": 1.0720720720720722,
          "m3": -0.9272341928647121,
          "score": 21,
          "rank": 84
        },
        {
          "symbol": "OUJP11",
          "name": "Ourinvest JPP",
          "sector": "Papel/CRI",
          "m1": 1.907118940165975,
          "m3": -1.4084507042253502,
          "score": 20,
          "rank": 85
        },
        {
          "symbol": "RBRR11",
          "name": "RBR Rendimento High Grade",
          "sector": "Papel/CRI",
          "m1": 4.5460864729598205,
          "m3": -2.829822974544516,
          "score": 19,
          "rank": 86
        },
        {
          "symbol": "KNHY11",
          "name": "Kinea High Yield CRI",
          "sector": "Papel/CRI",
          "m1": 4.024931333192483,
          "m3": -2.6399050820644643,
          "score": 18,
          "rank": 87
        },
        {
          "symbol": "KISU11",
          "name": "Kilima FIC de FII SUNO 30",
          "sector": "Híbridos",
          "m1": 4.865771812080544,
          "m3": -3.2507739938080538,
          "score": 17,
          "rank": 88
        },
        {
          "symbol": "CLIN11",
          "name": "Clave Índices de Preços",
          "sector": "Papel/CRI",
          "m1": 2.112029384756653,
          "m3": -1.7776305619962463,
          "score": 16,
          "rank": 89
        },
        {
          "symbol": "RZAT11",
          "name": "Riza Agro",
          "sector": "Outros",
          "m1": 4.060047765267827,
          "m3": -2.979535574170289,
          "score": 15,
          "rank": 90
        },
        {
          "symbol": "VGIP11",
          "name": "Valora CRI Índice de Preço",
          "sector": "Papel/CRI",
          "m1": 4.236148466917711,
          "m3": -3.209290709290702,
          "score": 14,
          "rank": 91
        },
        {
          "symbol": "MXRF11",
          "name": "Maxi Renda",
          "sector": "Papel/CRI",
          "m1": 3.1659388646288145,
          "m3": -2.77777777777779,
          "score": 13,
          "rank": 92
        },
        {
          "symbol": "TVRI11",
          "name": "Tivio Renda Imobiliária",
          "sector": "Outros",
          "m1": 3.124999999999978,
          "m3": -2.761104441776707,
          "score": 12,
          "rank": 93
        },
        {
          "symbol": "RECR11",
          "name": "REC Recebíveis Imobiliários",
          "sector": "Papel/CRI",
          "m1": 3.1926262356398727,
          "m3": -3.1347962382445194,
          "score": 11,
          "rank": 94
        },
        {
          "symbol": "KNUQ11",
          "name": "Kinea Unique",
          "sector": "Papel/CRI",
          "m1": 0.0972289742343202,
          "m3": -1.8589132507149664,
          "score": 10,
          "rank": 95
        },
        {
          "symbol": "WHGR11",
          "name": "WHG Real Estate",
          "sector": "Outros",
          "m1": 1.2658227848101333,
          "m3": -2.5470653377629993,
          "score": 10,
          "rank": 96
        },
        {
          "symbol": "BTCI11",
          "name": "BTG Pactual Crédito Imobiliário",
          "sector": "Papel/CRI",
          "m1": -0.5524861878453136,
          "m3": -1.6393442622950838,
          "score": 9,
          "rank": 97
        },
        {
          "symbol": "KNCR11",
          "name": "Kinea Rendimentos Imobiliários",
          "sector": "Papel/CRI",
          "m1": -1.301010857356799,
          "m3": -2.3791890390668313,
          "score": 8,
          "rank": 98
        },
        {
          "symbol": "VRTM11",
          "name": "Fator Verità Multiestratégia",
          "sector": "Outros",
          "m1": 1.2066365007541435,
          "m3": -4.142857142857148,
          "score": 7,
          "rank": 99
        },
        {
          "symbol": "AZPL11",
          "name": "AZ Quest Panorama Logística",
          "sector": "Logística",
          "m1": -0.4120879120879106,
          "m3": -3.3333333333333326,
          "score": 6,
          "rank": 100
        },
        {
          "symbol": "SNEL11",
          "name": "Suno Energias Limpas",
          "sector": "Outros",
          "m1": 1.6455696202531511,
          "m3": -4.631828978622332,
          "score": 5,
          "rank": 101
        },
        {
          "symbol": "GZIT11",
          "name": "Gazit Malls",
          "sector": "Outros",
          "m1": 8.588957055214719,
          "m3": -8.570086874853267,
          "score": 4,
          "rank": 102
        },
        {
          "symbol": "HCTR11",
          "name": "Hectare CE",
          "sector": "Papel/CRI",
          "m1": 8.539505187549889,
          "m3": -16.513198281154086,
          "score": 3,
          "rank": 103
        },
        {
          "symbol": "TRXF11",
          "name": "TRX Real Estate",
          "sector": "Outros",
          "m1": 0.7002801120448154,
          "m3": -20.910790892091068,
          "score": 2,
          "rank": 104
        },
        {
          "symbol": "MFII11",
          "name": "Mérito Desenvolvimento Imobiliário",
          "sector": "Outros",
          "m1": 4.4967880085653,
          "m3": -23.405925053953304,
          "score": 1,
          "rank": 105
        },
        {
          "symbol": "CACR11",
          "name": "Cartesia Recebíveis Imobiliários",
          "sector": "Papel/CRI",
          "m1": -3.734707018673533,
          "m3": -27.77777777777778,
          "score": 0,
          "rank": 106
        }
      ]
    },
    "bdr": {
      "key": "bdr",
      "label": "BDRs",
      "benchmark": "Universo BDR",
      "items": [
        {
          "symbol": "M2ST34",
          "name": "MicroStrategy",
          "sector": "Technology Services",
          "m1": 16.648879402347916,
          "m3": 62.16617210682492,
          "score": 100,
          "rank": 1
        },
        {
          "symbol": "P2LT34",
          "name": "Palantir",
          "sector": "Technology Services",
          "m1": 22.831858407079643,
          "m3": 56.86451787893856,
          "score": 97,
          "rank": 2
        },
        {
          "symbol": "MSFT34",
          "name": "Microsoft",
          "sector": "Technology Services",
          "m1": 6.2643678160919425,
          "m3": 32.65574554585675,
          "score": 94,
          "rank": 3
        },
        {
          "symbol": "A1MD34",
          "name": "AMD",
          "sector": "Electronic Technology",
          "m1": 18.90960363465457,
          "m3": 10.929233287539098,
          "score": 91,
          "rank": 4
        },
        {
          "symbol": "PAGS34",
          "name": "PagSeguro",
          "sector": "Commercial Services",
          "m1": 7.392996108949412,
          "m3": 16.701902748414366,
          "score": 88,
          "rank": 5
        },
        {
          "symbol": "SPCX34",
          "name": "SpaceX / Destiny",
          "sector": "Tecnologia",
          "m1": 6.986027944111783,
          "m3": 12.8421052631579,
          "score": 85,
          "rank": 6
        },
        {
          "symbol": "ROXO34",
          "name": "Nu Holdings",
          "sector": "Finance",
          "m1": 4.566929133858277,
          "m3": 13.601368691189041,
          "score": 82,
          "rank": 7
        },
        {
          "symbol": "C2OI34",
          "name": "Coinbase",
          "sector": "Finance",
          "m1": 1.0201190138849459,
          "m3": 11.232449297971915,
          "score": 79,
          "rank": 8
        },
        {
          "symbol": "NVDC34",
          "name": "NVIDIA",
          "sector": "Electronic Technology",
          "m1": 3.0303030303030276,
          "m3": 9.778597785977873,
          "score": 76,
          "rank": 9
        },
        {
          "symbol": "CHVX34",
          "name": "Chevron",
          "sector": "Energy Minerals",
          "m1": -2.8713876835010588,
          "m3": 12.88764888936582,
          "score": 73,
          "rank": 10
        },
        {
          "symbol": "M1TA34",
          "name": "Meta Platforms",
          "sector": "Technology Services",
          "m1": 8.841567291311758,
          "m3": 6.3681012236743495,
          "score": 70,
          "rank": 11
        },
        {
          "symbol": "DISB34",
          "name": "Walt Disney",
          "sector": "Consumer Services",
          "m1": 1.0135135135135087,
          "m3": 10.366041218086753,
          "score": 67,
          "rank": 12
        },
        {
          "symbol": "MUTC34",
          "name": "Micron Technology",
          "sector": "Electronic Technology",
          "m1": 2.6064354648504207,
          "m3": 6.0811147051505365,
          "score": 64,
          "rank": 13
        },
        {
          "symbol": "TSMC34",
          "name": "TSMC",
          "sector": "Electronic Technology",
          "m1": 4.002057991253527,
          "m3": 4.0709005994189695,
          "score": 61,
          "rank": 14
        },
        {
          "symbol": "AMZO34",
          "name": "Amazon",
          "sector": "Retail Trade",
          "m1": 1.4589476951730518,
          "m3": 3.3517786561264806,
          "score": 58,
          "rank": 15
        },
        {
          "symbol": "AAPL34",
          "name": "Apple",
          "sector": "Electronic Technology",
          "m1": 0.6982063320091658,
          "m3": 2.5122549019608087,
          "score": 55,
          "rank": 16
        },
        {
          "symbol": "COCA34",
          "name": "Coca-Cola",
          "sector": "Consumer Non-Durables",
          "m1": -2.6413591717547202,
          "m3": 2.344077019673496,
          "score": 52,
          "rank": 17
        },
        {
          "symbol": "BERK34",
          "name": "Berkshire Hathaway",
          "sector": "Finance",
          "m1": -1.088550914845976,
          "m3": 0.8739469333123306,
          "score": 48,
          "rank": 18
        },
        {
          "symbol": "ITLC34",
          "name": "Intel",
          "sector": "Electronic Technology",
          "m1": 1.6339869281045694,
          "m3": -1.0004547521600626,
          "score": 45,
          "rank": 19
        },
        {
          "symbol": "GOGL34",
          "name": "Alphabet",
          "sector": "Technology Services",
          "m1": 3.387438249823571,
          "m3": -2.528276779773797,
          "score": 42,
          "rank": 20
        },
        {
          "symbol": "LILY34",
          "name": "Eli Lilly",
          "sector": "Health Technology",
          "m1": 2.7087682672233715,
          "m3": -3.354287398094491,
          "score": 39,
          "rank": 21
        },
        {
          "symbol": "ORCL34",
          "name": "Oracle",
          "sector": "Technology Services",
          "m1": -10.48817696414951,
          "m3": 3.164835164835167,
          "score": 36,
          "rank": 22
        },
        {
          "symbol": "MELI34",
          "name": "MercadoLibre",
          "sector": "Retail Trade",
          "m1": -3.045622688039451,
          "m3": -1.044550717342052,
          "score": 33,
          "rank": 23
        },
        {
          "symbol": "WALM34",
          "name": "Walmart",
          "sector": "Retail Trade",
          "m1": 3.0778336786031257,
          "m3": -4.496846723334247,
          "score": 30,
          "rank": 24
        },
        {
          "symbol": "TSLA34",
          "name": "Tesla",
          "sector": "Consumer Durables",
          "m1": 3.372535454859915,
          "m3": -5.217253409451317,
          "score": 27,
          "rank": 25
        },
        {
          "symbol": "JNJB34",
          "name": "Johnson & Johnson",
          "sector": "Health Technology",
          "m1": -4.777105118326896,
          "m3": -1.8938534815150843,
          "score": 24,
          "rank": 26
        },
        {
          "symbol": "BABA34",
          "name": "Alibaba",
          "sector": "Retail Trade",
          "m1": -0.7077856420626971,
          "m3": -4.937076476282664,
          "score": 21,
          "rank": 27
        },
        {
          "symbol": "JPMC34",
          "name": "JPMorgan Chase",
          "sector": "Finance",
          "m1": -7.366666666666665,
          "m3": -2.491228070175433,
          "score": 18,
          "rank": 28
        },
        {
          "symbol": "AVGO34",
          "name": "Broadcom",
          "sector": "Electronic Technology",
          "m1": -1.9011406844106515,
          "m3": -8.445706174591905,
          "score": 15,
          "rank": 29
        },
        {
          "symbol": "NFLX34",
          "name": "Netflix",
          "sector": "Technology Services",
          "m1": -9.020618556701033,
          "m3": -7.349081364829402,
          "score": 12,
          "rank": 30
        },
        {
          "symbol": "BKNG34",
          "name": "Booking Holdings",
          "sector": "Consumer Services",
          "m1": -11.240310077519378,
          "m3": -12.092130518234168,
          "score": 9,
          "rank": 31
        },
        {
          "symbol": "BOAC34",
          "name": "Bank of America",
          "sector": "Finance",
          "m1": -15.570285142571272,
          "m3": -11.05401844532279,
          "score": 6,
          "rank": 32
        },
        {
          "symbol": "NIKE34",
          "name": "Nike",
          "sector": "Consumer Non-Durables",
          "m1": -6.219839142091155,
          "m3": -22.093541202672608,
          "score": 3,
          "rank": 33
        },
        {
          "symbol": "S2GM34",
          "name": "Sigma Lithium",
          "sector": "Non-Energy Minerals",
          "m1": -9.302325581395344,
          "m3": -20.529801324503303,
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
          "score": 100,
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
          "score": 99,
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
          "score": 98,
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
          "score": 97,
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
          "score": 96,
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
          "score": 95,
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
          "score": 94,
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
          "score": 93,
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
          "score": 92,
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
          "score": 91,
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
          "score": 90,
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
          "score": 89,
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
          "score": 88,
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
          "score": 87,
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
          "score": 86,
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
          "score": 85,
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
          "score": 84,
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
          "score": 83,
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
          "score": 82,
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
          "score": 81,
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
          "score": 80,
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
          "score": 79,
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
          "score": 78,
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
          "score": 77,
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
          "score": 76,
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
          "score": 75,
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
          "score": 74,
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
          "score": 73,
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
          "score": 72,
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
          "score": 71,
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
          "score": 70,
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
          "score": 69,
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
          "score": 68,
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
          "score": 67,
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
          "score": 66,
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
          "score": 65,
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
          "score": 64,
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
          "score": 63,
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
          "score": 62,
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
          "score": 61,
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
          "score": 60,
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
          "score": 59,
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
          "score": 58,
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
          "score": 57,
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
          "score": 56,
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
          "score": 55,
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
          "score": 54,
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
          "score": 53,
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
          "score": 52,
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
          "score": 51,
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
          "score": 50,
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
          "score": 50,
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
          "score": 49,
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
          "score": 49,
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
          "score": 48,
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
          "score": 48,
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
          "score": 47,
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
          "score": 47,
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
          "score": 46,
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
          "score": 45,
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
          "symbol": "EMAE4",
          "name": "EMAE - EMPRESA METROP.AGUAS ENERGIA S.A.",
          "sector": "Utilities",
          "m1": 18.61111111111112,
          "m3": 14.140604116546395,
          "score": 44,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 113
        },
        {
          "symbol": "RECV3",
          "name": "PETRORECÔNCAVO S.A.",
          "sector": "Energy Minerals",
          "m1": 7.570422535211279,
          "m3": 19.569471624266143,
          "score": 44,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 114
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
          "rank": 115
        },
        {
          "symbol": "BIOM3",
          "name": "BIOMM S.A.",
          "sector": "Health Technology",
          "m1": 9.552238805970143,
          "m3": 18.38709677419354,
          "score": 43,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 116
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
          "rank": 117
        },
        {
          "symbol": "LEVE3",
          "name": "MAHLE-METAL LEVE S.A.",
          "sector": "Producer Manufacturing",
          "m1": 15.446153846153857,
          "m3": 15.092024539877306,
          "score": 42,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 118
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
          "rank": 119
        },
        {
          "symbol": "TECN3",
          "name": "TECHNOS S.A.",
          "sector": "Consumer Durables",
          "m1": 11.999999999999993,
          "m3": 16.666666666666664,
          "score": 41,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 120
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
          "rank": 121
        },
        {
          "symbol": "BMEB3",
          "name": "BCO MERCANTIL DO BRASIL S.A.",
          "sector": "Finance",
          "m1": 15.108759553203999,
          "m3": 14.05825242718447,
          "score": 40,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 122
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
          "rank": 123
        },
        {
          "symbol": "MYPK3",
          "name": "IOCHPE MAXION S.A.",
          "sector": "Producer Manufacturing",
          "m1": 9.08173562058527,
          "m3": 15.987124463519315,
          "score": 39,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 124
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
          "rank": 125
        },
        {
          "symbol": "ISAE3",
          "name": "ISA ENERGIA BRASIL S.A",
          "sector": "Utilities",
          "m1": 11.420612813370466,
          "m3": 12.464854732895978,
          "score": 38,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 126
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
          "rank": 127
        },
        {
          "symbol": "DEXP3",
          "name": "DEXXOS PARTICIPACOES S.A.",
          "sector": "Process Industries",
          "m1": 9.866666666666669,
          "m3": 12.876712328767129,
          "score": 37,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 128
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
          "rank": 129
        },
        {
          "symbol": "PDTC3",
          "name": "PADTEC HOLDING S.A.",
          "sector": "Electronic Technology",
          "m1": 12.499999999999998,
          "m3": 11.176470588235292,
          "score": 36,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 130
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
          "rank": 131
        },
        {
          "symbol": "FIQE3",
          "name": "UNIFIQUE TELECOMUNICAÇÕES S.A.",
          "sector": "Communications",
          "m1": 23.260437375745525,
          "m3": 5.0847457627118615,
          "score": 35,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 132
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
          "rank": 133
        },
        {
          "symbol": "NUTR3",
          "name": "NUTRIPLANT INDUSTRIA E COMERCIO S.A.",
          "sector": "Process Industries",
          "m1": 10.13215859030837,
          "m3": 11.607142857142847,
          "score": 34,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 134
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
          "rank": 135
        },
        {
          "symbol": "LOGN3",
          "name": "LOG-IN LOGISTICA INTERMODAL S.A.",
          "sector": "Transportation",
          "m1": 10.678571428571423,
          "m3": 10.678571428571423,
          "score": 33,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 136
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
          "rank": 137
        },
        {
          "symbol": "WIZC3",
          "name": "WIZ CO PARTICIPAÇÕES E CORRETAGEM DE SEGUROS S.A.",
          "sector": "Finance",
          "m1": 16.624040920716098,
          "m3": 7.168037602820205,
          "score": 32,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 138
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
          "rank": 139
        },
        {
          "symbol": "BEES3",
          "name": "BANESTES S.A. - BCO EST ESPIRITO SANTO",
          "sector": "Finance",
          "m1": 6.976744186046521,
          "m3": 11.290322580645167,
          "score": 31,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 140
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
          "rank": 141
        },
        {
          "symbol": "GOAU3",
          "name": "METALURGICA GERDAU S.A.",
          "sector": "Non-Energy Minerals",
          "m1": 0.48169556840076044,
          "m3": 13.36956521739131,
          "score": 30,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 142
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
          "rank": 143
        },
        {
          "symbol": "GGBR3",
          "name": "GERDAU S.A.",
          "sector": "Non-Energy Minerals",
          "m1": 0.5041246562786409,
          "m3": 12.924819773429444,
          "score": 29,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 144
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
          "rank": 145
        },
        {
          "symbol": "BMKS3",
          "name": "BICICLETAS MONARK S.A.",
          "sector": "Consumer Durables",
          "m1": 10.193839617631435,
          "m3": 7.232558139534887,
          "score": 28,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 146
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
          "rank": 147
        },
        {
          "symbol": "CGRA4",
          "name": "GRAZZIOTIN S.A.",
          "sector": "Retail Trade",
          "m1": 12.160413971539457,
          "m3": 5.731707317073171,
          "score": 27,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 148
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
          "rank": 149
        },
        {
          "symbol": "CEBR3",
          "name": "CIA ENERGETICA DE BRASILIA",
          "sector": "Utilities",
          "m1": 9.201171058134669,
          "m3": 4.94372990353698,
          "score": 26,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 150
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
          "rank": 151
        },
        {
          "symbol": "AERI3",
          "name": "AERIS IND. E COM. DE EQUIP. GERACAO DE ENERGIA S/A",
          "sector": "Producer Manufacturing",
          "m1": 2.7522935779816535,
          "m3": 7.177033492822985,
          "score": 25,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 152
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
          "rank": 153
        },
        {
          "symbol": "EALT4",
          "name": "ELECTRO ACO ALTONA S.A.",
          "sector": "Producer Manufacturing",
          "m1": 8.771929824561402,
          "m3": 3.161397670549092,
          "score": 24,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 154
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
          "rank": 155
        },
        {
          "symbol": "EQPA3",
          "name": "EQUATORIAL PARA DISTRIBUIDORA DE ENERGIA S.A.",
          "sector": "Utilities",
          "m1": 3.102189781021896,
          "m3": 5.214152700186224,
          "score": 23,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 156
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
          "rank": 157
        },
        {
          "symbol": "OBTC3",
          "name": "ORANJEBTC S.A. - EDUCAÇÃO E INVESTIMENTO",
          "sector": "Technology Services",
          "m1": -10.400000000000004,
          "m3": 11.258278145695359,
          "score": 22,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 158
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
          "rank": 159
        },
        {
          "symbol": "CASH3",
          "name": "MÉLIUZ S.A.",
          "sector": "Commercial Services",
          "m1": -3.9999999999999996,
          "m3": 7.0063694267515935,
          "score": 21,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 160
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
          "rank": 161
        },
        {
          "symbol": "CBAV3",
          "name": "COMPANHIA BRASILEIRA DE ALUMÍNIO",
          "sector": "Non-Energy Minerals",
          "m1": 0.08904719501335517,
          "m3": 3.977798334875113,
          "score": 20,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 162
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
          "rank": 163
        },
        {
          "symbol": "SAUD3",
          "name": "BRADSAÚDE S.A.",
          "sector": "Health Services",
          "m1": 2.1456436931079326,
          "m3": 1.6828478964401397,
          "score": 19,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "SMLL",
          "rank": 164
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
          "rank": 165
        },
        {
          "symbol": "KLBN3",
          "name": "KLABIN S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -8.33333333333333,
          "m3": 6.250000000000005,
          "score": 18,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 166
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
          "rank": 167
        },
        {
          "symbol": "AGRO3",
          "name": "BRASILAGRO - CIA BRAS DE PROP AGRICOLAS",
          "sector": "Finance",
          "m1": 1.7599999999999907,
          "m3": 0.3682272488163952,
          "score": 17,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 168
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
          "rank": 169
        },
        {
          "symbol": "KLBN4",
          "name": "KLABIN S.A.",
          "sector": "Non-Energy Minerals",
          "m1": -5.714285714285719,
          "m3": 4.011461318051566,
          "score": 16,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 170
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
          "rank": 171
        },
        {
          "symbol": "UNIP3",
          "name": "UNIPAR CARBOCLORO S.A.",
          "sector": "Process Industries",
          "m1": 5.4905490549054985,
          "m3": -2.251876563803172,
          "score": 15,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 172
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
          "rank": 173
        },
        {
          "symbol": "SYNE3",
          "name": "SYN PROP E TECH S.A.",
          "sector": "Finance",
          "m1": 10.84010840108401,
          "m3": -5.76036866359447,
          "score": 14,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "SMLL",
          "rank": 174
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
          "rank": 175
        },
        {
          "symbol": "SCAR3",
          "name": "SAO CARLOS EMPREEND E PARTICIPACOES S.A.",
          "sector": "Finance",
          "m1": 0,
          "m3": -0.7692307692307665,
          "score": 13,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 176
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
          "rank": 177
        },
        {
          "symbol": "BRAP3",
          "name": "BRADESPAR S.A.",
          "sector": "Finance",
          "m1": -3.5361414456578246,
          "m3": -0.3224073078989722,
          "score": 12,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 178
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
          "rank": 179
        },
        {
          "symbol": "SANB4",
          "name": "BCO SANTANDER (BRASIL) S.A.",
          "sector": "Finance",
          "m1": -5.843729481286937,
          "m3": 0.27972027972027375,
          "score": 11,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 180
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
          "rank": 181
        },
        {
          "symbol": "GFSA3",
          "name": "GAFISA S.A.",
          "sector": "Finance",
          "m1": 46.66666666666667,
          "m3": -30.158730158730158,
          "score": 10,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 182
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
          "rank": 183
        },
        {
          "symbol": "TCSA3",
          "name": "TECNISA S.A.",
          "sector": "Finance",
          "m1": 3.1250000000000027,
          "m3": -8.333333333333325,
          "score": 9,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 184
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
          "rank": 185
        },
        {
          "symbol": "POMO3",
          "name": "MARCOPOLO S.A.",
          "sector": "Producer Manufacturing",
          "m1": 8.70588235294118,
          "m3": -14.602587800369687,
          "score": 8,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 186
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
          "rank": 187
        },
        {
          "symbol": "CAMB3",
          "name": "CAMBUCI S.A.",
          "sector": "Consumer Non-Durables",
          "m1": -2.150537634408599,
          "m3": -13.60759493670887,
          "score": 7,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 188
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
          "rank": 189
        },
        {
          "symbol": "AXIA6",
          "name": "AXIA ENERGIA S.A.",
          "sector": "Não classificado",
          "m1": -13.613133033916668,
          "m3": -13.23689531808991,
          "score": 6,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "SMLL",
          "rank": 190
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
          "rank": 191
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
          "rank": 192
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
          "rank": 193
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
          "rank": 194
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
          "rank": 195
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
          "rank": 196
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
          "rank": 197
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
          "rank": 198
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
          "rank": 199,
          "relativeScore": -28.5
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
          "rank": 200,
          "relativeScore": -35.2
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
          "rank": 201
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
          "score": 90,
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
          "score": 89,
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
          "score": 88,
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
          "score": 87,
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
          "score": 86,
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
          "score": 85,
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
          "score": 84,
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
          "score": 70,
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
          "score": 69,
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
          "score": 68,
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
          "score": 67,
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
          "score": 66,
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
          "score": 65,
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
          "score": 64,
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
          "score": 63,
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
          "score": 62,
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
          "score": 61,
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
          "score": 60,
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
          "score": 59,
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
          "score": 58,
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
          "score": 57,
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
          "score": 56,
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
          "score": 55,
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
          "score": 54,
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
          "score": 53,
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
          "score": 52,
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
          "score": 51,
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
          "score": 50,
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
          "score": 49,
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
          "score": 48,
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
          "score": 47,
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
          "score": 46,
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
          "score": 45,
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
          "score": 44,
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
          "score": 43,
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
          "score": 42,
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
          "score": 41,
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
          "score": 40,
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
          "score": 39,
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
          "score": 38,
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
          "score": 37,
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
          "score": 36,
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
          "score": 35,
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
          "score": 34,
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
          "score": 33,
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
          "score": 32,
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
          "score": 31,
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
          "score": 30,
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
          "score": 30,
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
          "score": 29,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IFIX",
          "rank": 76
        },
        {
          "symbol": "SNFF11",
          "name": "Suno Fundo de Fundos",
          "sector": "Híbridos",
          "m1": 3.1746031746031673,
          "m3": -0.2876318312560032,
          "score": 28,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 77
        },
        {
          "symbol": "KNSC11",
          "name": "Kinea Securities",
          "sector": "Papel/CRI",
          "m1": 2.5669642857142705,
          "m3": -0.32537960954448086,
          "score": 27,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IFIX",
          "rank": 78
        },
        {
          "symbol": "TRBL11",
          "name": "TRBL11",
          "sector": "Logística",
          "m1": 13.153627888123214,
          "m3": -6.025921562026592,
          "score": 26,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 79
        },
        {
          "symbol": "RZAK11",
          "name": "Riza Akin",
          "sector": "Papel/CRI",
          "m1": 2.6416052832105645,
          "m3": -1.077111383108947,
          "score": 25,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 80
        },
        {
          "symbol": "RBRR11",
          "name": "RBR Rendimento High Grade",
          "sector": "Papel/CRI",
          "m1": 7.229431056609166,
          "m3": -3.589743589743586,
          "score": 24,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 81
        },
        {
          "symbol": "TEPP11",
          "name": "Tellus Properties",
          "sector": "Lajes corporativas",
          "m1": 3.7383177570093373,
          "m3": -1.8939393939393985,
          "score": 23,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 82
        },
        {
          "symbol": "GGRC11",
          "name": "GGR Covepi Renda Imobiliária",
          "sector": "Logística",
          "m1": 5.116796440489423,
          "m3": -2.7777777777777914,
          "score": 22,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 83
        },
        {
          "symbol": "OUJP11",
          "name": "Ourinvest JPP",
          "sector": "Papel/CRI",
          "m1": 1.6998401859654246,
          "m3": -0.9480684873355054,
          "score": 21,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 84
        },
        {
          "symbol": "MCCI11",
          "name": "Mauá Capital Recebíveis",
          "sector": "Papel/CRI",
          "m1": 0.1796090861066957,
          "m3": -0.2944269190325985,
          "score": 20,
          "weeklyTrend": {
            "state": "BULLISH"
          },
          "benchmark": "IFIX",
          "rank": 85
        },
        {
          "symbol": "CLIN11",
          "name": "Clave Índices de Preços",
          "sector": "Papel/CRI",
          "m1": 2.1589343132751444,
          "m3": -1.592920353982314,
          "score": 19,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 86
        },
        {
          "symbol": "KISU11",
          "name": "Kilima FIC de FII SUNO 30",
          "sector": "Híbridos",
          "m1": 4.34056761268781,
          "m3": -2.799377916018658,
          "score": 18,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 87
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
          "rank": 88
        },
        {
          "symbol": "RZAT11",
          "name": "Riza Agro",
          "sector": "Outros",
          "m1": 2.9014844804318467,
          "m3": -2.607770090473659,
          "score": 16,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 89
        },
        {
          "symbol": "MXRF11",
          "name": "Maxi Renda",
          "sector": "Papel/CRI",
          "m1": 3.3916849015317143,
          "m3": -2.9774127310061695,
          "score": 15,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 90
        },
        {
          "symbol": "MCRE11",
          "name": "Mauá Capital Real Estate",
          "sector": "Papel/CRI",
          "m1": 7.816377171215868,
          "m3": -5.44069640914037,
          "score": 14,
          "weeklyTrend": {
            "state": "NEUTRAL"
          },
          "benchmark": "IFIX",
          "rank": 91
        },
        {
          "symbol": "BRCO11",
          "name": "Bresco Logística",
          "sector": "Logística",
          "m1": 1.9445706497046804,
          "m3": -2.443478260869567,
          "score": 13,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 92
        },
        {
          "symbol": "BTCI11",
          "name": "BTG Pactual Crédito Imobiliário",
          "sector": "Papel/CRI",
          "m1": -0.44247787610618533,
          "m3": -2.067464635473335,
          "score": 12,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 93
        },
        {
          "symbol": "KNUQ11",
          "name": "Kinea Unique",
          "sector": "Papel/CRI",
          "m1": 0.2922552362396465,
          "m3": -2.5094696969696892,
          "score": 11,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 94
        },
        {
          "symbol": "RECR11",
          "name": "REC Recebíveis Imobiliários",
          "sector": "Papel/CRI",
          "m1": 3.0687124749833186,
          "m3": -4.037267080745342,
          "score": 10,
          "weeklyTrend": {
            "state": "BEARISH"
          },
          "benchmark": "IFIX",
          "rank": 95
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
          "rank": 96
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
          "rank": 97
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
          "rank": 98
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
          "rank": 99
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
          "rank": 100
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
          "rank": 101
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
          "rank": 102
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
          "rank": 103
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
          "rank": 104
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
          "rank": 105
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
          "rank": 106
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

  // Hidratação imediata para garantir renderização síncrona
  if (!root.relativeStrengthClassesState) {
    root.relativeStrengthClassesState = {
      classes: staticCache.daily,
      dailyClasses: staticCache.daily,
      weeklyClasses: staticCache.weekly,
      selected: 'stock_ibov',
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

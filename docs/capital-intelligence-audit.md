# 02 — Capital Intelligence | Auditoria de Motores, Dados e Fontes

**Projeto:** The Healthy Trend Trader  
**Módulo:** Capital Intelligence — O Mapa Vivo do Seu Dinheiro  
**Data da Auditoria:** 2026-11-22  
**Branch de Referência:** `codex/capital-intelligence-live-map`  
**Princípio Regente:** *Understand → Reuse → Modify → Validate* — reutilizar motores canônicos, nunca duplicar cálculos, nunca confundir desempenho relativo com fluxo financeiro efetivo e nunca apresentar dados estáticos/fictícios como dados reais.

---

## 1. Sumário Executivo — Mapa de Prontidão

A auditoria direta do código-fonte (`backend/src/`, `backend/data/`, `backend/db/migrations/` e `frontend/`) revela que o Healthy Trend Trader **já possui uma base robusta de motores canônicos** que podem alimentar imediatamente parte crítica do Capital Intelligence, mas também expõe **lacunas relevantes** — incluindo dados estáticos hoje servidos pela Central de Mercado que **não podem** ser reaproveitados como feed real.

| Dimensão do Capital Intelligence | Status Atual | Reutilização / Ação Necessária | Natureza do Dado |
|---|---|---|---|
| **Ciclo de Mercado — Brasil (`IBOV`, `IFIX`, `BDRX`)** | **Pronto (Canônico)** | Reutilizar `backend/src/market-regime.js` + `b3-index-history.js` (alinhar sync de `BDRX`/`IFIX`) | Regime (Preço + Volatilidade) |
| **Ciclo de Mercado — Estados Unidos (`SPY`, `QQQ`)** | **Pronto (Canônico)** | Já implementado em `market-regime.js` via `Twelve Data` (`us-benchmarks-cache.json`, 727 candles) | Regime (Preço + Volatilidade) |
| **Meu Patrimônio, Exposição e Portfolio Heat** | **Pronto (Parcialmente em Browser State)** | Reutilizar `wealth.js`, `trades.js`, `risk-policy.js` e `daily-update-model.js`; consolidar persistência de contas e câmbio PTAX | Alocação / Posição Real |
| **Ouro / Proteção e Commodities** | **Extensível (Provedor Já Integrado)** | Adicionar ETFs/ativos reais (`GLD` ou `XAU/USD`, `USO`/`DBC`) no `TwelveDataMarketDataProvider` (+2 a 3 créditos/dia) | Preço / Desempenho |
| **Rotação Setorial — Estados Unidos (21p)** | **Extensível (Provedor Já Integrado)** | Adicionar os 11 ETFs SPDR (`XLK`, `XLF`, `XLV`, `XLE`, `XLI`, `XLY`, `XLP`, `XLU`, `XLB`, `XLRE`, `XLC`) + `SMH` na `Twelve Data` (+12 créditos/dia) | Preço / Desempenho Relativo (**não é fluxo líquido**) |
| **Tendências Macro (Dólar, Selic/DI, US10Y, VIX — 21p)** | **Lacuna (Fontes Oficiais Gratuitas)** | Integrar **BCB Olinda/SGS** (PTAX, Selic, IPCA), **FRED** (`DGS10`, `VIXCLS`, `FEDFUNDS`, `DTWEXBGS`) e/ou **CBOE CSV** (VIX) | Taxa / Preço / Volatilidade Implícita |
| **Market Breadth — Estados Unidos (Amplo NYSE+NASDAQ)** | **Indisponível (Exige Nova API)** | **Manter indisponível** até integração dedicada (ex.: Polygon, EODHD ou FMP). Opcional intermediário: amplitude do **Nasdaq-100** (rotulada explicitamente como 100 ações) | Amplitude (Breadth) |
| **Eventos Macroeconômicos Futuros** | **Parcial (Playbook Histórico Existe)** | Reutilizar `event-playbook.js` para histórico/lições + adicionar calendário oficial anual estruturado (COPOM, FOMC, BLS, IBGE); consenso exige API dedicada | Evento / Catalisador |
| **Fluxo Financeiro Efetivo (Net Inflows / Estrangeiro B3)** | **Indisponível (Exige Fonte Própria)** | **Manter indisponível** até fonte oficial de fluxo (ex.: Dados de Fluxo Estrangeiro B3 ou ETF Fund Flows). Nunca inferir fluxo por retorno de preço | Fluxo Efetivo |

---

## 2. Auditoria Obrigatória dos 8 Domínios Existentes

### 2.1. Market Regime / Ciclo de Mercado Brasileiro
- **Arquivos canônicos:**
  - `backend/src/market-regime.js` (motor oficial de 6 regimes)
  - `backend/src/market-data.js` (`scoreCycle`, `resolveMarketCycle`, `marketCycleFor`)
  - `backend/src/b3-index-history.js` (coleta oficial da B3)
  - `backend/db/migrations/042_market_regime_engine.sql` (tabelas `app.market_benchmarks` e `app.market_regime_daily`)
- **Rotas HTTP existentes (`backend/src/server.js`):**
  - `/api/market-cycle`
  - `/api/market-regime/current`
  - `/api/market-regime/history`
  - `/api/market-regime/periods`
  - `/api/market-regime/configuration`
- **Metodologia canônica (reutilizar sem duplicar):**
  - **Direção:** `UP` (`close > EMA10 && close > EMA72`), `DOWN` (`close < EMA10 && close < EMA72`), `SIDEWAYS` (entre ou sobre as EMAs).
  - **Volatilidade:** `ATR(21)` com suavização de Wilder convertido em `ATR% = (ATR21 / Close) × 100`, comparado à `SMA(ATR%, 252)` (exige mínimo de 273 pregões válidos; abaixo disso retorna `INSUFFICIENT_DATA`, nunca assume `QUIET`).
  - **Classificação final (6 regimes):** `UP_QUIET`, `UP_VOLATILE`, `SIDEWAYS_QUIET`, `SIDEWAYS_VOLATILE`, `DOWN_QUIET`, `DOWN_VOLATILE`.
- **Estado real do cache em disco (`backend/data/market-regimes-cache.json`):**
  - `IBOV`: 260 pregões em cache, último candle `2026-11-19` (`DOWN_VOLATILE`).
  - `BDRX`: 260 pregões em cache, último candle `2026-11-04` (`UP_VOLATILE`) — **alerta de dessincronia:** precisa ser incluído no mesmo ciclo de refresh diário do `IBOV`.
  - `IFIX`: 260 pregões em cache, último candle `2026-11-04` (`DOWN_VOLATILE`) — mesmo alerta de dessincronia.
- **Limitação técnica observada em `b3-index-history.js`:**
  - O proxy de índices da B3 (`GetPortfolioDay`) fornece apenas preço de **fechamento (`close`)**, sem `open/high/low`. Por isso, `market-regime.js` usa fallback `|close - prevClose|` no True Range quando `high/low` estão ausentes. Para `IBOV`, é necessário manter consistência entre o que a tela Ciclo de Mercado exibe e o que o Capital Intelligence consome (sempre via `market-regime.js`).

### 2.2. Possibilidade de Ciclo / Regime Próprio para Estados Unidos
- **Conclusão direta da auditoria:** **Não apenas é possível — já está implementado no motor canônico!**
- **Evidência no código (`backend/src/market-regime.js` linhas 120–121 e 673–735):**
  - `DEFAULT_BENCHMARKS` já declara `SP500` (`SPY`, `market: 'US'`, `provider: 'twelve_data'`) e `NASDAQ` (`QQQ`, `market: 'US'`, `provider: 'twelve_data'`).
  - `backend/data/us-benchmarks-cache.json` já armazena **727 candles OHLCV completos** (`2024-01-02` → `2026-11-20`) tanto para `SPY` quanto para `QQQ`.
  - `backend/data/market-regimes-cache.json` já contém **455 pregões de regime** para `SP500` e `NASDAQ` até `2026-11-20` (com OHLC completo, permitindo True Range real com High/Low).
  - `backend/src/market-data.js` (`marketCycleFor`) já aceita `sp500` e `nasdaq` em `supportedMarkets`.
- **O que falta para produção contínua:**
  - Garantir job automático diário de atualização de `SPY` e `QQQ` após o fechamento de Nova York (18h30 BRT / 16h30 ET) gravando em `us-benchmarks-cache.json` e disparando `syncBenchmarkRegimes('SP500')` e `syncBenchmarkRegimes('NASDAQ')`.
  - Custo operacional: apenas **2 créditos/dia** na Twelve Data.

### 2.3. Relative Strength e Força Relativa Setorial
- **Brasil (B3 — Operacional e Completo):**
  - **RS Diário (`backend/src/market-data.js`):** 216 ações B3 (`relativeStrength`), 34 BDRs (`relativeStrengthByClass.bdr`) e 86 FIIs (`relativeStrengthByClass.fii`) no `market-cache.json` (atualizado em `2026-11-22`).
  - **RS Semanal (`backend/src/weekly-relative-strength.js`):** agrega candles diários em semanais e gera `relativeStrengthByClassWeekly`.
  - **Força Relativa Setorial B3 (`backend/src/market-treemap.js`):** consolida os **11 setores econômicos oficiais da B3** (+ Não Classificado), calculando retornos reais multi-janela (`1D`, `1W`, `1M`, `3M`, `6M`, `1A`) sobre `b3-spot-candles-cache.json` e Market Cap sem dupla contagem entre classes ON/PN/UNT.
  - **Alerta sobre `market-central.js` (`buildSectorMarketMap`):** o cálculo de `5d` na Central de Mercado usa aproximação (`m1Change * 0.24 + todayChange * 0.5`). O Capital Intelligence **não deve reutilizar** essa aproximação; deve calcular janelas exatas (ex.: 21 pregões = `close[t] / close[t-21] - 1`) diretamente dos candles diários reais.
- **Estados Unidos (Parcial — Nasdaq-100 apenas):**
  - `backend/src/nasdaq-relative-strength.js` + `nasdaq-universe.js` + `nasdaq-price-store.js` já calculam retornos determinísticos `1D`, `5D`, `1M (21 pregões)` e `3M (63 pregões)`, `EMA20`, `SMA50` e `SMA200` contra o benchmark `QQQ`.
  - **Limitações para Rotação Setorial EUA:**
    1. O universo Nasdaq-100 tem forte viés de Tecnologia/Comunicação e quase não cobre Energia, Financeiro, Imobiliário ou Utilities — portanto **não representa** a rotação setorial ampla dos EUA.
    2. O arquivo `backend/data/nasdaq-daily-prices.json` (25.250 linhas, 101 símbolos) está congelado em `2025-10-02` → `2026-10-01` (quase 2 meses desatualizado).
  - **Caminho canônico recomendado para Rotação Setorial EUA:** Coletar diariamente via `Twelve Data` (já integrada) os **11 ETFs SPDR do S&P 500** (`XLK`, `XLF`, `XLV`, `XLE`, `XLI`, `XLY`, `XLP`, `XLU`, `XLB`, `XLRE`, `XLC`) + Semicondutores (`SMH`) e reutilizar a função `computeReturns` (`21 pregões` / `63 pregões`) para medir **desempenho relativo setorial contra `SPY`**.

### 2.4. Volatility Engine
- **Arquivos auditados:**
  - `backend/src/volatility-engine.js`
  - `backend/src/volatility-simulator.js`
  - `frontend/volatility-trading-engine-model.js`
- **Escopo real:**
  - É o motor de **estratégia operacional de Volatility Swing (`IFR2` sobrevenda + filtro estrutural `SMA200` + saída temporal `D7`)**, consumindo `tickerChart.loadB3History()` e `tickerChart.loadNasdaqHistory()`, integrado a `strategy-configs.js` e `asset-blacklist.js`.
- **Relação com o Capital Intelligence:**
  - **Não** é um motor de volatilidade macroeconômica (como o VIX) nem o classificador de regime volátil do mercado.
  - Para **volatilidade de regime de mercado** (`ATR% 21` vs `SMA 252`), reutilizar **`market-regime.js`**.
  - O `volatility-engine.js` pode futuramente fornecer ao Capital Intelligence um indicador tático secundário (ex.: *contagem de sinais de sobrevenda extrema IFR2 na B3* como termômetro de capitulação de curto prazo), mas não substitui `VIX` nem `Market Breadth`.

### 2.5. Benchmarks, Índices e Provedores Já Integrados
Inventário exato de todas as integrações externas encontradas em `backend/src/`:

| Provedor / Origem | Módulo(s) | Instrumentos Atuais | Custo / Limites Configurados | Status Real |
|---|---|---|---|---|
| **B3 COTAHIST** (`bvmf.bmfbovespa.com.br`) | `b3-historical.js`, `ticker-chart.js`, `market-data.js` | Ações B3, FIIs, BDRs, ETFs à vista (2.560 tickers em `b3-spot-candles-cache.json`) | Gratuito, oficial, sem chave; cache 15 min no ano atual + `If-Modified-Since` | **Ativo / Produção** (`cotahist-2025.zip`, `cotahist-2026.zip`) |
| **B3 Índices Proxy** (`sistemaswebb3-listados.b3.com.br`) | `b3-index-history.js`, `market-regime.js`, `market-data.js` | `IBOV`, `IFIX`, `BDRX`, `SMLL` | Gratuito, oficial, sem chave; cache 1h no ano atual, permanente para anos anteriores | **Ativo / Produção** (`2024–2026`, apenas `close`) |
| **BRAPI** (`brapi.dev/api/v2`) | `brapi-client.js`, `market-data.js` | Ações B3 / fallback histórico e cotações live opt-in (`ENABLE_BRAPI_LIVE_SCANS=true`) | Plano pago/token (`BRAPI_TOKEN`); guarda local: `700 req/dia`, `14.000 req/30d`, lock de arquivo + backoff em 429 | **Ativo / Fallback Controlado** |
| **Twelve Data** (`api.twelvedata.com`) | `twelve-data-provider.js`, `twelve-data-usage-guard.js`, `market-regime.js`, `nasdaq-relative-strength.js` | `SPY`, `QQQ` e 100 ações Nasdaq-100 | Plano Basic (`TWELVE_DATA_API_KEY`): **8 créditos/min**, hard limit **800 créditos/dia**, safe limit **700 créditos/dia** (reset 00:00 UTC) | **Ativo / Subutilizado** (apenas 12 créditos usados hoje em `twelve-data-usage.json`) |
| **Nasdaq Analyst API** (`api.nasdaq.com`) | `bdr-international.js` | Datas de earnings de ações EUA subjacentes a BDRs | Público não-autenticado (sujeito a bloqueio/rate-limit); cache 6h em `bdr-earnings-cache.json` | **Ativo / Frágil para escala** |
| **Fundamentus / CVM / SEC** | `fundamentus.js`, `fundamentals.js`, `build-bdr-fundamentals.js` | Fundamentos contábeis B3 e BDRs | Gratuito / arquivos locais (`fundamentals-*.json`) | **Ativo** (fora do foco cíclico do Capital Intelligence) |
| **GDELT v2** (`api.gdeltproject.org`) | `market-news.js` | Notícias macro e de mercado (domínios filtrados) | Gratuito; TTL 20 min + fallback `SEED_STORIES` | **Ativo** |

> **ALERTA CRÍTICO DA AUDITORIA — `backend/src/market-central.js`:**  
> A constante `GLOBAL_BENCHMARKS` (`SPX`, `NDX`, `DJI`, `VIX`, `DXY`, `GOLD`, `WTI`, `BTC`) retornada em `globalMarkets` por `/api/market-central` é **100% ESTÁTICA / HARDCODED** no código-fonte (linhas 20–117). Ela **não consulta nenhuma API real**. O Capital Intelligence **está proibido** de consumir `market-central.globalMarkets` como se fosse dado real de mercado.

### 2.6. Dados Históricos OHLC e Séries de Indicadores
- **Ações, FIIs e BDRs B3 (`b3-spot-candles-cache.json` + `b3-history-cache/`):**
  - **Cobertura:** 2.560 símbolos, OHLCV diário + número de negócios, ajustado por eventos corporativos (`corporate-events.js`).
  - **Horizonte em disco:** `2025-01-02` até pregão mais recente em `cotahist-2026.zip` (~58,6 MB).
  - **Atenção:** Contratos **futuros** (`WIN`, `WDO`, `DI1`, `BGI`, `CCM`) **não** constam no arquivo à vista padrão do COTAHIST usado neste cache.
- **Índices B3 (`b3-index-history-cache/`):**
  - **Cobertura:** `IBOV`, `IFIX`, `BDRX`, `SMLL`, anos `2024`, `2025`, `2026` (~722 pregões).
  - **Granularidade:** Diária, **somente `close`** (sem Open/High/Low/Volume).
- **Benchmarks EUA (`us-benchmarks-cache.json`):**
  - **Cobertura:** `SPY` e `QQQ`, **727 candles OHLCV diários** (`2024-01-02` → `2026-11-20`).
- **Ações EUA (`nasdaq-daily-prices.json` + tabela `app.market_daily_prices`):**
  - **Cobertura:** 101 símbolos (Nasdaq-100 + `QQQ`), 25.250 registros OHLCV diários (`2025-10-02` → `2026-10-01` — **desatualizado**, precisa reativação de job se for usado).
  - **Infraestrutura reutilizável:** A tabela PostgreSQL `app.market_daily_prices` (`025_market_daily_prices.sql`) já aceita `(provider, universe, symbol, date, open, high, low, close, volume)` e pode armazenar perfeitamente séries macro/ETFs sob novos universos (ex.: `US_SECTORS`, `MACRO_BENCHMARKS`) sem duplicar tabelas!

### 2.7. Patrimônio, Contas, Posições, Classes, Moedas e Exposição
- **Persistência Backend (`backend/src/wealth.js`, `trades.js`, `risk-policy.js`):**
  - **Patrimônio:** `app.wealth_movements` (aportes/retiradas), `app.wealth_allocations` (alocações com `asset_class` e `target_pct`), `app.wealth_snapshots` (`strategy_equity`, `real_wealth`), `app.wealth_adjustments` (ajustes auditáveis), `app.wealth_settings` (`strategy_base`).
  - **Posições e Eventos:** `app.trades` + `app.trade_events` (modelo canônico de ideia de trade única com eventos `entry`, `scale_in`, `peeloff`, `stop_update`, `close`, direção `long`/`short`, `rubric_grade` A/B/C/D, `strategy_type` `trend_following`/`volatility_trading`, `current_risk_percent`).
  - **Risco:** `app.risk_policies` (risco nominal por Grade e limite de Portfolio Heat).
- **Camada Frontend (`frontend/daily-update-model.js`, `position-management-model.js`, `instrument-catalog.js`):**
  - **Regra contábil inviolável:** Contas do tipo `CHECKING` (ex.: Bradesco Conta Corrente) são **excluídas** da Equity de Investimentos.
  - **Regra de saldo:** O saldo informado por corretora é o **saldo total** (caixa + posições abertas), nunca somando posições novamente sobre o saldo.
  - **Classes e Multiplicadores:** `instrument-catalog.js` e `daily-update-model.js` classificam `Ações`, `Futuros` (`WIN`, `IND`, `WDO`, `DOL`, `BGI`, `CCM`, `ICF`, `OZ`), `BDR`, `FII`, `Cripto`, com cálculo financeiro canônico por direção e multiplicador.
  - **Moedas:** Suporte a contas em `USD` (ex.: Nomad) com preservação de saldo original em dólar (`newBalanceUSD`) e conversão `fxRate` para BRL.
- **Lacunas identificadas no módulo patrimonial:**
  1. **Persistência de Contas:** As contas individuais por corretora (`XP`, `Nomad`, `Genial`, `Clear`, `EqSeed`, `Bradesco`) e sua classificação `INVESTMENT` vs `CHECKING` residem hoje em `workspace-state` / `localStorage` (`daily-update-model.js`), e não em tabela SQL dedicada. Para que um endpoint backend `/api/capital-intelligence/snapshot` calcule a esfera **Meu Patrimônio** de forma 100% server-side e isolada por tenant, será necessário ler `workspace_state` (chave de contas do usuário) combinado com `wealth.list(userId)` e `trades.list(userId)` — ou criar migração aditiva `app.wealth_accounts`.
  2. **Câmbio USD/BRL na Nomad:** Hoje `fxRate` depende de preenchimento manual ou valor default (`5.95`), sem sincronização automática com BCB PTAX.

### 2.8. Calendário Econômico e Fontes de Eventos
- **O que existe:**
  - `backend/src/event-playbook.js` + `app.event_playbook_entries` (`029_event_playbook.sql`, `030_event_playbook_user_composite_pk.sql`): catálogo de eventos e playbooks históricos (reação de mercado, gap, volume, ATR, lições aprendidas).
  - `backend/src/bdr-international.js`: próximos earnings de empresas americanas (BDRs) via Nasdaq Analyst API.
  - `backend/src/market-news.js`: notícias macro via GDELT v2.
- **Lacuna identificada:**
  - `event-playbook.js` contém `DEFAULT_SEEDS` com datas fixas de outubro/2026 (`2026-10-07` a `2026-10-13`) e depende de cadastro manual do usuário para eventos futuros. **Não há hoje feed automático de calendário econômico futuro** (COPOM, FOMC, Payroll, CPI, IPCA com horário exato, consenso e valor divulgado).

---

## 3. Matriz de Cobertura de Indicadores, Fontes, Limites e Fallbacks

| Indicador / Dimensão | Fonte / API Recomendada | Instrumento / Série | Histórico & Granularidade | Frequência & Publicação | Limites, Custos & Restrições | Qualidade, Atraso & Política de Fallback | Natureza Epistemológica |
|---|---|---|---|---|---|---|---|
| **Ciclo Brasil (`IBOV`, `IFIX`, `BDRX`)** | **B3 Índices Proxy** (já integrada) + `market-regime.js` | `IBOV`, `IFIX`, `BDRX` | 2024–atual (~720+ pregões), diário (`close`) | 1x/dia útil pós-fechamento B3 (≥18h30 BRT) | Gratuito, oficial, sem chave; cache 1h ano corrente | Oficial B3; sem High/Low (TR close-to-close). Fallback: último `market-regimes-cache.json` + timestamp explícito | **Preço / Regime** |
| **Ciclo EUA (`SP500`, `NASDAQ`)** | **Twelve Data** (já integrada) + `market-regime.js` | `SPY`, `QQQ` | 727 pregões em cache (`2024-01-02`→atual), diário OHLCV | 1x/dia útil pós-fechamento NY (≥18h30 BRT) | 2 créditos/dia (cota segura 700/dia, 8/min; custo zero adicional no plano atual) | Alta qualidade OHLCV (ETF proxy líquido). Fallback: `us-benchmarks-cache.json` | **Preço / Regime** |
| **Market Breadth — EUA (Amplo)** | **Nova API dedicada** (ex.: Polygon.io / EODHD / FMP) — *hoje ausente* | Universo amplo NYSE + NASDAQ ou S&P 500 completo (A/D, 52w H/L, % > MM50/MM200) | Mín. 252 pregões diários para 52w H/L e MM200 | 1x/dia útil pós-fechamento NY | Requer assinatura/chave nova (~US\$ 20–\$ 50/mês para bulk EOD US completo); inviável na Twelve Data Basic (exigiria >3.500 créditos/dia) | **Sem fonte confiável hoje → manter `unavailable` (`awaiting_feed`).** Alternativa intermediária rotulada: *Amplitude Nasdaq-100* (100 ações, 100 créditos/dia Twelve Data) | **Amplitude (Breadth)** |
| **Market Breadth — Brasil (Complementar)** | **B3 COTAHIST** (já integrada) + `market-central.js` | ~216 ações B3 líquidas (`market-cache.json`) | Diário (janela 200+ pregões) | 1x/dia útil pós-fechamento B3 | Gratuito (COTAHIST) | Real sobre amostra líquida B3; corrigir cálculo exato de `EMA50` (remover aproximação) | **Amplitude (Breadth)** |
| **Ouro / Proteção e Commodities** | **Twelve Data** (já integrada) | `GLD` (Ouro), `SLV` (Prata), `USO` (Petróleo) ou `DBC` (Commodities) | 252+ pregões diários OHLCV | 1x/dia útil pós-fechamento NY | 2–4 créditos/dia (dentro do plano atual) | Alta qualidade OHLCV via ETFs globais de altíssima liquidez. Fallback: cache `app.market_daily_prices` | **Preço / Desempenho** |
| **Rotação Setorial — EUA (21p)** | **Twelve Data** (já integrada) | 11 SPDR Sectors (`XLK`, `XLF`, `XLV`, `XLE`, `XLI`, `XLY`, `XLP`, `XLU`, `XLB`, `XLRE`, `XLC`) + `SMH` | 252+ pregões diários OHLCV (janelas 21p e 63p vs `SPY`) | 1x/dia útil pós-fechamento NY | 12 créditos/dia (2 lotes de 8/min = ~1 min total; custo zero adicional) | Alta precisão de retorno relativo setorial. Fallback: último cache SQL/JSON. **Rotular como desempenho relativo, não fluxo líquido** | **Preço / Desempenho Relativo** |
| **Dólar (USD/BRL — 21p)** | **BCB Olinda PTAX** (nova, oficial gratuita) ou **Twelve Data** (`USD/BRL`) | PTAX Venda/Compra diária (BCB) ou par `USD/BRL` | Multi-anos diário (BCB) / 252+ dias (Twelve Data) | 1x/dia útil (~13h15 BRT fechamento PTAX BCB; ou EOD Twelve Data) | BCB: gratuito, sem chave, sem cota restritiva. Twelve Data: 1 crédito/dia | BCB PTAX é referência contábil oficial no Brasil (também resolve câmbio da conta Nomad!). Fallback: último dia útil persistido | **Preço / Câmbio** |
| **Taxa Selic & IPCA (BR)** | **BCB SGS API** (`api.bcb.gov.br/dados/serie/bcdata.sgs.{id}/dados`) | Séries `432` (Selic Meta), `1178` (Selic anual), `433` (IPCA mensal) | Décadas, diário (Selic) e mensal (IPCA) | Diário / pós-Copom e divulgação IBGE | Gratuito, oficial, sem chave; aplicar cache local de 6–12h para evitar instabilidades pontuais da API do BCB | Oficial Banco Central do Brasil. Fallback: último valor persistido em disco/SQL | **Taxa / Macro** |
| **Curva DI Futuro (ex.: DI1 Jan/27 / Jan/29)** | **ANBIMA ETTJ / B3 Taxas Referenciais (DIxPré)** (nova, gratuita D+1) ou vendor B3 futuros | Vértices 1Y / 2Y / 5Y prefixados (ETTJ) ou contratos `DI1Fxx` | Série diária histórica | 1x/dia útil (D+1 na ETTJ aberta) | Gratuito (ANBIMA/B3 CSV público), porém formato tabular exige parser dedicado; feed real-time de futuros exige vendor pago | Boa precisão para tendência de 21 pregões (variação em p.p.). Enquanto não houver parser validado, exibir **Selic Meta + BCB** ou marcar vértice DI como `awaiting_feed` | **Taxa / Curva de Juros** |
| **US Treasury 10Y (`US10Y`) & Fed Funds** | **FRED API** (`api.stlouisfed.org/fred/series/observations`) | `DGS10` (10Y Yield %), `DGS2` (2Y Yield %), `FEDFUNDS` / `DFF`, `CPIAUCSL` | Décadas, diário (yields) e mensal (CPI) | 1x/dia útil (publicação D+1 pelo Fed de St. Louis) | Gratuito com chave `FRED_API_KEY` gratuita; limite generoso (~120 req/min) | Fonte primária oficial dos EUA em `% a.a.` (superior a ETFs de títulos, que medem preço e não yield). Fallback: último registro em cache | **Taxa / Macro** |
| **VIX (Volatilidade Implícita — 21p)** | **CBOE Histórico Oficial CSV** ou **FRED (`VIXCLS`)** | Índice `VIX` (fechamento diário; CBOE fornece OHLC) | Décadas, diário | 1x/dia útil pós-fechamento NY (CBOE) ou D+1 (FRED) | Gratuito, sem custo de créditos Twelve Data | Altíssima confiabilidade oficial para tendência de 21 pregões e nível de estresse. Fallback: cache local | **Volatilidade Implícita (Índice)** |
| **DXY (Força Global do Dólar — 21p)** | **FRED (`DTWEXBGS`)** ou **Twelve Data (`UUP` proxy)** | `DTWEXBGS` (Broad Dollar Index oficial Fed) ou `UUP` (ETF proxy DXY) | Multi-anos diário | 1x/dia útil (FRED atraso ~1 semana útil; `UUP` EOD diário) | FRED gratuito; `UUP` 1 crédito/dia na Twelve Data | Documentar explicitamente quando for `UUP` (ETF proxy) vs `DXY` spot | **Preço / Índice Cambial** |
| **Eventos Macroeconômicos** | **Calendário Institucional Anual Oficial** + `event-playbook.js` | Reuniões oficiais COPOM (BCB), FOMC (Fed), IPCA (IBGE), Payroll/CPI (BLS) | Datas futuras anuais + histórico no Event Playbook | Atualização anual/mensal (datas oficiais fixadas previamente) + sincronização com Playbook | Gratuito e 100% determinístico para datas oficiais; **consenso/surpresa** exigiria API paga (FMP / Trading Economics) | Datas oficiais confiáveis; manter campos `consensus`/`actual` como `null` até integração de calendário com consenso | **Evento / Catalisador** |
| **Meu Patrimônio & Alocação** | **Interno (`wealth.js` + `trades.js` + `risk-policy.js` + contas `daily-update-model.js`)** | Equity de Investimentos (sem conta corrente), posições abertas (Ações/Futuros/BDR/FII), Caixa e Heat | Snapshots históricos + posição atual | Tempo real interno (a cada trade, evento ou Atualização Diária) | Sem custo externo; isolamento estrito por `userId` | Fonte única de verdade do usuário; exige apenas sincronização da lista de contas e câmbio PTAX | **Alocação / Exposição Real** |

---

## 4. Regra Epistemológica Obrigatória (Rigor Semântico)

Para preservar credibilidade institucional no Capital Intelligence, toda métrica e toda conexão exibida na UI **deve carregar e respeitar sua natureza epistemológica (`metricNature`)**:

1. **`price_performance` (Preço / Desempenho Relativo):** Variação percentual de `SPY`, `QQQ`, `IBOV`, `GLD` ou dos 11 ETFs setoriais SPDR em 21 pregões. **Proibido** afirmar *"dinheiro está entrando/saindo em US$ bilhões"* apenas com base em alta ou queda de preço. A linguagem correta é *"liderança relativa de preço em 21 pregões"* ou *"rotação de desempenho setorial"*.
2. **`breadth` (Amplitude):** Contagem e proporção de ativos participantes (`% > EMA20/50/200`, `Avanços/Quedas`, `Máximas/Mínimas 52s`). Deve sempre informar o **universo exato** (ex.: `B3: 216 ações` ou `Nasdaq-100: 100 ações` ou `NYSE+NASDAQ: ~3.800 ações`).
3. **`macro_rate` (Taxa / Volatilidade Macro):** Rendimentos (`US10Y`, `Selic`, `DI`), inflação (`IPCA`, `CPI`) e volatilidade implícita (`VIX`).
4. **`capital_flow` (Fluxo Financeiro Efetivo):** Apenas quando houver dado real de fluxo líquido (ex.: saldo de investidores estrangeiros na B3 em R$, ou net fund flows de ETFs). **Hoje não existe fonte integrada para fluxo financeiro efetivo — manter explicitamente indisponível.**
5. **`portfolio_allocation` (Alocação Real do Usuário):** Composição real da Equity de Investimentos do usuário (sem contas correntes), risco aberto e Portfolio Heat.
6. **`event` (Catalisador / Evento):** Agenda oficial de decisões monetárias e indicadores macroeconômicos.

---

## 5. Lacunas Críticas e Riscos Identificados

1. **Dados estáticos ocultos em `market-central.js`:** `GLOBAL_BENCHMARKS` e `DEFAULT_HIGH_IMPACT_EVENTS` são mocks estáticos. **Risco:** contaminar o Capital Intelligence com números congelados caso o frontend consuma `globalMarkets` de `/api/market-central`. **Mitigação:** criar serviço backend próprio (`backend/src/capital-intelligence.js`) que nunca leia constantes estáticas de fallback da Central de Mercado.
2. **Ausência de fonte para Market Breadth Amplo dos EUA:** O plano atual da Twelve Data (`700 créditos/dia` seguros) não comporta consultar ~3.500 ações americanas diariamente. **Mitigação:** manter `breadth_us` em estado honesto `unavailable` (`awaiting_feed`) até contratação de provedor bulk EOD (Polygon/EODHD/FMP), ou exibir em camada secundária claramente rotulada *"Amplitude Nasdaq-100 (100 ações)"* somente após reativar a sincronização diária do `nasdaq-daily-prices.json`.
3. **Defasagem nos caches existentes:**
   - `nasdaq-daily-prices.json` está parado em `2026-10-01`.
   - `BDRX` e `IFIX` em `market-regimes-cache.json` estão parados em `2026-11-04` (enquanto `IBOV` está em `2026-11-19` e `SP500`/`NASDAQ` em `2026-11-20`).
   - **Mitigação:** criar verificação de frescor por indicador (`asOfDate` e `isStale`) e incluir todos os benchmarks no job único pós-fechamento.
4. **Contas de investimento em `workspace-state` vs. SQL:** `daily-update-model.js` armazena contas por corretora e o flag `INVESTMENT`/`CHECKING` fora de tabelas dedicadas. **Mitigação:** no endpoint backend do Capital Intelligence, ler `wealth.list(userId)` + `trades.list(userId)` + `workspace_state` (com fallback seguro) e planejar migração SQL aditiva para `app.wealth_accounts` na Fase 2.
5. **Ausência de parser de Curva DI Futuro (B3/ANBIMA):** O COTAHIST à vista não contém `DI1F27`/`DI1F29`. **Mitigação:** iniciar com **Selic + IPCA via BCB SGS** (oficial imediato) e adicionar parser da **ETTJ ANBIMA / Taxas Referenciais B3** na Fase 1B.

---

## 6. Contratos de Dados Recomendados (`GET /api/capital-intelligence/snapshot`)

Toda a tela Capital Intelligence deverá consumir um **único contrato backend autenticado** (`GET /api/capital-intelligence/snapshot`), mantendo isolamento por tenant (`user.id` via `auth.session(bearer(request))`), cache em disco/PostgreSQL e transparência absoluta de frescor e origem.

### 6.1. Envelope Padrão de Qualquer Indicador / Esfera

```json
{
  "id": "cycle_us",
  "tier": "primary",
  "metricNature": "price_performance",
  "dataStatus": "live",
  "source": {
    "provider": "twelve_data",
    "engine": "market-regime.js",
    "instrument": "SPY",
    "isProxy": true,
    "proxyNote": "ETF SPDR S&P 500 utilizado como proxy OHLCV do S&P 500"
  },
  "asOfDate": "2026-11-20",
  "updatedAt": "2026-11-22T18:35:00Z",
  "isStale": false,
  "windowSessions": 21,
  "value": {
    "regimeCode": "DOWN_VOLATILE",
    "regimeLabel": "Down – Volatile",
    "direction": "DOWN",
    "volatility": "VOLATILE",
    "return21dPct": -3.14,
    "return63dPct": -1.08,
    "atrPct": 1.38,
    "atrPctSma252": 0.96,
    "volatilityDeviationPct": 43.8
  },
  "sparkline21d": [592.1, 590.4, 588.0],
  "fallbackUsed": false
}
```

### 6.2. Contrato Explícito para Dado Indisponível (Sem Mock)

```json
{
  "id": "breadth_us",
  "tier": "primary",
  "metricNature": "breadth",
  "dataStatus": "unavailable",
  "reason": "PENDING_US_BROAD_BREADTH_PROVIDER",
  "message": "Aguardando integração com fonte de amplitude ampla (NYSE + NASDAQ).",
  "asOfDate": null,
  "value": null
}
```

### 6.3. Estrutura Top-Level do Snapshot

```json
{
  "schemaVersion": "1.0",
  "generatedAt": "2026-11-22T18:35:00Z",
  "horizonSessions": 21,
  "spheres": {
    "cycle_br": { "...": "market-regime.js (IBOV + IFIX + BDRX)" },
    "cycle_us": { "...": "market-regime.js (SP500/SPY + NASDAQ/QQQ)" },
    "breadth_us": { "...": "unavailable até Fase 2 (ou breadth_us_broad)" },
    "gold_commodities": { "...": "GLD / USO / DBC (21p & 63p)" },
    "sector_rotation_us": { "...": "11 SPDR ETFs + SMH vs SPY (21p)" },
    "macro_events": { "...": "Calendário Oficial + event-playbook.js" },
    "my_portfolio": { "...": "Equity Investimentos + Exposição + Heat (sem conta corrente)" }
  },
  "trendSatellites21d": {
    "dolar_brl": { "...": "BCB PTAX / USD-BRL (21p)" },
    "di_juros_br": { "...": "BCB Selic + ETTJ/DI (21p)" },
    "us10y": { "...": "FRED DGS10 (21p)" },
    "vix": { "...": "CBOE/FRED VIXCLS (21p)" }
  },
  "dailyTapeSecondary": [
    { "symbol": "IBOV", "close": 166376.43, "change1dPct": -0.42, "asOfDate": "2026-11-19", "dataStatus": "live" }
  ],
  "allocationGuidance": {
    "nonBindingDisclaimer": true,
    "posture": "defensive_selective",
    "basisWindowSessions": 21,
    "current": { "...": "real user breakdown" },
    "factors": []
  },
  "providerHealth": {
    "b3": { "status": "ok" },
    "twelve_data": { "creditsUsedToday": 16, "safeLimit": 700 },
    "bcb": { "status": "ok" },
    "fred": { "status": "configured" }
  }
}
```

---

## 7. Plano de Integração Incremental (Por Prioridade e Custo)

### Fase 0 — Reuso Imediato (Custo R\$ 0 | Infraestrutura 100% Existente)
1. Criar serviço agregador `backend/src/capital-intelligence.js` e rota autenticada `GET /api/capital-intelligence/snapshot`.
2. Conectar **Ciclo Brasil (`IBOV`, `IFIX`, `BDRX`)** e **Ciclo EUA (`SP500/SPY`, `NASDAQ/QQQ`)** diretamente de `market-regime.js` (zero duplicação de fórmula; corrigir sync diário de `BDRX` e `IFIX`).
3. Conectar **Meu Patrimônio** reutilizando `wealth.js`, `trades.js`, `risk-policy.js` e o estado de contas do usuário (mantendo contas `CHECKING` excluídas).
4. Conectar **Faixa Diária Secundária (Rodapé)** usando apenas deltas reais de 1 pregão dos benchmarks já hidratados (`IBOV`, `SPY`, `QQQ`), removendo qualquer dependência de `market-central.globalMarkets` estático.
5. Manter `breadth_us`, `trend_di`, `trend_us10y`, `trend_vix` e `sector_rotation_us` honestamente como `unavailable` até ativação das Fases 1 e 2.

### Fase 1 — Expansão de Alta Relação Valor/Custo (Custo R\$ 0 | Apenas APIs Gratuitas Oficiais + Cota Atual Twelve Data)
1. **Twelve Data (+16 créditos/dia de 700 disponíveis — 2,3% da cota):**
   - Persistir em `app.market_daily_prices` (já existente!):
     - **Rotação Setorial EUA (12 símbolos):** `XLK`, `XLF`, `XLV`, `XLE`, `XLI`, `XLY`, `XLP`, `XLU`, `XLB`, `XLRE`, `XLC`, `SMH`.
     - **Ouro / Proteção e Commodities (3 símbolos):** `GLD`, `USO`, `DBC`.
     - **Proxy Dólar Global (1 símbolo):** `UUP` (ou `DXY` se liberado no plano Basic).
   - Calcular janelas exatas de **21 e 63 pregões** reutilizando `computeReturns` (sempre rotulado como `price_performance`).
2. **BCB Olinda / SGS (Gratuito, Oficial, Sem Chave):**
   - Criar `backend/src/bcb-macro-provider.js` com cache em disco/SQL para **PTAX (USD/BRL)**, **Selic Meta (`432`)**, **Selic Efetiva (`1178`)** e **IPCA (`433`)**.
   - Reaproveitar PTAX oficial também como sugestão auditável para conversão cambial da conta Nomad na Atualização Diária.
3. **FRED API + CBOE CSV (Gratuito, Oficial):**
   - Criar `backend/src/fred-macro-provider.js` (chave gratuita `FRED_API_KEY`) para **`DGS10` (US10Y)**, **`DGS2`**, **`FEDFUNDS`** e **`VIXCLS` (VIX)** (com fallback/complemento CBOE CSV diário).
4. **Eventos Macroeconômicos Oficiais:**
   - Adicionar calendário institucional anual oficial (`COPOM`, `FOMC`, `Payroll`, `CPI`, `IPCA`) integrado ao `event-playbook.js` para associar cada próximo evento às lições históricas do usuário.
5. **Curva DI Futuro (Fase 1B):**
   - Integrar parser da **ETTJ ANBIMA** (vértices 1Y/2Y/5Y prefixados D+1) ou **Taxas Referenciais B3** para exibir deslocamento da curva de juros em p.p. em 21 pregões.

### Fase 2 — Market Breadth EUA Real & Consolidação Patrimonial (Investimento Baixo / Controlado)
1. **Market Breadth — Estados Unidos (Esfera Independente):**
   - Contratar/integrar 1 provedor de EOD americano em lote (ex.: **Polygon.io Stocks Starter** com endpoint *Grouped Daily* — 1 única requisição retorna todas as ~10.000 ações americanas do dia! — ou **EODHD Bulk EOD US**).
   - Com apenas **1 chamada/dia**, calcular **Market Breadth EUA completo e proprietário**: `A/D Line`, `Avanços vs. Quedas`, `Novas Máximas vs. Mínimas de 52 semanas`, `% acima MM50` e `% acima MM200`, persistindo histórico diário próprio em PostgreSQL.
2. **Consolidação SQL de Contas (`app.wealth_accounts`):**
   - Migração aditiva para persistir contas por corretora (`INVESTMENT` vs `CHECKING`, moeda original `BRL`/`USD`) no banco, unificando Atualização Diária, Patrimônio e Capital Intelligence.

### Fase 3 — Inteligência Avançada de Fluxo Real & Calendário com Consenso (Opcional / Futuro)
1. **Fluxo Financeiro Efetivo:** Integrar série oficial de **Fluxo de Investidores Estrangeiros na B3** (dados diários D+2 da B3) e/ou API de **ETF Fund Flows** — único momento em que o sistema passa a exibir métricas do tipo `capital_flow`.
2. **Calendário com Consenso e Surpresa:** Integrar provedor com `forecast` vs `actual` (ex.: Financial Modeling Prep / Trading Economics) para medir surpresas macroeconômicas em tempo real.

---

## 8. Critério de Aceite — Resumo para Decisão da Equipe

- **Entrega imediata com infraestrutura existente (Fase 0):** Ciclo de Mercado Brasil (`IBOV`/`IFIX`/`BDRX`), Ciclo de Mercado EUA (`SPY`/`QQQ`), Meu Patrimônio (Equity de Investimentos, Exposição, Heat) e histórico de Eventos do Playbook.
- **Entrega rápida sem custo mensal adicional (Fase 1):** Rotação Setorial EUA (`12 ETFs` na Twelve Data — preço relativo), Ouro/Commodities (`GLD`/`USO`/`DBC`), Dólar PTAX + Selic + IPCA (`BCB`), US10Y + VIX + Fed Funds (`FRED`/`CBOE`) e Calendário Macro Oficial (`COPOM`/`FOMC`/`Payroll`/`IPCA`).
- **Exigem nova API paga/dedicada (manter indisponíveis até integração):** **Market Breadth EUA amplo (NYSE+NASDAQ)**, **Fluxo Financeiro Efetivo (net inflows)** e **Calendário Econômico com Consenso/Surpresa**.

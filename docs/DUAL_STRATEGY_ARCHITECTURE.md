# Arquitetura Dual Strategy: Trend Following & Volatility Trading
**The Healthy Trend Trader — Manual e Especificação Técnica de Coexistência de Estratégias**
*Versão 1.0 — Implementação Oficial*

---

## 1. Visão Geral e Filosofia dos Dois Mundos

O **Healthy Trend Trader** opera com uma arquitetura de estratégia dual de ponta a ponta, oferecendo ao operador dois ambientes operacionais complementares, independentes e não-concorrentes:

1. **TREND FOLLOWING (Swing Trade de Tendência)**
   - **Objetivo**: Capturar e surfar grandes tendências direcionais do mercado.
   - **Filosofia**: Esperar confluência macro (Ciclo de Mercado favorável), selecionar papéis líderes com Força Relativa institucional superior ao Ibovespa/benchmark, aguardar contração de volatilidade e rompimento de pivot/gatilho, dimensionar posição com stop técnico inicial rigoroso ($1R$) e conduzir a posição com trailing stop para buscar retornos altamente assimétricos ($3R$, $5R$, $10R+$).
   - **Métricas Fundamentais**: R-múltiplos, Payoff Ratio em R, Expectancy em R por trade, System Quality Number (SQN de Van Tharp).

2. **VOLATILITY TRADING (Swing Trade de Volatilidade / Reversão à Média)**
   - **Objetivo**: Explorar a assimetria estatística de correções abruptas de curto prazo em ativos com tendência primária estruturalmente sadia.
   - **Filosofia**: Comprar ativos acima da média longa móvel estrutural ($\text{SMA } 200$) que apresentaram exaustão vendedora aguda no curto prazo ($\text{IFR } 2 \le 10$ e fechamento abaixo da $\text{SMA } 7$). A realização ocorre de forma célere na primeira recuperação em direção à média rápida ($\text{SMA } 7$) ou através de uma saída temporal mandatória de $7$ pregões.
   - **Métricas Fundamentais**: Retorno financeiro (R$), Variação percentual (%), Taxa de acerto (Win Rate elevada, tipicamente $65\%-80\%$), Holding Period médio (1 a 4 pregões), Profit Factor e Payoff financeiro.

> **Princípio Inviolável de Isolamento**: O Volatility Trading **NÃO** depende de Força Relativa, Líderes Emergentes ou rompimento de pivot. Da mesma forma, a introdução de operações de volatilidade **NÃO** altera regras, scores, stops, R-múltiplos ou métricas pré-existentes de Trend Following.

---

## 2. Navegação Global: Active Strategy Workspace

A plataforma implementa o conceito de **Active Strategy Workspace** gerenciado por [`StrategyWorkspaceModel`](../frontend/strategy-workspace-model.js):

- **Toggle Global no App Shell**: Localizado na barra superior (`#strategyWorldToggle`), permite ao operador alternar instantaneamente entre os contextos:
  - `TREND_FOLLOWING` (Ícone: 📈 Tendência)
  - `VOLATILITY_TRADING` (Ícone: ⚡ Volatilidade)
- **Preferência Persistente**: A preferência ativa é persistida em `localStorage` (`healthy_trend_active_strategy`) e sincronizada com o backend de workspace state quando autenticado.
- **Evento Reativo**: Qualquer alternância dispara o evento global `healthyTrend:strategyChanged` na janela do navegador, notificando telas abertas para re-renderizarem seus filtros de forma transparente.
- **Classificação Canônica dos 15+ Módulos (`MODULE_AUDIT_MAP`)**:
  - `EXCLUSIVE_TREND`: Força Relativa, Líderes Emergentes, Desafio Grade A (Modo Desapego).
  - `EXCLUSIVE_VOLATILITY`: Motor de Volatilidade (Volatility Engine), Central de Configurações de Estratégia.
  - `SHARED_AWARE`: Watchlist, Radar de Oportunidades & Scans, Ciclo de Mercado, Gráficos, Anatomia dos Trades, Diário do Trader, Novo Trade, Simulador de Trades, SQN / Métricas, Relatórios / Exportação, Manual do Software.
  - `CONSOLIDATED_PORTFOLIO`: Visão Geral / Dashboard, Patrimônio / Carteira, Posições Abertas, Posições Encerradas, Portfolio Heat, Política de Risco, Blacklist Comportamental, Analytics Geral.

---

## 3. Modelo de Dados, Migração e Imutabilidade

A evolução do banco de dados PostgreSQL foi desenhada com transações seguras, idempotência estrita e proteção total do histórico existente:

### 3.1 Migração 043 (`043_dual_strategy_trades.sql`)
- Adiciona colunas ao registro de trades:
  - `strategy_type VARCHAR(32) NOT NULL DEFAULT 'TREND_FOLLOWING'`
  - `strategy_config_id VARCHAR(64)`
  - `strategy_config_version VARCHAR(32)`
  - `entry_setup VARCHAR(64)`
  - `exit_reason VARCHAR(64)`
  - `rubric_version VARCHAR(32)`
- **Classificação Retroativa**: 100% dos trades históricos pré-existentes foram classificados como `TREND_FOLLOWING`.
- **Preservação de Integridade**: Nenhum preço, quantidade, stop, resultado, nota, anexo ou R-múltiplo foi recalculado ou reinterpretado.
- **Rollback Transacional**: Arquivo de reversão `backend/db/rollback/043_dual_strategy_trades_rollback.sql` disponível para emergências.

### 3.2 Imutabilidade da Estratégia
- Uma vez criada uma operação, seu `strategy_type` é estritamente **imutável** durante edições operacionais comuns (ajuste de parciais, trailing stops, notas, prints).
- Alternar o mundo ativo no cabeçalho do software jamais altera a estratégia de nenhum trade gravado.
- Mudanças acidentais ou manuais no payload de edição são descartadas com preservação do valor original.
- Para correções excepcionais, a função administrativa `updateTradeStrategy` exige justificativa formal e registra entrada imutável na tabela `trade_audit_log`.

---

## 4. Central de Configurações de Estratégia

O centro de controle de parâmetros [`strategy-configs.js`](../backend/src/strategy-configs.js) e [`strategy-configuration-model.js`](../frontend/strategy-configuration-model.js) isola as variáveis matemáticas de cada mundo:

### 4.1 Parâmetros Oficiais do Volatility Swing
| Parâmetro | Valor Canônico Padrão | Descrição |
|---|---|---|
| **Timeframe** | Diário (`daily`) | Único timeframe operacional autorizado |
| **Média Curta** | SMA 7 períodos | Alvo de realização e repique |
| **Média Estrutural** | SMA 200 períodos | Filtro de tendência primária de alta |
| **Indicador** | IFR / RSI 2 períodos | Cálculo canônico com suavização de Welles Wilder |
| **Limiar de Sobrevenda** | $\le 10.0$ | Gatilho de entrada extrema |
| **Saída Temporal** | 7 pregões ($D_7$) | Teto máximo de permanência na posição |
| **Dimensionamento** | Financeiro Fixo ($10\% - 20\%$) | Alocação percentual fixa do capital líquido |
| **Liquidity Gate** | Volume $>$ R\$ 500k e $\ge 200$ negócios | Hard Gate universal anti-ilíquidos |

### 4.2 Versionamento e Hash Determinístico
- Cada perfil de configuração possui um identificador estável (`strategy_config_id`), um número de versão (`strategy_config_version`, ex: `1.0.0`) e um hash SHA-256 dos seus parâmetros.
- Na criação de um trade ou execução de uma simulação, um **snapshot imutável** dessa configuração é gravado no registro, garantindo auditabilidade eterna mesmo se o operador ajustar o perfil ativo no futuro.

---

## 5. Volatility Trading Engine: Regras de Execução

O motor de volatilidade [`volatility-trading-engine-model.js`](../frontend/volatility-trading-engine-model.js) e [`volatility-engine.js`](../backend/src/volatility-engine.js) implementa as seguintes regras matemáticas:

### 5.1 Gatilho de Entrada Comprada (Sinal em $D_{\text{sinal}}$)
No fechamento do candle diário de sinal, exige-se **simultaneamente**:
1. Candle diário completo e fechado.
2. Histórico mínimo de 200 candles no ativo.
3. $\text{Fechamento} > \text{SMA}(200)$ (Tendência primária positiva).
4. $\text{Fechamento} < \text{SMA}(7)$ (Afastamento da média curta).
5. $\text{IFR}(2) \le 10.00$ (Sobrevenda aguda).
6. **Liquidity Gate Aprovado**: Volume financeiro do pregão $>$ R\$ 500.000 e número de negócios $\ge 200$.
7. Ativo fora da Blacklist comportamental (`assetblacklist`).

### 5.2 Execução Realista sem Look-Ahead Bias (Execução em $T+1$)
- O sinal é apurado no fechamento de $D_{\text{sinal}}$.
- A ordem de compra é executada **estritamente na Abertura do pregão seguinte ($T+1$)**.
- O preço de compra absorve integralmente eventuais **gaps de abertura**, evitando simulações fictícias a preço de fechamento de ontem.

### 5.3 Regras de Saída
- **Saída por Repique (Média Curta)**: Ocorre no fechamento do primeiro pregão em que $\text{Fechamento} \ge \text{SMA}(7)$. Possui precedência técnica absoluta sobre a saída temporal.
- **Saída Temporal (Tempo Limite)**: Se após 7 pregões completos posicionados ($D_1$ a $D_7$) a recuperação na média curta não ocorrer, a posição é encerrada compulsoriamente no fechamento de $D_7$.
- **Sem Stop Técnico Inicial**: A estratégia de reversão à média trabalha sem stop técnico fixo de 1R nos primeiros pregões (pois a volatilidade negativa inicial é esperada); a saída temporal atua como a trava de controle de risco final.

---

## 6. Dual Rubric Engine: Separação Arquitetural

A avaliação de qualidade das oportunidades foi segregada em dois motores em [`trading-rubrics.js`](../frontend/trading-rubrics.js):

### 6.1 Rubric Oficial de Trend Following (`trend-v2`) — 6 Critérios (100 pts)
- Qualidade da Tendência: 20 pts
- Ciclo do Mercado (Ibovespa): 20 pts
- Força Relativa (RS): 20 pts
- Volatilidade / Contração: 15 pts
- Qualidade do Setup / Gatilho: 15 pts
- Score Fundamentalista: 10 pts

### 6.2 Rubric Oficial de Volatility Trading (`volatility-v1`) — 7 Critérios (100 pts)
- **Tendência Primária (SMA 200)**: 20 pts (Fechamento acima da média longa)
- **Gatilho de Sobrevenda (IFR 2)**: 25 pts (Profundidade abaixo de 10)
- **Afastamento da Média Curta (SMA 7)**: 15 pts (Potencial de repique)
- **Contexto de Volatilidade (ATR)**: 15 pts (Espaço para expansão de preços)
- **Liquidez Operacional (Liquidity Gate)**: 10 pts (Volume diário robusto)
- **Edge Estatístico**: 10 pts (Consistência histórica do setup no ativo)
- **Elegibilidade e Execução**: 5 pts (Abertura sem gaps proibitivos, carteira disponível)

### 6.3 Hard Gates da Volatilidade
- **Reprovação no Liquidity Gate**: Força imediatamente **Grade D** (Risco 0%), não sendo compensável por nenhum outro critério.
- **Fechamento $\le$ SMA(200)**: Bloqueia notas de excelência (Grade A e B).

---

## 7. Simulador de Trades Dual

O simulador em [`volatility-simulator.js`](../backend/src/volatility-simulator.js) e [`volatility-trade-simulator-model.js`](../frontend/volatility-trade-simulator-model.js) entrega:

- **Determinismo Matemático Estrito**: A mesma base de cotações B3/COTAHIST combinada com a mesma configuração e versão gera resultados idênticos até os centavos.
- **Simulações Comparativas Multi-Cenário**: Permite comparar simultaneamente perfis clássicos (ex: IFR 5 vs IFR 10 vs IFR 15 vs IFR 20).
- **Sem Look-Ahead Bias**: Cotações de abertura, máxima, mínima e fechamento respeitam estritamente a linha temporal $D_{\text{sinal}} \to D_{\text{execução}} \to D_{\text{holding}} \to D_{\text{saída}}$.
- **Sem Duplicação de Ordens**: O simulador bloqueia novas entradas em ativos onde já exista uma posição aberta em andamento.

---

## 8. Strategy Analytics e Reconciliação de Carteira

O módulo [`strategy-analytics.js`](../backend/src/strategy-analytics.js) reconcilia os dois mundos:

### 8.1 Pureza Estatística do SQN (R-Isolation)
- A fórmula do System Quality Number ($\text{SQN} = \sqrt{N} \times \frac{\bar{R}}{\sigma_R}$) de Van Tharp exige que cada trade tenha um risco inicial $1R$ estritamente mensurado por um stop técnico.
- Como o Volatility Trading não utiliza stop por R, suas operações são **filtradas e isoladas** no cálculo do SQN em [`system-quality-analytics-model.js`](../frontend/system-quality-analytics-model.js), blindando o SQN de Trend Following contra contaminações matemáticas.

### 8.2 Reconciliação Consolidada da Carteira
- **Resultado Financeiro Líquido**: A soma do PnL de Trend Following mais o PnL de Volatilidade resulta identicamente no resultado consolidado da conta.
- **Exposição Ponderada e Heat**: Os limites máximos de capital da Política de Risco monitoram simultaneamente a soma das posições abertas de ambos os mundos.
- **Correlação de Curvas**: O analytics apura a correlação entre as estratégias para comprovar o benefício de diversificação do operador.

---

## 9. Diferença Crucial: Capital Alocado vs. Risco

Um dos erros mais comuns de operadores iniciantes é confundir **Capital Alocado** com **Risco Monetário**:

| Dimensão | Trend Following | Volatility Trading (IFR2) |
|---|---|---|
| **Definição de Risco** | Distância até o Stop Loss técnico ($1R$). Se o stop é de $5\%$, arrisca-se $0.4\%$ do patrimônio total. | Não há stop móvel inicial. O risco é a volatilidade intrínseca da posição durante o holding de 7 pregões. |
| **Capital Alocado** | Definido pelo Position Sizing de 3 camadas: `(Equity × Risk Budget) / Distância do Stop`. | Tamanho financeiro fixo: tipicamente $10\%$ a $20\%$ do Equity por ativo. |
| **Pior Cenário Típico** | Perda limitada ao stop projetado (ex: $-1.0R$). | Perda contida pelo tempo: o ativo é liquidado no $7º$ pregão mesmo que no prejuízo (tipicamente $-3\%$ a $-8\%$). |
| **Alavanca de Proteção** | Stop Loss antecipado e Breakeven. | Diversificação em vários ativos e saída temporal compulsória. |

---

## 10. Limitações e Riscos do Volatility Trading

1. **Risco de "Faca Caindo" (Falling Knife)**:
   - Em notícias catastróficas ou fraudes corporativas, ativos continuam caindo mesmo com IFR(2) próximo de zero.
   - *Mitigação*: A exigência mandatória de Preço $>$ SMA(200) e o Liquidity Gate eliminam papéis em tendência primária de baixa ou alvos de desespero especulativo.
2. **Risco de Cauda e Gaps de Abertura**:
   - Gaps adversos de abertura entre o dia de sinal e a execução, ou durante o período de holding em dias de divulgação de resultados trimestrais.
   - *Mitigação*: Execução realista com gap absorption e limitação do capital alocado por posição.
3. **Comportamento em Bear Markets Generalizados**:
   - Durante crises sistêmicas ou mercados de baixa duradouros, a quantidade de ativos acima da SMA(200) diminui drasticamente, reduzindo a frequência de operações.
   - *Mitigação*: A estratégia protege o operador mantendo o capital parado em liquidez remunerada.

---

*The Healthy Trend Trader — Processo antes do resultado.*

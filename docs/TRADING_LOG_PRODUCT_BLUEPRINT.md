# Trading Log → Produto: blueprint inicial

## Objetivo

Transformar o `Trading_Log_Premium_V9.xlsx` em um software de uso diário que preserve a lógica do método, reduza digitação e torne risco, execução e disciplina mais fáceis de acompanhar.

O produto não deve reproduzir abas e colunas. Ele deve representar o ciclo de vida real de uma decisão de trading.

## O que a planilha faz hoje

A análise identificou 12 abas com cinco responsabilidades principais:

1. **Operações reais e simuladas** — quatro abas trimestrais e uma área de paper trading, com até 48 campos por linha.
2. **Motor de risco** — position sizing pelo menor limite entre risco, ATR e capital; risco ongoing; portfolio risk; peel-off matemático.
3. **Patrimônio** — separação entre equity da estratégia, patrimônio real e aportes/retiradas.
4. **Avaliação do processo** — contexto A+, checklist de execução, execution score e observações comportamentais.
5. **Consolidação** — base anual, dashboard mensal e histórico de vendas parciais.

Há também fórmulas quebradas na consolidação (`#REF!`, `#VALUE!` e `#NAME?`). Isso reforça uma vantagem importante do software: os indicadores devem ser calculados a partir de registros estruturados, sem depender de referências frágeis entre linhas e abas.

## Como o preenchimento acontece no dia a dia

### 1. Antes da ordem: planejar

O trader informa somente os dados conhecidos naquele momento:

- mercado, ativo e direção;
- contexto A+ e regime de mercado;
- setup e timeframe;
- entrada, stop inicial, trailing stop e ATR diário;
- multiplicador, quando for futuro.

O sistema calcula automaticamente:

- quantidade por risco;
- quantidade por volatilidade/ATR;
- quantidade por capital;
- quantidade final e fator limitante;
- risco financeiro e percentual;
- exposição e ATR percentual;
- impacto no portfolio risk;
- permissão, alerta ou bloqueio conforme a política configurada.

### 2. Depois da execução: confirmar abertura

O plano vira uma posição somente após registrar a execução real. O sistema guarda separadamente o que foi planejado e o que foi executado.

A quantidade executada pode ser diferente da quantidade sugerida. O sistema deve permitir a alteração manual, preservar a quantidade planejada para comparação e alertar quando a decisão elevar o risco ou violar algum parâmetro. O alerta não impede a execução.

### 3. Durante a posição: atualizar por evento

Em vez de editar a mesma linha extensa, o trader registra eventos:

- atualização de preço, ATR ou trailing stop;
- ajuste de stop;
- venda parcial/peel-off;
- nova observação;
- encerramento.

Cada evento recalcula risco ongoing, volatilidade, P&L aberto, P&L realizado, quantidade atual e ação recomendada.

### Peel-off pertence à posição

O `PEEL_OFF_LOG` não deve virar uma área separada no software. Cada venda parcial será um evento dentro da própria posição e aparecerá em sua linha do tempo.

Cada parcial deve registrar:

- data e horário;
- quantidade reduzida;
- preço executado;
- custos, quando informados;
- P&L da parcial;
- P&L realizado acumulado;
- quantidade remanescente;
- preço médio e risco após a redução;
- motivo ou observação;
- indicação se a redução foi discricionária ou sugerida pela política de risco.

O cabeçalho da posição deve mostrar, a qualquer momento, quantidade inicial, quantidade atual, número de parciais, P&L realizado, P&L aberto e P&L total. Assim é possível reconstruir toda a história sem consultar um log paralelo.

### 4. No fechamento: revisar

Ao encerrar, o sistema solicita:

- saída e motivo;
- checklist de aderência ao plano;
- observação comportamental específica;
- aprendizados e evidências.

O execution score é derivado do checklist, não digitado manualmente.

### 5. Mesmo sem trade: registrar o dia

O diário permanece independente das posições. Espera, contexto de mercado e proteção de capital também são dados relevantes.

## Arquitetura funcional proposta

### Hoje

Uma nova tela inicial operacional, acima do dashboard analítico:

- permissão atual para operar;
- portfolio risk e capacidade disponível;
- posições que exigem atualização;
- alertas de stop, volatilidade e peel-off;
- rascunhos de planos;
- ação principal contextual: planejar, atualizar ou revisar.

### Planejar trade

Um fluxo curto em quatro etapas:

1. **Contexto** — mercado, ativo, lado, setup, regime e A+.
2. **Risco** — entrada, stop, ATR, multiplicador e cálculo automático.
3. **Carteira** — impacto nas posições existentes e portfolio risk após a entrada.
4. **Decisão** — resumo, violações, checklist e salvar plano/confirmar execução.

Violações geram alertas claros, mas nunca bloqueiam a confirmação. A decisão final permanece com a pessoa.

### Posição

Uma página por posição contendo:

- plano original;
- estado atual;
- linha do tempo de execuções e ajustes;
- P&L realizado e aberto;
- risco inicial e ongoing;
- peel-offs;
- notas, imagens e revisão final.

### Risco & patrimônio

Separar explicitamente:

- **equity da estratégia**: resultado operacional sem aportes/retiradas;
- **patrimônio real**: saldo efetivo das contas;
- **fluxos externos**: aportes, retiradas e gastos;
- **política de risco**: parâmetros versionados, para preservar qual regra valia na data de cada trade.

### Analytics

Calcular resultados por mercado, ativo, direção, setup, regime, contexto A+, volatilidade, limitador, aderência e período. A análise deve comparar resultado financeiro com qualidade do processo, evitando premiar apenas atividade.

## Modelo de dados essencial

- `Account`: conta, moeda e corretora.
- `EquitySnapshot`: patrimônio por conta e data.
- `CashFlow`: aporte, retirada ou gasto.
- `RiskPolicyVersion`: parâmetros de risco válidos em determinado período.
- `MarketContext`: leitura diária do mercado e permissão operacional.
- `TradePlan`: tese e inputs anteriores à ordem.
- `Position`: identidade e estado atual da operação.
- `ExecutionEvent`: entrada, redução, saída e custos.
- `RiskSnapshot`: risco/volatilidade calculados em cada atualização.
- `JournalEntry`: registro diário independente.
- `TradeReview` e `WeeklyReview`: avaliação de execução e aprendizado.

## Migração da planilha

O `.xlsx` deve ser tratado como fonte de importação, não como banco de dados permanente.

1. Importar posições reais das abas trimestrais.
2. Converter cada linha em plano + posição + eventos.
3. Converter `PEEL_OFF_LOG` em eventos de redução.
4. Importar paper trades com identificação explícita de simulação.
5. Importar patrimônio e fluxos em séries separadas.
6. Recalcular consolidações no sistema e reconciliar os totais com a planilha.
7. Manter o arquivo original intacto para auditoria.

## O que já existe no site e o que falta

O protótipo atual já possui a linguagem visual e quase todos os destinos corretos: visão geral, posições, novo trade, risco, analytics, diário, revisão e configurações.

Porém, ele ainda é predominantemente demonstrativo:

- números e posições estão fixos no HTML;
- salvamentos alteram apenas a página atual;
- não há persistência nem modelo de domínio;
- não há ciclo de vida por eventos;
- o formulário ainda não representa toda a política ongoing/peel-off;
- não existe importação reconciliada da planilha.

## Primeira entrega recomendada

Implementar uma **vertical slice de uma posição real**:

1. tela `Hoje` com dados reais importados;
2. wizard de planejamento com as três camadas de sizing;
3. criação de posição;
4. atualização de stop/ATR/preço;
5. peel-off e encerramento como eventos;
6. persistência local estruturada;
7. cálculo do portfolio risk;
8. importação inicial dos trades do terceiro trimestre para validação.

Essa fatia comprova o coração do produto antes de investir em dashboards e analytics completos.

## Decisões validadas

- **Política de risco:** violações geram alertas, não bloqueios.
- **Execução:** a quantidade real pode ser alterada manualmente e diferir da planejada; ambas devem ser preservadas.
- **Atualizações no MVP:** preço, ATR e stop serão informados manualmente.
- **Paper trading:** utiliza as mesmas políticas e cálculos das operações reais, com separação explícita para não afetar patrimônio nem portfolio risk real.
- **Peel-off:** cada parcial pertence à posição e aparece em sua linha do tempo; não haverá um módulo de log separado na experiência principal.

## Decisão ainda em aberto

- As mensagens pessoais de disciplina devem ser configuráveis como regras temporárias, sem serem codificadas de forma permanente.

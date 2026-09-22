# Product Specification — V2 Premium

## Princípio

Ferramenta pessoal validada pelo fundador, construída tecnicamente como futuro SaaS.

## Posicionamento

Não é apenas um trading journal. É um sistema operacional de processo, risco e decisão para trend followers.

## Entidades centrais

- User
- TradingAccount
- Position
- Execution
- Exit
- StopAdjustment
- Strategy
- Setup
- ChecklistAssessment
- JournalEntry
- PortfolioSnapshot
- CashMovement

## Regras essenciais

- Contexto Diário e execução 4H.
- ATR%: verde abaixo de 2%, amarelo de 2% a menos de 4%, vermelho a partir de 4%.
- Nenhum trade é Grade A (Rare Trade) sem score ≥95 e excelência em todos os seis critérios críticos da Rubric; o risco ainda precisa ser permitido pela política.
- Aportes e retiradas não entram no resultado da estratégia.
- Uma posição pode ter múltiplas entradas, saídas e ajustes de stop.

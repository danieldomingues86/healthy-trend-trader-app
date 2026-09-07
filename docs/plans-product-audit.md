# Auditoria da página de planos

## Referência visual absoluta — atualização

Atualização de integração ao workspace: a faixa superior de 45px da referência é ocultada por enquadramento CSS, sem editar o PNG, e seus links foram removidos. A página usa toda a largura útil, como Trader Zen; a proporção visível passa a 1024:1491. Os alvos de clique de preços e fechamento foram alinhados à arte. A comunicação dos controles funciona também em previews `file://`, mantendo a verificação da janela de origem.

Por solicitação posterior, a apresentação principal agora usa o HTML fornecido `healthy_trend_trader_pixel_perfect.html`. Ele contém uma arte PNG única com hotspots transparentes. O documento foi preservado em `frontend/plans-reference.html`, com a imagem extraída sem alteração de bytes para `assets/plans-reference-v1.png`. Foram adicionados o script de ações, regiões semânticas sem caixas visuais, títulos para leitores de tela e hotspots transparentes sobre o mapa e a comparação. Todos os estilos visuais originais, posições dos CTAs existentes, proporção 2:3 e largura máxima original de 1024px permanecem idênticos.

A referência fica isolada dos estilos globais da aplicação. Os CTAs chamam a lógica existente; as informações auditadas abaixo continuam disponíveis no painel de planos e assinatura. O texto estático da arte não redefine permissões. Não foram inventados depoimentos: o link correspondente informa que ainda não existem publicados. A navegação, as regiões de conteúdo, os CTAs, as quatro etapas do processo e a consulta de recursos dos planos já têm estrutura/interação HTML. Os painéis usam o inventário auditado e a navegação com guard existente. O estado do plano é comunicado aos controles acessíveis. O conteúdo visual das seções ainda é a arte original, preservada para a conversão gradual.

Base: código da branch `codex/next-iteration`, após o PR #33. Auditoria realizada antes de compor a nova comparação. Esta nota registra o levantamento de implementação; não altera permissões nem define novos pacotes comerciais.

## Fontes e conclusão

- `index.html`: inventário `titles`, seções `.page`, `navigationTiles`, funções de renderização, `professionalPages`, guard de `go`, limite de criação e ciclo do teste grátis.
- `frontend/auth-client.js`: autenticação, sincronização das operações e registro de uso da plataforma; não substitui a seleção local de plano.
- `frontend/fundamentals-page.js` e `fundamental-score.js`: pesquisa, indicadores, score e integração de fundamentos ao planejamento.
- `frontend/market-scans-page.js` e `backend/src/market-scans.js`: sete scans, filtros, resultados, watchlist e bloqueio Professional.
- `frontend/trading-rubrics.js`, `manual-rubric-page.js`: cálculo, risco, dimensionamento e explicação da Rubric.
- `frontend/trader-zen.js`: experiência Zen, respiração, sons e temporizador.
- `backend/src/subscription-plans.js`: Basic R$ 29/mês, R$ 278,40/ano, 50 novos trades/mês; Professional R$ 69/mês, R$ 662,40/ano, sem limite mensal; teste de sete dias.
- `backend/src/server.js`: inventário das APIs de autenticação, operações, patrimônio, risco, uso, mercado e catálogo de planos.

O guard efetivo de navegação tem 13 áreas Professional. Fundamentos, Trading Rubric, Política de Risco, Patrimônio e Portfolio Heat não são exclusivos no código atual. Analytics inteiro está no guard Professional; não existe uma separação implementada de “Analytics básico” e “Analytics avançado”. A tela anterior contradizia esse comportamento. Nenhum desses acessos foi modificado no redesign.

## Todas as áreas e funcionalidades

### Compartilhadas por Basic e Professional

- `today` — Hoje: início do dia, leitura resumida de contexto e atalhos da rotina.
- `newtrade` — Novo Trade: planejamento, registro, confirmação de execução, integração de fundamentos e Trading Rubric. Rubric é um componente/fluxo do planejamento, não uma rota própria.
- `positions` — Posições: consulta, filtros por período, operações reais/simuladas e histórico.
- `positiondetail` — Gestão da posição: eventos, ajustes, saídas e acompanhamento da operação.
- `risk` — Position Sizing: dimensionamento com limites de risco. Também integrado ao Novo Trade.
- `dashboard` — Patrimônio: capital, aportes, retiradas e alocações.
- `riskpolicy` — Política de Risco: perfis, grades, limites, pesos e configurações da Rubric.
- `portfolioheat` — Portfolio Heat: risco agregado, folga, alarmes, bloqueio e redução de exposição.
- `fundamentals` — Análise Fundamentalista: busca de ticker, dados financeiros, score, histórico e leitura da qualidade da empresa; página criada pelo módulo externo.
- `manual` — Manual do software: capítulos, exemplos e explicação do método, incluindo a Rubric atual.
- `glossary` — Glossário do método: busca e explicação dos conceitos.
- `settings` — Configurações gerais: temas, idioma, navegação, foco de mercado e atalho de suporte.
- `profile` — Meus Dados: identidade e preferências da conta.
- `avatar` — Avatar: iniciais e cor.

### Exclusivas Professional (também disponíveis no teste ativo)

- `marketmap` — Panorama de Mercado: leitura visual de índices, classes e ambiente.
- `marketcycle` — Ciclo de Mercado: contexto de tendência e leitura de ambiente.
- `relativestrength` — Força Relativa: universos de ações, FIIs e BDRs, benchmarks, bandas, filtros e ordenação.
- `marketscans` — Scans de Mercado: alta forte, queda forte, volume anormal, líderes RS, aceleração RS, ATR baixo e tendência saudável; watchlist e estados de dados indisponíveis.
- `analytics` — Painel da Verdade: analytics das operações e resultados, inclusive dados sincronizados.
- `journal` — Diário do Trader: registros, estados e anotações do processo.
- `review` — Revisão Semanal: consolidação e aprendizado sobre execução.
- `platformaccess` — Uso da plataforma: sessões, duração, aberturas, preferências e Monitor do Profit.
- `zen` — Trader Zen: experiência de foco, sons, respiração e tempo de sessão.
- `habits` — Monitor de Hábitos: rotina mensal, marcações e estatísticas.
- `audiolibrary` — Biblioteca Mental: áudios organizados por contexto e reprodução.
- `wisdom` — Sabedoria do Trader: referências, categorias e acervo de imagens paginado.
- `traderprofile` — Perfil do Trader: testes de risco/comportamento e relatório consolidado.

### Áreas de serviço

- `plan` — Plano e uso: redesenhada como narrativa comercial; mantém plano vigente, mensalidade, anualidade, uso, teste e seleção.
- `upgrade` — Conheça o Professional: barreira contextual de recurso ou limite; também mostra encerramento do teste. Preservada.
- Login/logout e menu da conta: componentes globais, não benefícios exclusivos.
- Navegação lateral, superior e hub de tiles; temas Healthy/Gold; português/inglês; atalho de suporte: componentes transversais preservados.

## APIs verificadas

- Auth: POST `/api/auth/login`, GET `/api/auth/me`, POST `/api/auth/logout`.
- Sessões: GET/POST `/api/platform-access/sessions`; POST `/:id/heartbeat` e `/:id/close`; GET/PUT `/api/platform-access/preferences`; GET `/api/platform-access/monitor`; POST `/monitor/start` e `/monitor/stop`.
- Operações: GET/POST `/api/trades`; POST `/api/trades/:id/execute` e `/api/trades/:id/events`.
- Patrimônio: GET `/api/wealth`; POST `/api/wealth/movements` e `/api/wealth/allocations`; PUT `/api/wealth/allocations/:id`.
- Risco: GET/PUT `/api/risk-policy`.
- Catálogo e serviço: `/api/subscription/plans`, `/api/health`, `/api/trader-wisdom/assets`.
- Mercado: `/api/fundamentals`, `/api/market-cycle`, `/api/market-overview`, `/api/market-scans`, `/api/relative-strength`, `/api/relative-strength/classes`, `/api/relative-strength/classify`.

APIs e autenticação permanecem sem alteração. A página comercial descreve o acesso da interface; não cria um novo mecanismo de autorização no servidor.

## Nomes atualizados e lacunas da página anterior

- Today → Hoje; Dashboard / Equity Status → Patrimônio.
- Analytics → Painel da Verdade (mantido também o termo Analytics para reconhecimento).
- Rastreador de hábitos → Monitor de Hábitos.
- Scans de Mercado, Fundamentos, Trading Rubric, Política de Risco, Portfolio Heat, Biblioteca Mental, Sabedoria do Trader, Perfil do Trader, Uso da plataforma / Monitor do Profit e Glossário não apareciam adequadamente na comparação anterior.
- Removida a promessa vaga de prioridade em análises futuras; a comparação descreve recursos existentes.

## Preservação e cobertura

- Nenhuma alteração em `professionalPages`, guard de navegação, `setSubscriptionPlan`, persistência, contador mensal, teste de sete dias ou backend.
- Preços anuais e desconto de 20% preservados como informação secundária.
- Basic continua com consulta/gestão ilimitada dos registros existentes e limite de 50 novos registros mensais.
- Seleção continua local e sem cobrança nesta versão, informada junto aos preços.
- A comparação usa a classificação real de `professionalPages`; testes verificam que todas as rotas de produto do inventário `titles` estão representadas uma única vez, além da Rubric integrada.
- Testes de estados: Basic, Professional, teste ativo, teste expirado, ativação de teste, troca/persistência do plano e inglês.

## Correção de nitidez e interação

A apresentação rasterizada foi retirada do carregamento do app após mostrar perda de nitidez quando ampliada. A página ativa usa novamente o renderer nativo auditado, com tipografia HTML, ícones e fluxos SVG, cartões e botões reais. O enquadramento ocupa toda a largura, sem menu comercial duplicado. Os arquivos da referência permanecem como material de consulta, mas não são carregados pela página de planos. Paisagens são os únicos elementos bitmap. Não se promete identidade pixel a pixel com a imagem: a composição foi adaptada em componentes responsivos para eliminar o texto rasterizado.

Validação no navegador, em fixture isolada com as funções reais de assinatura: CTA de apresentação, CTA final, seleção Professional, retorno ao Basic e atualização do limite/estado. A fixture não usa a chave de assinatura do usuário. A página de produção continua usando os guards e a persistência originais.

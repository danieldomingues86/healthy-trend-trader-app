# Inteligência Emocional do Trader

O Diário registra; a Biblioteca estuda trades; a Inteligência Emocional conecta o histórico comportamental. Esta tela não tem formulários nem exige novos registros.

## Fontes e limites

- Diário V2 da conta: estados selecionados, intensidade 1–5, descrição original, observações, contexto de mercado, plano e execução 0–10.
- Trades: entradas e encerramentos datados, ativo, setup, conta Real/Paper, eventos de saída e resultado em R quando explicitamente documentado ou calculável a partir do risco inicial. Stop atual não é usado como substituto do risco inicial. Trades planejados são excluídos, IDs duplicados são consolidados. Resultados são atribuídos ao dia do encerramento.
- Uso da Plataforma: sessões privadas da mesma conta via `/api/platform-access/sessions?days=all`. Aberturas de sessões são acessos, não consultas de página. A média usa dias calendários dentro do período coberto pelo histórico disponível. Dias anteriores à primeira sessão não são imputados como zero.
- Consultas às áreas: contadores diários privados em `healthy-trend-behavior-activity-v1`, registrados apenas quando a conta está autenticada e o workspace carregado. Áreas administrativas não entram. Repetição do mesmo destino em menos de 60 segundos é ignorada. Esses contadores começam nesta versão, não reconstroem navegação antiga e não são somados às sessões.
- Sono, violações de regras não documentadas e interpretação psicológica de texto não são inventados. Textos originais aparecem como evidência, não como classificação por IA.

## Motor

`frontend/emotional-intelligence-model.js` é independente da apresentação e recebe records, trades, sessions, activity, period e now. Une datas no fuso America/Sao_Paulo, preservando datas sem horário.

Os períodos são janelas inclusivas de 7, 30, 90, 180 e 365 dias e todo o histórico. A comparação anterior tem a mesma extensão, sem sobreposição. Todo o histórico não tem comparação anterior equivalente.

Padrões usam grupos com pelo menos 3 observações e 3 controles e diferença mínima relevante para a escala (por exemplo, 0,7 de execução ou 12 pontos percentuais de aderência). Os cards guardam as ocorrências e os controles, que podem ser inspecionados no modal. Confiança descreve repetição: baixa a partir de 3 ocorrências; média com pelo menos 7 ocorrências e 5 controles; alta com 15 e 8. Não representa teste de significância, diagnóstico ou probabilidade causal. O modal explica isso.

Consultas após perdas/ganhos e novas operações após perdas exigem horários precisos. Dias com resultados mistos são excluídos da comparação pós-resultado. Janelas de observação dentro do dia podem ser diferentes, então o texto declara essa limitação. Estados emocionais do Diário não têm horário e não são descritos como posteriores aos trades.

Associações de Pearson precisam de 7 pares válidos e variação nos dois fatores. Aderência integral conta yes=1 e partial/no=0; ausências não viram zero. Mercado é uma variável ordinal declarada (down=0, transition=1, up=2). Dia da semana usa médias por grupo, não uma correlação linear arbitrária.

Contextos agrupam o conjunto exato de emoções e a faixa 1–2, 3 ou 4–5. Apenas grupos recorrentes de pelo menos 3 dias com execução avaliada concorrem a melhor execução e maior atenção. Resultado médio usa somente trades com R calculável.

Não existe insight de demonstração na tela de produção. Sem base, a página convida a continuar o Diário. Falha no histórico de acessos não interrompe a leitura das demais fontes nem estima métricas.

## Verificação

`frontend/emotional-intelligence-model.test.js` cobre ausência de dados, datas no Brasil, deduplicação, R e parciais, grupos auditáveis, amostras pequenas, filtros e sequência temporal. O teste de acessos verifica a consulta de histórico completo mantendo isolamento por user_id.

`scripts/verify-emotional-intelligence.cjs` serve o app local em uma porta efêmera, bloqueia o backend real e cria dados exclusivamente em navegador descartável. Testa larguras 2554, 1920, 1366 e 390, filtros e modal, e salva capturas em `output/emotional-intelligence-qa`. Usa Playwright instalado; EI_BROWSER_CHANNEL=msedge permite usar o Edge existente. As capturas usam dados de teste, não uma conta real.

## Cenário artístico

Arquivo: `assets/emotional-intelligence-study-v1.png`. Criado com a ferramenta integrada de geração de imagens, usando a imagem fornecida pelo usuário como referência direta de composição e atmosfera.

Prompt final:

Create a photorealistic premium website background asset, landscape 16:9, no interface, no text, no charts. Use the attached reference image as the direct visual composition and mood reference ONLY: sophisticated trader study room with deep forest green botanical shaded left area, wooden desktop and dark walnut bookshelves, aged brass compass leaning beside a restrained stack of dark leather books at the TOP RIGHT, warm amber daylight from a window at far right revealing a mountain lake, delicate green foliage top left and top right. The top 25 percent is the artistic hero: leave the left 60 percent dark forest green quiet negative space for a headline; objects concentrated right. The lower 75 percent is unobtrusive warm walnut desk surface with subtle texture, low visual detail, to host cream paper panels. Study/investigation, self-knowledge and discipline atmosphere, warm realistic lighting, aged gold, forest greens and natural materials, cinematic high-end photographic detail. Match reference placement, depth and lighting; avoid extra props, people, busy decorations, lettering, symbols, logos, UI panels. This is a background for Healthy Trend Trader Emotional Intelligence screen.

# Força Relativa — corrida cinematográfica

## Implementação

- Uma arte WebP de 1536 × 1024 (326848 bytes) em `assets/relative-strength-race-v4.webp`, gerada com imagegen integrada a partir da nova referência.
- Cinco cavalos com redução progressiva de tamanho, contraste, saturação e destaque. A paisagem permanece integrada à área de dados.
- Labels e imagem compartilham um container com proporção 3:2. As posições são percentuais desse container, não da viewport. Em espaços menores a mesma peça permite rolagem horizontal, sem separar os labels dos cavalos.
- Conteúdo centralizado com largura máxima de 1680 px. Universos em uma faixa compacta; cinco cards de classificação na faixa seguinte.
- Painel, cabeçalho e linhas com níveis distintos de luminosidade. Destaque das linhas líderes e badges graduais dependem do score existente.
- Faixas de apresentação: 90+, 70–89, 40–69, 30–39 e 0–29. A subdivisão visual não altera scores, universos, serviços, ordenação ou dados de origem.
- O botão “Ver análise” reutiliza `openFundamentalsForTicker`, já existente no aplicativo.
- O lembrete operacional, divisões por grupos e navegação continuam disponíveis. A tabela mantém todas as linhas; não foi limitada aos dez exemplos da referência.

## Validação

- 416 ativos locais conferidos contra a fonte existente: 76 Ibovespa, 201 demais ações, 106 FIIs e 33 BDRs.
- Ordem e scores de todas as linhas preservados; objeto de dados não modificado pela apresentação.
- Busca por ticker, busca sem resultados, filtro de grupo e seleção dos quatro universos verificados.
- Cinco faixas visuais verificadas contra o score de cada linha.
- Botão de análise verificado quanto ao encaminhamento do ticker para a função existente.
- Temas Gold e Healthy com os mesmos painéis da referência.
- Layout inspecionado em 1536 × 1024 e larguras 3440, 1920, 1366, 1024, 768 e 390 px. Sem transbordamento da página, com rolagem própria para a tabela e para a corrida nas telas pequenas.
- Em 1536 × 1024, conteúdo começa em x=244 e ranking em y≈455, coincidindo com a composição da referência.
- Seis testes existentes de `market-data` e `stock-universe` passaram.

A inspeção local tornou a tela visível no navegador de teste sem autenticar uma conta. Não foram injetados dados financeiros fictícios; plano e permissões exibem o estado disponível no aplicativo.

## Prompt da arte

Use case: stylized-concept. Asset type: single photoreal cinematic background for the attached Healthy Trend Trader dashboard. The attached image is the strict composition reference. Generate ONLY its natural landscape and horse-racing artwork, removing ALL interface, panels, table, sidebar, cards, labels and typography. No letters or text except saddle numbers 1, 2, 3. Output landscape 1536x1024. Treat the reference content area to the RIGHT of sidebar as the whole image. Upper 32 percent: cinematic alpine mountain horse race, deep emerald pine forest, majestic sunlit mountain peaks across top, warm natural sun at upper right. Left 30 percent of the upper area remains dark forest negative space for editorial text. Five horses ALL face and gallop toward the right. Follow reference visual hierarchy and arrangement exactly: dominant protagonist horse centered x=43%, y=20%, stretching from x=29% to x=54%, luminous rich brown muscular horse, jockey in vibrant emerald green, green saddlecloth number 1, very large, foreground, extremely crisp, bright gold rim light, flying dust. Second horse centered x=58%, y=23%, smaller than leader, rich gold jockey and saddlecloth number 2, strong but less sharp/bright than leader. Third horse centered x=72%, y=26%, noticeably smaller and desaturated gray/beige jockey number 3, softer and lower contrast, partly lost in dust. Fourth horse at x=83%, y=29%, still smaller, darker and more faded, muted gray; fifth horse at x=93%, y=31%, very small, distant and almost disappearing into dust, restrained faded burgundy. NOT five equally powerful horses. A dramatic unambiguous size, sharpness, saturation and luminosity progression from the large emerald first horse to the tiny faded last horse. Golden backlit dust naturally connects them, no rectangular boundaries. Race takes place on a mountain valley racetrack with subtle wooden rails. Bottom 65% is continuous dark green forest, soft foreground foliage and depth, for overlaying a financial table; keep this area restrained and dark emerald, no horses there. Premium sophisticated realistic art, close fidelity to attached reference, no fantasy, no glowing magical trail, no UI, no text or labels, no graphics. The race and forest must be one natural uninterrupted scene.

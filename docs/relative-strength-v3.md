# Força Relativa V3

A apresentação reutiliza os renderizadores existentes de universo, busca, setores, faixas e linhas. Não há mudanças em serviços, cálculos ou dados. A arquitetura existente é JavaScript/HTML, preservada sem introduzir React.

## Arte

Ferramenta: imagegen integrada, usando a referência anexada.
Arquivo final: `assets/relative-strength-mountain.webp` (1672 × 941, 261670 bytes).

Prompt usado:

> Create a single cinematic landscape background asset for the supplied dashboard reference. Match the landscape composition of the reference closely, excluding sidebar and ALL interface, lettering, cards, tables, logos and text. Wide 16:9 landscape. Dark emerald alpine mountains and pine forest, layers of mist, deep near-black green foreground. Jagged mountains across the upper half, golden sunrise near x=78%, y=12%, tallest right peak beside sun. A delicate glowing gold trail climbs from x=44%, y=34% across the mountain ridge to x=78%, y=13%, with four subtle luminous waypoints. Left upper area dark forest/mountains for overlay title. Bottom two thirds dark forest and mist for a data table overlay, still detailed and visible. Premium photoreal cinematic art, restrained volumetric light, exactly reference green/gold atmosphere. NO text, NO UI, NO labels. Output a landscape image file.

## Verificação local

- Comparação visual desktop 1774 × 887 com a referência: ranking começa em y=398; montanha contínua, hero editorial, percurso dourado e painéis dark glass.
- Temas Gold e Healthy: apresentação verde consistente nesta página.
- Quatro universos: 76 ações Ibovespa, 201 demais ações, 106 FIIs, 33 BDRs no estado de dados local. Ordem e scores de todas as linhas comparados com `relativeClassFilteredItems()`.
- Busca CMIN3 e seleção de grupo verificadas no navegador.
- Mobile 390 × 844: sem transbordamento horizontal da página; tabela com scroll próprio.
- Sem erros JavaScript durante a verificação.
- Seis testes existentes de market-data e stock-universe passaram.

A inspeção visual exibiu a tela no navegador de teste sem autenticar uma conta. Os valores financeiros vieram do estado carregado pela própria aplicação; não foram injetados mocks. Plano, avatar e permissões mantêm o estado real disponível. O lembrete operacional continua disponível abaixo do ranking. A arte é uma reconstrução baseada na referência, não a imagem original com a interface removida de forma exata.

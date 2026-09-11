## Resultado

Redesenha a tela de Força Relativa com hero cinematográfico, cards de universos e classificação, e ranking dark glass integrado à paisagem. Telas menores mantêm a arte original da corrida; acima de 1952 px, uma arte panorâmica própria ocupa a largura disponível, com proporção preservada e sem emendas ou cavalos duplicados.

A apresentação mantém os dados, cálculos, serviços, ordenação e navegação existentes. Corrige o filtro de grupos para preservar o valor original ao traduzir os rótulos, melhora o contraste do seletor e mantém os textos em português e inglês. A última coluna passa a ser “Fundamentos”, com botões “Ver Análise” centralizados.

## Validação

- Verificação de sintaxe JavaScript e `git diff --check` sem erros.
- 6 testes de market-data e stock-universe passando.
- Inspeção visual local em 1920, 2552 e 3440 px, com troca automática do fundo e ranking na primeira viewport.
- Filtro de serviços de saúde conferido em português e inglês durante a implementação.

As inspeções locais usaram os dados já disponíveis no aplicativo; o fluxo autenticado em produção não foi testado. As artes e os prompts estão documentados. O panorama possui resolução nativa de 2172 × 724.

# Sabedoria do Trader V2

O índice também é distribuído como `frontend/trader-wisdom-index.js`, carregado antes do catálogo. Assim, abrir `index.html` diretamente não depende de `fetch` de JSON, bloqueado por navegadores em `file://`. O gerador atualiza ambos os formatos; apenas os caminhos são carregados, não as imagens. `scripts/build-wisdom-search-index.cjs` extrai o texto pesquisável dos originais para que a busca encontre nomes e palavras escritos nas imagens.

Catálogo editorial sobre os arquivos existentes. `scripts/build-wisdom-index.cjs` gera somente o índice de caminhos a partir do acervo real; execute ao adicionar/remover arquivos. O índice atual contém 1.543 imagens, incluindo as duas referências previamente catalogadas, que não são duplicadas na contagem.

Os originais permanecem intactos. Apenas 12, 24 ou 48 cards são renderizados por página; nenhuma imagem original é baixada pela grade. O original é carregado no modal com `object-fit:contain`. Favoritos usam o mesmo estado/persistência existentes e IDs estáveis; referências catalogadas preservam seus IDs anteriores.

Há 12 referências com trechos disponíveis nesta versão: duas já catalogadas e dez transcritas visualmente dos próprios originais. Autoria é apenas a registrada no acervo, não uma verificação histórica da citação. Traduções editoriais são separadas do original no detalhe. Os demais itens têm fallback explícito e continuam acessíveis/favoritáveis; sua busca textual exige transcrição futura. Filtros não atribuem temas inventados a imagens ainda não catalogadas.

O padrão é Destaques para apresentar conteúdo legível imediatamente. Mais recentes/antigos seguem a sequência de importação dos arquivos, pois o acervo não fornece datas. Busca ignora acentos e pesquisa autoria, transcrição, reflexão, fonte, tema e número. Grid/lista, paginação, favoritos e modal anterior/próximo operam sobre o mesmo conjunto filtrado.

Arte: `assets/wisdom-hero-v2.webp`, gerada com a ferramenta integrada image_gen. Os cards reutilizam paisagens existentes, sem alterar os prints.

Prompt: Create a premium photoreal cinematic panoramic banner 3:1 for Trader Wisdom editorial library. Forested mountain ridges receding into hazy golden sunrise, soft natural light. A solitary hiker with dark jacket and backpack sits on a rocky outcrop at far right x88%, quietly contemplating horizon. Left half dark evergreen pine forest with subdued detailed mountain silhouettes and negative space for large white editorial title. Center valley soft mist, right warm pale gold sky. Natural restrained greens, charcoal green, beige. Wide horizontal composition, hiker visible at top right with rock below. Sophisticated tranquil photography, freedom discipline long-term journey. No text, no letters, no logos, no UI. Entire image one continuous scene.

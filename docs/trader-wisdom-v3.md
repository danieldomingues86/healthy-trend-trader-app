# Sabedoria do Trader V3

Categorias visuais, busca combinada e publicação de transcrições aprovadas sobre o acervo existente. A sidebar, navegação, IDs e persistência dos favoritos continuam usando a aplicação atual.

## Qualidade dos dados

`node scripts/audit-wisdom.cjs` percorre todos os caminhos originais e os campos editoriais disponíveis. `frontend/wisdom-text.js` centraliza normalização, detecção de corrupção, validação e publicação. Nenhum componente renderiza texto do índice de OCR como citação.

O índice antigo é preservado como evidência, junto com os arquivos de imagem. Somente transcrições editoriais verificadas e aprovadas pelo validador são publicadas. Texto de OCR aparentemente gramatical não constitui comprovação de significado, autoria ou tradução. Três paráfrases antigas foram retidas para revisão, porque não devem ser apresentadas como transcrições literais.

O relatório completo, com os registros, valores anteriores, valores publicáveis, achados por campo e confiança, está em [wisdom-audit/audit.json](wisdom-audit/audit.json). O resumo e as contagens estão em [wisdom-audit/README.md](wisdom-audit/README.md). Normalização não equivale a recuperação semântica; os casos duvidosos permanecem pendentes.

O atalho “Originais em revisão” mantém todos os arquivos pendentes acessíveis, pesquisáveis pelo texto extraído e favoritáveis, mas apresenta a imagem original sem expor uma falsa citação. Não existe perda nem remoção de registros. Contagens nas categorias se referem às transcrições publicáveis; o total do acervo e o total pendente aparecem separadamente.

Para revisar um registro, conferir a imagem, editar `assets/wisdom-editorial.json`, registrar os campos corretos e `editorialVerified`, e gerar novamente a auditoria. O gerador não usa serviços externos nem inventa traduções. `scripts/extract-wisdom-editorial.cjs` é a migração histórica dos campos da V2 e não deve ser repetido sobre revisões posteriores.

## Interface

Seis categorias conceituais reutilizam os temas anteriores. Uma referência pode pertencer a mais de uma categoria. Grandes Traders reúne os autores de trading já identificados; nenhuma pessoa é identificada visualmente por reconhecimento facial. Busca por palavras e nomes mantém a categoria selecionada. Todos retorna à biblioteca aprovada; Favoritos e Destaques são filtros especiais.

Grade de três colunas, duas em telas intermediárias e uma no mobile. Categorias viram uma faixa horizontal com rolagem quando não há largura para seis. Textos extensos mantêm tamanho mínimo de 18 px e oferecem “Continuar lendo”. Originais em modal usam contain, navegação anterior/próximo e retorno de foco ao fechar.

## Imagens

Arquivos otimizados: `assets/wisdom-category-psychology-v3.webp`, `assets/wisdom-category-risk-v3.webp`, `assets/wisdom-category-performance-v3.webp`, `assets/wisdom-category-strategy-v3.webp`, `assets/wisdom-category-traders-v3.webp`, `assets/wisdom-category-mindset-v3.webp`.

Psychology e Risk foram geradas com a ferramenta integrada image_gen (skill imagegen). O limite da ferramenta impediu as quatro gerações restantes. Performance reutiliza healthy-login-capital-growth-v2; Strategy reutiliza manual-book-journey; Traders reutiliza o observador da wisdom-hero-v2; Mindset reutiliza materials-hero-mountains-v1. Cada imagem foi otimizada para WebP, sem distorção, mantendo os originais.

Prompt comum: “Use case: photorealistic-natural. Single premium editorial category cover, portrait 4:5. Cinematic natural photography, deep forest emerald, restrained warm gold sunrise, cream highlights, realistic fine textures, quiet sophisticated finance library. Subject clear in upper two thirds, bottom third dark gradient negative space for interface title. No text, letters, labels, logo, watermark, borders, UI. One image only.”

Psychology: “An anatomically recognizable sculptural human brain, subtle pale green neural illumination, dark forest backdrop. Calm self-control, no horror.”

Risk: “Two alpine climbers connected by a secure rope, one helping the other onto a ledge. Trust, risk management, mountain landscape at sunrise.”

## Validação

`node --test frontend/wisdom-text.test.js` verifica textos corrompidos, preservação de frases legítimas, tradução suspeita, metadados, cobertura de todo o acervo, segunda validação e filtros combinados. A verificação de navegador está em output/verify-wisdom-v3.cjs, incluindo abertura via file://, categorias, busca, favoritos, paginação, modal, inglês e mobile.

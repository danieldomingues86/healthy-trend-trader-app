# Cache e proteção de consumo da brapi

## Problemas encontrados

O servidor chamava a atualização diária no início, no agendador e nas rotas de dados, sem compartilhar uma execução em andamento. Uma falha deixava o cache antigo e permitia que o próximo acesso reiniciasse a coleta completa. A atualização complementar de FIIs/BDRs também podia repetir coletas ao abrir a tela. Cada atualização intradiária dos scans podia consultar o universo completo em lotes a cada cinco minutos. Além disso, essa atualização mudava a data usada para determinar a atualização do histórico diário.

Não há histórico de consumo suficiente para atribuir retroativamente as 15.000 chamadas. A nova contagem começa a partir da instalação da proteção; chamadas de outros aplicativos ou de outros diretórios não aparecem nela.

## Comportamento corrigido

- Atualizações diárias, de classes e de cotações são coordenadas e serializadas; acessos concorrentes compartilham o trabalho.
- Cache anterior é servido quando a coleta falha, mantendo suas datas reais.
- Tentativas têm intervalo persistido: uma hora para a coleta diária e 24 horas para complementar classes. Reiniciar não libera uma nova tentativa imediata.
- Respostas da brapi ficam em disco por 20 horas para histórico/catálogo e pelo intervalo de cotações para quotes. Erros de ticker/faixa ficam em cache por 24 horas, preservando o fallback de faixa já existente.
- HTTP 429 suspende chamadas globalmente, respeitando a data de renovação ou Retry-After. Um limite mensal sem data conhecida usa uma pausa conservadora de 31 dias.
- Falhas de rede usam pausa de cinco minutos; falhas de servidor/autenticação usam 15 minutos.
- As cotas locais contam a tentativa antes da chamada e são compartilhadas entre processos que utilizem o mesmo diretório. Escritas de JSON são atômicas. Locks têm heartbeat e recuperação após interrupção.
- As cotações dos scans usam intervalo padrão de 60 minutos; histórico, rankings e cálculos permanecem inalterados. Atualização ao vivo usa liveUpdatedAt e não avança updatedAt/historyUpdatedAt.
- /api/health e rotas inexistentes não disparam coletas. Health expõe bloqueio, motivo, consumo local e intervalo intradiário sem credenciais.

## Configuração

- Históricos são agrupados em lotes de até dez ativos por chamada.
- BRAPI_MAX_DAILY_REQUESTS: 250 chamadas/dia UTC.
- BRAPI_MAX_31_DAY_REQUESTS: 14.000 chamadas em janela conservadora de 31 datas UTC.
- LIVE_SCAN_QUOTE_TTL_MINUTES: 60 minutos.
- BRAPI_CACHE_DIRECTORY: backend/data/brapi-cache por padrão.
- MARKET_CACHE_PATH: backend/data/market-cache.json por padrão.

Ao trocar BRAPI_TOKEN e reiniciar, o sistema detecta uma impressão criptográfica diferente, zera bloqueio/contadores pertencentes à chave antiga e mantém o cache de respostas. A chave em si nunca é persistida pelo controle. O bloqueio só é liberado quando a credencial realmente muda.

Os limites preventivos preservam margem no plano informado pelo usuário. Não equivalem à medição oficial da brapi, nem garantem capacidade para qualquer tamanho de universo. Se o orçamento não comportar a coleta, o último cache válido é mantido. Não apagar o diretório de controle para forçar tentativas, pois isso elimina a contagem local e o bloqueio persistido.

O bloqueio informado em 10/09/2026 foi registrado localmente até 28/09/2026 às 00:00 de Brasília. Essa ação não fez nenhuma consulta à brapi. Reiniciar o servidor carrega as proteções e o bloqueio existente.

## Verificação

Testes usam respostas simuladas e diretórios temporários: concorrência, reuso após reinício, bloqueio mensal e retomada, orçamento diário/31 dias, erros negativos, indisponibilidade de rede, processos compartilhando o mesmo diretório, preservação de cache, falta de cache e separação dos timestamps de histórico/cotação.

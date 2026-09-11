# Backend de dados de mercado

API interna para a V1 de Ciclo de Mercado e Força Relativa.

## O que faz

- Busca a composição pública do IBOV na B3, com lista de contingência configurável.
- Consulta na BRAPI o histórico diário de até três meses do IBOV e dos componentes.
- Calcula ciclo pelo preço em relação às EMAs 20 e 200.
- Calcula força relativa em 1 e 3 meses versus IBOV e converte em ranking de 0 a 100.
- Mede se a linha de força relativa está subindo em 6 e aproximadamente 13 semanas, gerando uma leitura inspirada no Trend Template: líder, qualificado, acompanhar ou abaixo do filtro.
- Salva o resultado em `data/market-cache.json` e expõe somente dados já calculados.

## Configuração

1. Copie `.env.example` para `.env` e informe `BRAPI_TOKEN`.
2. Execute `npm start` dentro desta pasta. O servidor lê o `.env` localmente; esse arquivo é ignorado pelo Git.

Para trocar a chave, substitua somente o valor de `BRAPI_TOKEN` em `backend/.env` e reinicie o backend. O controle salva apenas uma impressão criptográfica da credencial. Ao detectar uma chave realmente diferente, descarta o bloqueio e os contadores da chave anterior, preservando as respostas e o cache de mercado já existentes.

### Usuário administrador e persistência

Para ativar a persistência real, configure no `.env` a `DATABASE_URL` do PostgreSQL do Supabase e as três variáveis `ADMIN_*` presentes no `.env.example`. Na primeira inicialização, o backend aplica as migrations em `db/migrations` e cria o administrador informado caso ele ainda não exista. A senha é transformada em hash antes de ser armazenada; nunca inclua `DATABASE_URL` ou `ADMIN_PASSWORD` no Git.

O frontend se autentica exclusivamente pelo backend em `POST /api/auth/login`. As sessões possuem token aleatório, armazenado no banco somente como hash e expiram em 30 dias.

Endpoints públicos da aplicação:

- `GET /api/health`
- `GET /api/market-cycle`
- `GET /api/market-overview`
- `GET /api/relative-strength?search=PETR&page=1&limit=50`

Não existe endpoint de atualização manual. O servidor tenta atualizar uma vez por dia útil após 19h, horário de Brasília, e serve o cache nos demais momentos. Para a primeira carga ou uma operação agendada no servidor, use `npm run refresh`.

## Consumo consciente da BRAPI

O frontend não acessa a BRAPI nem recebe o token. O backend combina históricos de até dez ativos por chamada, cache persistente, deduplicação de requisições, serialização de atualizações e bloqueio após erros de cota. Os limites preventivos padrão são 250 chamadas por dia e 14.000 em 31 dias; configure valores menores no `.env` quando a cota oficial for compartilhada com outro software. Scans atualizam cotações no máximo uma vez por hora por padrão. Durante indisponibilidade ou bloqueio, as telas continuam usando o último cache válido.

`GET /api/health` mostra `provider.requestsToday`, `provider.trackedRequests`, `provider.blockedUntil` e `provider.reason`, sem expor a chave. Essa contagem começa quando esta proteção é instalada e cobre apenas este backend/diretório; confira o painel da BRAPI para o consumo total da conta.

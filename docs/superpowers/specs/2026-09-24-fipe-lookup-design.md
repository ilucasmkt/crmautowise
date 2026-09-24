# Busca automática da Tabela FIPE no cadastro de veículos

Date: 2026-09-24
Status: Approved by user, ready for implementation planning

## Context

Hoje, ao cadastrar um veículo em Estoque ([components/EstoqueView.tsx](../../../components/EstoqueView.tsx)),
o usuário digita manualmente marca, modelo, versão, ano de fabricação,
ano modelo e preço de referência FIPE. Isso é lento e sujeito a erro de
digitação.

Separadamente, o Hot Site público ([components/HotSiteView.tsx](../../../components/HotSiteView.tsx))
hoje exibe a placa do veículo (`selectedCar.plate`) em um badge sobre a
foto, em dois pontos do layout (visualização mobile/preview e a
"full page tab"). O preço FIPE não é exibido publicamente — isso já
está correto.

## Goals

- Ao cadastrar ou editar um veículo, o usuário pode buscar o carro na
  Tabela FIPE via cascata **Marca → Modelo → Ano**, e o sistema
  preenche automaticamente: marca, modelo (melhor esforço), versão,
  ano de fabricação, ano modelo, combustível (melhor esforço) e preço
  de referência FIPE.
- O usuário sempre digita manualmente: preço de venda, KM, placa, cor,
  câmbio, status, fotos e opcionais.
- Sempre existe uma opção de preencher tudo manualmente (carro raro,
  importado, ou não encontrado na FIPE).
- Placa e preço FIPE nunca aparecem no Hot Site público — são dados
  de uso interno da loja. (Preço FIPE já não aparece; placa aparece
  hoje e será removida.)
- O token da API da FIPE (quando o usuário cadastrar um, opcional)
  nunca fica exposto no navegador.

## Non-goals

- Suporte a motos e caminhões (só carros de passeio/utilitários, tipo
  já coberto pelo endpoint `/cars` da FIPE).
- Histórico de preços FIPE ao longo do tempo (a API oferece, mas não é
  necessário agora).
- Edição/curadoria manual da lista de marcas/modelos — sempre vem
  direto da API da FIPE.
- Cache persistente entre sessões (ex: banco de dados) das listas de
  marca/modelo — cache é só em memória do navegador durante a sessão.

## Architecture

### Proxy serverless (`api/fipe/[...path].ts`)

Um único Vercel Serverless Function, no mesmo padrão de
[api/team/invite.ts](../../../api/team/invite.ts):

- Aceita apenas `GET`.
- Exige `Authorization: Bearer <access_token>` válido (verificado via
  `supabase.auth.getUser(accessToken)` com a service role key, igual
  ao invite.ts). Sem sessão válida do CRM → `401`.
- Só repassa caminhos cujo primeiro segmento seja `cars` ou
  `references` (whitelist). Qualquer outro caminho → `404`.
- Repassa a query string (`reference`) sem alteração.
- Monta a URL final como
  `https://fipe.parallelum.com.br/api/v2/<path>?<query>` e faz o
  `fetch`. Se `process.env.FIPE_API_TOKEN` existir, adiciona o header
  `X-Subscription-Token`; caso contrário, chama sem header (a API
  funciona sem token, limitada a 500 requisições/dia por IP; com
  token gratuito sobe para 1.000/dia — cadastro em
  https://fipe.api.br/register, opcional, configurável depois sem
  mudar código).
- Repassa o status HTTP e o corpo JSON da resposta da FIPE
  diretamente ao cliente, sem transformar (parsing de preço e
  mapeamento de combustível ficam no frontend, mantendo o proxy
  simples e genérico).
- Erros de rede/timeout ao contatar a FIPE → `502` com
  `{ error: 'Falha ao consultar a FIPE' }` (sem vazar detalhes
  internos, seguindo o mesmo cuidado já adotado em `invite.ts`).

### Cliente (`lib/fipe.ts`)

Módulo com funções puras + funções de rede:

- `fetchFipeBrands(): Promise<{code: string; name: string}[]>`
- `fetchFipeModels(brandCode: string): Promise<{code: string; name: string}[]>`
- `fetchFipeYears(brandCode, modelCode): Promise<{code: string; name: string}[]>`
- `fetchFipeDetail(brandCode, modelCode, yearCode): Promise<FipeDetail>`
  onde `FipeDetail` reflete a resposta da FIPE (`brand`, `model`,
  `modelYear`, `fuel`, `codeFipe`, `price` como string, `referenceMonth`).
- Cada função de rede busca o `access_token` da sessão Supabase atual
  (`supabase.auth.getSession()`) e chama `/api/fipe/...` com o header
  `Authorization`.
- Funções puras exportadas e testáveis isoladamente:
  - `parseFipePrice(raw: string): number` — `"R$ 10.000,00"` → `10000`.
  - `mapFipeFuel(raw: string): Vehicle['fuel']` — mapeia
    `"Gasolina"→'Gasolina'`, `"Diesel"→'Diesel'`, `"Flex"→'Flex'`,
    `"Álcool"→'Flex'` (não existe álcool puro no enum atual; tratado
    como Flex), qualquer valor desconhecido → `'Flex'` (fallback
    seguro, sempre editável pelo usuário no select).
  - `splitFipeModel(raw: string): { model: string; version: string }`
    — `version` é sempre o `raw` completo (fonte de verdade). `model`
    é uma tentativa: corta a string no primeiro token que bate com
    `/^\d+[.,]\d+$/` (padrão de cilindrada, ex: "2.0", "1.6") e usa
    tudo antes disso, trimado; se não achar esse padrão, usa a
    primeira palavra do `raw`. Sempre resulta em uma string não-vazia
    (nunca deixa `model` em branco).

Cache em memória (só durante a sessão do navegador, um `Map` module-level
em `lib/fipe.ts`): a lista de marcas é buscada uma vez e reaproveitada
em todas as aberturas do modal; listas de modelos/anos são cacheadas
por `brandCode`/`modelCode` conforme o usuário navega.

### UI (`components/EstoqueView.tsx`)

- Estado novo: `fillMode: 'fipe' | 'manual'` (default `'fipe'`).
- Estado novo: `fipeBrandCode`, `fipeModelCode`, `fipeYearCode`,
  `fipeSyncStatus: 'idle' | 'loading' | 'done' | 'error'`,
  `fipeCode`, `fipeReferenceMonth` (esses dois últimos guardados no
  veículo, ver Data model).
- No modo `'fipe'`: os campos hoje livres de "Marca" e "Modelo" viram
  três `<select>` em cascata (Marca → Modelo → Ano), populados via
  `lib/fipe.ts`. Cada select é desabilitado até o anterior estar
  selecionado. Ao selecionar o Ano, dispara `fetchFipeDetail` e
  preenche: `brand`, `model`/`version` (via `splitFipeModel`), `year`
  (= `modelYear` da FIPE — sem inventar deslocamento de ano), `modelYear`,
  `fuel` (via `mapFipeFuel`), `fipePrice` (via `parseFipePrice`),
  `fipeCode`, `fipeReferenceMonth`. Todos os campos preenchidos
  continuam em inputs normais e editáveis.
- Link "Preencher manualmente" alterna `fillMode` para `'manual'`,
  voltando os campos Marca/Modelo a inputs de texto livre como hoje
  (sem preenchimento automático).
- Estados de erro (rede, 429, não encontrado) exibidos como texto
  inline abaixo dos selects, sem bloquear o restante do formulário.
- No modo edição, se o veículo tiver `fipeCode` salvo, mostra um selo
  "Sincronizado com a FIPE (código X, referência Y)" com um botão
  "Atualizar da FIPE" que reabre a cascata de seleção.
- Nenhuma mudança nos campos já 100% manuais (preço de venda, KM,
  placa, cor, câmbio, status, fotos, opcionais).

## Data model

Duas colunas novas, opcionais, na tabela `vehicles` (nova migration
`supabase/migrations/0003_fipe_fields.sql`):

```sql
alter table vehicles
  add column fipe_code text,
  add column fipe_reference_month text;
```

`types.ts`: `Vehicle` ganha `fipeCode?: string` e
`fipeReferenceMonth?: string`. `hooks/useVehicles.ts` passa a
ler/gravar essas duas colunas (`fromRow`, `addVehicle`,
`updateVehicle`), seguindo o padrão já existente para `fipePrice`.

## Hot Site: remover exposição da placa

Em [components/HotSiteView.tsx](../../../components/HotSiteView.tsx),
remover os dois badges `Placa {selectedCar.plate}` (linhas ~500 e
~826 na versão atual) — um na prévia mobile/desktop dentro do CRM, um
na aba de página cheia que é o que o cliente final efetivamente vê.
Nenhuma outra referência a `plate` ou `fipePrice` existe fora de
`EstoqueView.tsx` (uso interno), confirmado por busca no código.

## Error handling

- Proxy: sessão inválida/ausente → `401`; caminho fora da whitelist →
  `404`; método diferente de `GET` → `405`; erro ao contatar a FIPE
  (rede, timeout, 5xx) → `502` com mensagem genérica; repassa `429`
  da FIPE como `429` para o cliente.
- Frontend: qualquer erro nas chamadas de `lib/fipe.ts` é capturado e
  vira uma mensagem curta inline ("Não foi possível consultar a
  FIPE agora. Tente novamente ou preencha manualmente.") — nunca
  impede o preenchimento manual nem trava o botão de salvar.
- Carro não listado na FIPE (importado, versão muito nova/rara): não
  é um "erro" tratado especificamente — o usuário simplesmente não
  encontra o modelo nos selects e usa "Preencher manualmente".

## Testing

- `lib/fipe.test.ts` (vitest, mesmo padrão de `lib/permissions.test.ts`):
  testes unitários para `parseFipePrice`, `mapFipeFuel` e
  `splitFipeModel`, cobrindo casos normais, valores desconhecidos e
  strings que começam com número (ex: "147 C/CL", "500 Cabrio...").
- Verificação manual (rodando o app): fluxo completo de cadastro via
  FIPE, fluxo manual, edição com re-sincronização, e confirmação
  visual de que a placa não aparece mais no Hot Site (preview e aba
  cheia).
- Proxy serverless: sem suíte automatizada no projeto para funções
  `api/*` hoje (nem `invite.ts` tem); verificação manual via `curl`
  local/produção cobrindo: sem token → 401, caminho inválido → 404,
  caminho válido → repassa dados da FIPE corretamente.

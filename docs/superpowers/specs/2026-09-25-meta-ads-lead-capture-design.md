# Captura automática de leads de anúncios "Clique para WhatsApp" + rodízio

Date: 2026-09-25
Status: Approved by user, ready for implementation planning

## Context

Hoje, quando um cliente clica num anúncio do Meta ("Clique para WhatsApp") e manda
mensagem, essa conversa só vira um Lead no CRM se um vendedor criar o card
manualmente (feature já existente em Conversas: "criar Lead a partir da
conversa"). O dono quer que isso aconteça sozinho: o lead deve aparecer no
Pipeline (coluna "Novos Leads") assim que a primeira mensagem chegar, sem
intervenção manual.

Levantamento técnico confirmou que isso **não exige nenhuma integração com a
API do Meta/Facebook**: quando a conversa nasce de um anúncio "Clique para
WhatsApp", o próprio Meta carimba a mensagem do WhatsApp com o contexto do
anúncio (`contextInfo.externalAdReply`, contendo `title`, `body`, `ctwaClid`).
Isso trafega pelo protocolo do WhatsApp em si — confirmado com uma consulta
real ao banco da Evolution API, que já tem 521 mensagens históricas com esse
campo preenchido, incluindo o payload completo de um exemplo real de anúncio
da própria loja MR Veículos.

A Evolution API já hospeda as instâncias de WhatsApp de cada vendedor
(`crm_{storeId}_{teamMemberId}`). Hoje o CRM só **consulta** essa API sob
demanda (pull); não há nenhum webhook configurado.

Também foi pedido: quando a loja tiver mais de um vendedor, o responsável
atribuído a esses leads automáticos deve rodar em rodízio entre os vendedores
marcados como participantes (configurável em Ajustes), não sempre cair no
dono do número que recebeu a mensagem.

## Goals

- Toda mensagem de WhatsApp recebida que contenha `contextInfo.externalAdReply`
  (ou`ctwaClid`) em qualquer instância de vendedor conectada dispara a criação
  automática de um Lead, sem ação manual.
- O Lead criado tem: origem "Meta Ads", etapa "Novo Lead", nome (do
  `pushName` do WhatsApp, ou o telefone se não houver), telefone, observações
  com o texto do anúncio (título + descrição), e responsável escolhido por
  rodízio.
- Se o telefone já é um Lead existente na loja, nada é criado (evita
  duplicar quem já está em atendimento).
- Rodízio: entre os vendedores com `in_lead_rotation = true` e `status =
  'ativo'`, distribui em sequência estável, avançando 1 por vez. Se nenhum
  vendedor estiver marcado para o rodízio, o responsável cai no dono do
  WhatsApp que recebeu a mensagem (nunca fica sem responsável).
- Em Ajustes, o Administrador vê a lista de vendedores com um interruptor
  "participa do rodízio de leads de anúncio" por pessoa.
- O Pipeline (Kanban) passa a atualizar sozinho a cada ~60s, para o card novo
  aparecer sem precisar recarregar a página.

## Non-goals

- Nenhuma chamada à Graph API do Meta (Ads Manager). Não vamos trazer nome
  de campanha, verba gasta ou métricas de anúncio — só o texto do criativo
  que já vem embutido na mensagem do WhatsApp. Confirmado explicitamente com
  o usuário.
- Rodízio não se aplica a leads criados manualmente (botão "Novo Lead") —
  só aos capturados automaticamente por anúncio.
- Não vamos mexer em "Formulário de Lead do Meta" (Lead Ads via formulário
  dentro do Facebook/Instagram) — fora de escopo, integração totalmente
  diferente (exigiria Graph API de verdade).
- Não vamos processar mensagens de grupos (`@g.us`), só conversas 1:1.

## Architecture

**Novo componente**: `POST /api/whatsapp/webhook/:secret` no servidor
Express já existente (`server/`). A Evolution API chama essa rota via rede
interna do Swarm (`http://crmautowise_app:3000/...`) toda vez que uma
instância recebe uma mensagem nova (evento `MESSAGES_UPSERT`).

- `:secret` é validado contra uma variável de ambiente
  (`WHATSAPP_WEBHOOK_SECRET`, gerada uma vez); resposta 404 se não bater,
  para não revelar a existência da rota a quem não tem o segredo.
- O handler ignora mensagens enviadas pelo próprio vendedor (`fromMe:
  true`), mensagens de grupo, e mensagens sem `externalAdReply`/`ctwaClid`
  — nesses casos responde 200 rapidamente sem fazer nada (importante: a
  Evolution API espera uma resposta rápida e pode reenviar o evento se
  demorar ou falhar).
- O nome da instância (`crm_{storeId}_{teamMemberId}`) é decodificado de
  volta para descobrir a loja e o vendedor dono do WhatsApp (mesma lógica
  determinística já usada por `instanceNameFor`, só que ao contrário).
- Usa o client Supabase com a service role key (mesmo padrão das outras
  rotas) para consultar/gravar na tabela `leads` e `profiles`.

**Registro do webhook**: quando `/api/whatsapp/connect` cria uma instância
nova, o mesmo request também configura o webhook dela na Evolution API
(`MESSAGES_UPSERT` apontando para a URL interna acima). Para a instância que
já existe hoje (Avenida Motors), isso é feito manualmente uma vez durante o
deploy.

**Rodízio**: guardado como 1 coluna em `stores`
(`last_rotation_profile_id`, o último vendedor que recebeu um lead
automático) e 1 coluna em `profiles` (`in_lead_rotation`, liga/desliga por
pessoa). O handler consulta os vendedores elegíveis ordenados por `id`,
acha a posição de `last_rotation_profile_id` nessa lista e escolhe o
próximo (voltando ao início se for o último), depois atualiza a coluna em
`stores`.

## Data flow

1. Cliente clica no anúncio → abre WhatsApp → manda mensagem.
2. Evolution API recebe, salva no histórico, dispara webhook pro CRM.
3. CRM extrai `externalAdReply`; se ausente, encerra (200, sem ação).
4. CRM decodifica `storeId`/vendedor dono da instância a partir do nome dela.
5. CRM verifica se o telefone (derivado de `key.remoteJidAlt ?? key.remoteJid`,
   mesma lógica já usada em `chats.ts` para contatos `@lid`) já é Lead na
   loja; se sim, encerra (200, sem ação).
6. CRM escolhe o responsável (rodízio, ou dono da instância como
   fallback) e insere o Lead (`stage='novo'`, `source='Meta Ads'`,
   `temperature='quente'`, `notes` com o texto do anúncio).
7. Se usou o rodízio, atualiza `stores.last_rotation_profile_id`.
8. No navegador, o Pipeline já aberto puxa a lista de leads de novo em até
   ~60s e o card aparece.

## Error handling

- Qualquer erro inesperado no handler do webhook responde 200 mesmo assim
  (depois de logar o erro no servidor) — nunca queremos que a Evolution API
  fique reenviando o mesmo evento em loop por causa de um bug nosso; a
  mensagem em si nunca se perde (continua salva na Evolution API,
  disponível em Conversas), só a criação automática do Lead falha
  silenciosamente naquele caso e pode ser criada manualmente como já é
  possível hoje.
- Se o nome da instância não bater no padrão esperado (`crm_...`), ignora
  o evento (pode ser uma instância de outro cliente compartilhando a mesma
  Evolution API — confirmado que isso acontece hoje, ex: "mrveiculoscasabranca").

## Testing

- Testes automatizados (Vitest + Supertest) para o handler do webhook:
  ignora mensagem sem `externalAdReply`; ignora `fromMe: true`; ignora
  telefone já cadastrado; cria lead com responsável correto no rodízio
  simples (2-3 vendedores); usa o dono da instância quando ninguém está no
  rodízio; avança e persiste `last_rotation_profile_id`.
- Teste manual pós-deploy: like um anúncio real de "Clique para WhatsApp"
  já existente (ou simular o payload via curl direto no endpoint) e
  confirmar que o card aparece no Pipeline dentro de ~1 minuto.

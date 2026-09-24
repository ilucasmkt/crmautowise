# Migração de hospedagem: Vercel → VPS própria

Date: 2026-09-24
Status: Approved by user, ready for implementation planning

## Context

O CRM (`crmautowise`) hoje roda como app React/Vite estático hospedado na
Vercel, com lógica de backend em funções serverless (`/api/*.ts`, runtime
`@vercel/node`). O banco de dados (Postgres + Auth + RLS multi-tenant) roda
no Supabase cloud. A integração de WhatsApp (Evolution API) já roda
**self-hosted** na VPS do usuário (HostGator, IP `129.121.36.63`), dentro de
um cluster Docker Swarm existente, junto com n8n e Portainer, atrás de um
Traefik que já faz TLS automático via Let's Encrypt para o domínio
`autowisebrasil.com.br`.

O usuário quer sair da Vercel e hospedar o CRM na própria VPS, reaproveitando
a infraestrutura Docker Swarm/Traefik/Portainer já em uso.

VPS: 2 vCPUs, 4GB RAM (~1.4GB livre no momento do levantamento), 100GB disco
(64GB livres), Ubuntu 22.04.5 LTS, acesso root via SSH (porta 22022).

## Goals

- Frontend (build estático do Vite) e as rotas hoje em `/api/*` (fipe, team
  invite, whatsapp connect/disconnect/status/chats/messages/send/sendMedia/
  media) saem da Vercel e passam a rodar em um serviço Docker novo na VPS,
  gerenciado via Portainer, roteado pelo Traefik existente, com HTTPS
  automático em `autowisebrasil.com.br`.
- A chamada para o Evolution API passa a acontecer pela rede interna do
  Swarm (`adminautowise`, hostname `evolution_api:8080`) em vez de pela
  internet pública, quando possível.
- Corte de DNS feito só depois de validar o novo serviço funcionando
  (subdomínio/IP de teste), sem downtime não planejado do site atual.
- Zero mudança de código relacionada a Supabase — client e RLS continuam
  iguais, o banco continua sendo o Supabase cloud existente.

## Non-goals

- Não vamos self-hostar o Supabase (Postgres/Auth/Storage/Realtime). Decisão
  explícita do usuário: a VPS tem RAM justa (4GB) compartilhada com
  n8n/Evolution/Traefik/Portainer, e o Supabase completo self-hosted pede
  ~4GB sozinho. Banco continua no Supabase cloud.
- Não vamos migrar nem alterar o Evolution API, n8n ou Postgres do n8n —
  esses continuam exatamente como estão.
- Não vamos configurar CI/CD automático (deploy via GitHub Actions) nesta
  primeira fase — deploy inicial é manual/assistido via SSH. Pode virar uma
  fase 2 depois que o básico estiver estável em produção.
- `GEMINI_API_KEY` parece resíduo do template inicial (AI Studio) e não é
  usado em nenhuma feature do CRM hoje (confirmado por busca no código) —
  não será migrado, a menos que o usuário identifique um uso real.

## Architecture

**Infra existente reaproveitada** (nenhuma mudança nela):
- Docker Swarm ativo, rede overlay `adminautowise` compartilhada entre os
  serviços.
- Traefik (`traefik:v3.5.3`) já escuta 80/443, já tem
  `certresolver=letsencryptresolver` configurado (HTTP-01 challenge),
  já redireciona HTTP→HTTPS automaticamente.
- Evolution API já publicado em `api.autowisebrasil.com.br` e acessível
  internamente em `evolution_api:8080` na rede `adminautowise`.

**Novo componente**: stack Docker `crmautowise`, um serviço único:
- Imagem multi-stage: build do Vite (`npm run build` → estático) +
  servidor Node (Express) que serve os arquivos estáticos **e** implementa
  as rotas hoje em `/api/*.ts` da Vercel (a conversão é mecânica: as
  funções `@vercel/node` já usam `(req, res)` bem próximo do Express).
- Conectado à rede `adminautowise` (para falar com Evolution API
  internamente).
- Labels do Traefik seguindo o padrão já usado por n8n/Evolution:
  ```
  traefik.enable=true
  traefik.http.routers.crmautowise.rule=Host(`<host-de-teste-ou-dominio-final>`)
  traefik.http.routers.crmautowise.entrypoints=websecure
  traefik.http.routers.crmautowise.tls.certresolver=letsencryptresolver
  traefik.http.services.crmautowise.loadbalancer.server.port=<porta-da-app>
  ```
- Gerenciado via Portainer (Stacks), mesmo fluxo usado para os outros
  serviços — dá ao usuário uma forma visual de reiniciar/ver logs sem
  depender de SSH.

**Variáveis de ambiente** necessárias no novo serviço:
`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (já conhecidas, vêm do `.env`
local do projeto), `EVOLUTION_API_URL` (interno: `http://evolution_api:8080`),
`EVOLUTION_API_KEY`, `FIPE_API_TOKEN` (opcional — feature funciona sem, com
funcionalidade reduzida) — as duas últimas a confirmar com o usuário via
painel da Vercel.

## DNS e cutover

- `autowisebrasil.com.br` (raiz, sem `www`) já resolve para o IP da VPS
  (achado durante o levantamento — hoje retorna 404 porque não há router
  Traefik configurado para esse host ainda).
- `www.autowisebrasil.com.br` ainda aponta para a Vercel (CNAME
  `vercel-dns-*.com`).
- DNS gerenciado via Cloudflare (nameservers `*.ns.cloudflare.com`),
  registro do domínio A/CNAME sem proxy (resolve direto para o IP de
  origem).
- Plano de corte:
  1. Subir o novo serviço na VPS, testar via Host header/hosts file local
     ou subdomínio de teste, sem tocar no DNS de produção.
  2. Validar fluxos críticos (login, Kanban de leads, Conversas/WhatsApp,
     busca FIPE, convite de equipe) contra o serviço novo.
  3. Só então apontar `autowisebrasil.com.br` (raiz) definitivamente no
     Traefik e, se aprovado, migrar o `www` também para o mesmo serviço.
  4. Vercel permanece no ar (sem remover o projeto) até confirmação final
     do usuário — rollback é só reverter DNS.

## Security

- Senha root da VPS foi trocada; acesso segue por chave SSH dedicada
  (`crmautowise_vps`), não por senha, daqui em diante.
- Segredos (`SUPABASE_SERVICE_ROLE_KEY`, `EVOLUTION_API_KEY`,
  `FIPE_API_TOKEN`) ficam em arquivo de ambiente no host/stack Docker, não
  commitados no repositório (mesmo padrão que já existe: `.env` está no
  `.gitignore`).

## Testing

- Build local (`npm run build`) e testes existentes (`npm test`, que já
  cobre `fipe.ts`, `format.ts`, `permissions.ts`) precisam passar antes do
  deploy.
- Após deploy no host de teste: checar manualmente login, CRUD de leads,
  conexão/envio WhatsApp (Conversas), busca FIPE no cadastro de veículo,
  convite de membro de equipe.
- Verificar certificado TLS válido (Let's Encrypt) emitido para o host
  final antes do corte de DNS.

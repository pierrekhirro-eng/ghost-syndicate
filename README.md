# 👻 Ghost Syndicate — Bot + Finance + Tickets + Call Hours

MVP modular para Discord, com:
- Caixa, entradas, saídas e empréstimos
- Missões e operações
- Ranking/premiações como base para expansão
- Tickets com transcript HTML + envio para canal de transcripts
- Rastreamento de tempo em canais de voz
- Painel web para consultar caixa, missões e ranking de horas

## Requisitos
Node.js 18+ (discord.js atual), npm.

## Instalação
1. `npm install`
2. copie `.env.example` para `.env` e preencha os IDs/token
3. `npx prisma generate`
4. `npx prisma migrate dev --name init`
5. `npm run dev`

## Permissões do bot
O bot precisa, no mínimo, de View Channels, Send Messages, Manage Channels, Read Message History, Attach Files e Embed Links nos canais usados pelos módulos.

## Próxima etapa
Adicionar OAuth2 do Discord ao painel web, filtros avançados de ranking, fechamento mensal automático, templates premium de transcript e configuração de canais/cargos por `/config`.

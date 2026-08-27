// apps/bot/src/utils/config.ts

import 'dotenv/config';
import { z } from 'zod';

/* =========================================================
   GHOST SYNDICATE — IDS FIXOS DO SERVIDOR
========================================================= */

const GHOST_SYNDICATE = {
  guildId: '1542337446191308803',

  roles: {
    owner: '1542164978251997194',
    recruits: '1542282675983745124',
    admin: '1542284384374366239',
    bot: '1542337446191308803',
  },
} as const;

/* =========================================================
   VARIÁVEIS DE AMBIENTE
========================================================= */

const envSchema = z.object({
  DISCORD_TOKEN: z
    .string()
    .min(
      1,
      'DISCORD_TOKEN é obrigatório.',
    ),

  DISCORD_CLIENT_ID: z
    .string()
    .min(
      1,
      'DISCORD_CLIENT_ID é obrigatório.',
    ),

  DATABASE_URL: z
    .string()
    .default(
      'file:./dev.db',
    ),

  WEB_PORT: z
    .coerce
    .number()
    .int()
    .positive()
    .default(3010),

  CATEGORY_TICKETS_ID: z
    .string()
    .optional()
    .default(''),

  TRANSCRIPT_CHANNEL_ID: z
    .string()
    .optional()
    .default(''),

  ROLE_LEADERSHIP_ID: z
    .string()
    .optional()
    .default(
      GHOST_SYNDICATE.roles.admin,
    ),

  ROLE_FINANCE_ID: z
    .string()
    .optional()
    .default(
      GHOST_SYNDICATE.roles.admin,
    ),

  ROLE_OPERATIONS_ID: z
    .string()
    .optional()
    .default(
      GHOST_SYNDICATE.roles.admin,
    ),
});

/* =========================================================
   VALIDAR ENV
========================================================= */

const parsedEnv =
  envSchema.safeParse(
    process.env,
  );

if (!parsedEnv.success) {
  console.error('');
  console.error(
    '❌ ERRO NA CONFIGURAÇÃO DO GHOST SYNDICATE',
  );
  console.error('');

  for (
    const issue of
      parsedEnv.error.issues
  ) {
    console.error(
      `❌ ${issue.path.join('.')}: ${issue.message}`,
    );
  }

  console.error('');
  console.error(
    '💡 Verifique o arquivo .env.',
  );
  console.error('');

  process.exit(1);
}

const env =
  parsedEnv.data;

/* =========================================================
   CONFIGURAÇÃO PRINCIPAL
========================================================= */

export const config = {
  /* -------------------------------------------------------
     DISCORD
  ------------------------------------------------------- */

  discord: {
    token:
      env.DISCORD_TOKEN,

    clientId:
      env.DISCORD_CLIENT_ID,

    guildId:
      GHOST_SYNDICATE.guildId,
  },

  /* -------------------------------------------------------
     BANCO DE DADOS
  ------------------------------------------------------- */

  database: {
    url:
      env.DATABASE_URL,
  },

  /* -------------------------------------------------------
     WEB
  ------------------------------------------------------- */

  web: {
    port:
      env.WEB_PORT,
  },

  /* -------------------------------------------------------
     TICKETS
  ------------------------------------------------------- */

  tickets: {
    categoryId:
      env.CATEGORY_TICKETS_ID,

    transcriptsChannelId:
      env.TRANSCRIPT_CHANNEL_ID,
  },

  /* -------------------------------------------------------
     CARGOS
  ------------------------------------------------------- */

  roles: {
    ownerId:
      GHOST_SYNDICATE.roles.owner,

    recruitsId:
      GHOST_SYNDICATE.roles.recruits,

    leadershipId:
      env.ROLE_LEADERSHIP_ID,

    financeId:
      env.ROLE_FINANCE_ID,

    operationsId:
      env.ROLE_OPERATIONS_ID,

    botId:
      GHOST_SYNDICATE.roles.bot,
  },

  /* -------------------------------------------------------
     SERVIDOR
  ------------------------------------------------------- */

  guild: {
    id:
      GHOST_SYNDICATE.guildId,

    name:
      'Ghost Syndicate',
  },

  /* -------------------------------------------------------
     COMPATIBILIDADE TEMPORÁRIA
     
     Mantemos esses campos enquanto migramos
     os arquivos antigos para config.roles.*
  ------------------------------------------------------- */

  ROLE_LEADERSHIP_ID:
    env.ROLE_LEADERSHIP_ID,

  ROLE_FINANCE_ID:
    env.ROLE_FINANCE_ID,

  ROLE_OPERATIONS_ID:
    env.ROLE_OPERATIONS_ID,

  CATEGORY_TICKETS_ID:
    env.CATEGORY_TICKETS_ID,

  TRANSCRIPT_CHANNEL_ID:
    env.TRANSCRIPT_CHANNEL_ID,
} as const;

/* =========================================================
   HELPERS DE CARGOS
========================================================= */

export function isOwnerRole(
  roleId: string,
): boolean {
  return (
    roleId ===
    config.roles.ownerId
  );
}

export function isAdminRole(
  roleId: string,
): boolean {
  return (
    roleId ===
    config.roles.leadershipId
  );
}

export function isRecruitRole(
  roleId: string,
): boolean {
  return (
    roleId ===
    config.roles.recruitsId
  );
}

export function isBotRole(
  roleId: string,
): boolean {
  return (
    roleId ===
    config.roles.botId
  );
}

/* =========================================================
   LOG DA CONFIGURAÇÃO
========================================================= */

export function printConfig(): void {
  console.log('');
  console.log(
    '⚙️  CONFIGURAÇÃO DO GHOST SYNDICATE',
  );
  console.log(
    '════════════════════════════════════',
  );

  console.log('');
  console.log(
    '🏠 SERVIDOR',
  );

  console.log(
    `🌐 Nome: ${config.guild.name}`,
  );

  console.log(
    `🆔 Guild ID: ${config.discord.guildId}`,
  );

  console.log('');
  console.log(
    '🤖 BOT',
  );

  console.log(
    `🆔 Client ID: ${config.discord.clientId}`,
  );

  console.log(
    `🤖 Cargo do Bot: ${config.roles.botId}`,
  );

  console.log('');
  console.log(
    '👥 CARGOS',
  );

  console.log(
    `👑 Donos da fac: ${config.roles.ownerId}`,
  );

  console.log(
    `🛡️ ADM: ${config.roles.leadershipId}`,
  );

  console.log(
    `👤 Recrutas: ${config.roles.recruitsId}`,
  );

  console.log('');
  console.log(
    '🎫 TICKETS',
  );

  console.log(
    `📁 Categoria: ${
      config.tickets.categoryId ||
      'não definida'
    }`,
  );

  console.log(
    `📜 Transcripts: ${
      config.tickets
        .transcriptsChannelId ||
      'não definido'
    }`,
  );

  console.log('');
  console.log(
    '💰 FINANCEIRO',
  );

  console.log(
    `💰 Cargo Financeiro: ${config.roles.financeId}`,
  );

  console.log(
    `🎯 Cargo Operações: ${config.roles.operationsId}`,
  );

  console.log('');
  console.log(
    '🗄️ DATABASE',
  );

  console.log(
    `📦 ${config.database.url}`,
  );

  console.log('');
  console.log(
    '🌐 WEB',
  );

  console.log(
    `🔌 Porta: ${config.web.port}`,
  );

  console.log('');
  console.log(
    '════════════════════════════════════',
  );
  console.log('');
}
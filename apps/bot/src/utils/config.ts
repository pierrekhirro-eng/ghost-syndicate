// apps/bot/src/utils/config.ts

import 'dotenv/config';

import { z } from 'zod';

/* =========================================================
   ENV SCHEMA
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

  DISCORD_GUILD_ID: z
    .string()
    .min(
      1,
      'DISCORD_GUILD_ID é obrigatório.',
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
    .default(''),

  ROLE_FINANCE_ID: z
    .string()
    .optional()
    .default(''),

  ROLE_OPERATIONS_ID: z
    .string()
    .optional()
    .default(''),
});

/* =========================================================
   VALIDATION
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

  for (const issue of parsedEnv.error.issues) {
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

/* =========================================================
   VALUES
========================================================= */

const env =
  parsedEnv.data;

/* =========================================================
   CONFIG
========================================================= */

export const config = {
  /*
   * Discord
   */

  discord: {
    token:
      env.DISCORD_TOKEN,

    clientId:
      env.DISCORD_CLIENT_ID,

    guildId:
      env.DISCORD_GUILD_ID,
  },

  /*
   * Database
   */

  database: {
    url:
      env.DATABASE_URL,
  },

  /*
   * Web
   */

  web: {
    port:
      env.WEB_PORT,
  },

  /*
   * Tickets
   */

  tickets: {
    categoryId:
      env.CATEGORY_TICKETS_ID,

    transcriptsChannelId:
      env.TRANSCRIPT_CHANNEL_ID,
  },

  /*
   * Roles
   */

  roles: {
    leadershipId:
      env.ROLE_LEADERSHIP_ID,

    financeId:
      env.ROLE_FINANCE_ID,

    operationsId:
      env.ROLE_OPERATIONS_ID,
  },

  /*
   * Compatibilidade com o código antigo.
   *
   * Esses campos serão removidos depois
   * que terminarmos a migração dos serviços.
   */

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
   PRINT CONFIG
========================================================= */

export function printConfig(): void {
  console.log('');
  console.log(
    '⚙️  CONFIGURAÇÃO DO GHOST SYNDICATE',
  );
  console.log(
    '────────────────────────────────',
  );

  console.log(
    `🤖 Client ID: ${config.discord.clientId}`,
  );

  console.log(
    `🌐 Guild ID: ${config.discord.guildId}`,
  );

  console.log(
    `🗄️  Database: ${config.database.url}`,
  );

  console.log(
    `🌐 Web Port: ${config.web.port}`,
  );

  console.log(
    `🎫 Categoria de Tickets: ${
      config.tickets.categoryId ||
      'não definida'
    }`,
  );

  console.log(
    `📜 Canal de Transcripts: ${
      config.tickets
        .transcriptsChannelId ||
      'não definido'
    }`,
  );

  console.log(
    `👑 Cargo Liderança: ${
      config.roles.leadershipId ||
      'não definido'
    }`,
  );

  console.log(
    `💰 Cargo Financeiro: ${
      config.roles.financeId ||
      'não definido'
    }`,
  );

  console.log(
    `🎯 Cargo Operações: ${
      config.roles.operationsId ||
      'não definido'
    }`,
  );

  console.log(
    '────────────────────────────────',
  );

  console.log('');
}
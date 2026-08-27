// apps/bot/src/utils/config.ts

import 'dotenv/config';

import { z } from 'zod';

/* =========================================================
   SCHEMA DE CONFIGURAÇÃO
========================================================= */

const envSchema = z.object({
  DISCORD_TOKEN: z
    .string()
    .min(1, 'DISCORD_TOKEN é obrigatório.'),

  DISCORD_CLIENT_ID: z
    .string()
    .min(1, 'DISCORD_CLIENT_ID é obrigatório.'),

  DISCORD_GUILD_ID: z
    .string()
    .min(1, 'DISCORD_GUILD_ID é obrigatório.'),

  DATABASE_URL: z
    .string()
    .default('file:./dev.db'),

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

  CHANNEL_TRANSCRIPTS_ID: z
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
   VALIDAÇÃO
========================================================= */

const parsedEnv =
  envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('');
  console.error(
    '❌ ERRO NA CONFIGURAÇÃO DO GHOST SYNDICATE',
  );
  console.error('');
  console.error(
    'As seguintes variáveis precisam ser verificadas:',
  );
  console.error('');

  for (const issue of parsedEnv.error.issues) {
    console.error(
      `❌ ${issue.path.join('.')}: ${issue.message}`,
    );
  }

  console.error('');
  console.error(
    '💡 Verifique o arquivo .env antes de iniciar o bot.',
  );
  console.error('');

  process.exit(1);
}

/* =========================================================
   CONFIGURAÇÃO FINAL
========================================================= */

export const config = {
  discord: {
    token: parsedEnv.data.DISCORD_TOKEN,

    clientId:
      parsedEnv.data.DISCORD_CLIENT_ID,

    guildId:
      parsedEnv.data.DISCORD_GUILD_ID,
  },

  database: {
    url:
      parsedEnv.data.DATABASE_URL,
  },

  web: {
    port:
      parsedEnv.data.WEB_PORT,
  },

  tickets: {
    categoryId:
      parsedEnv.data.CATEGORY_TICKETS_ID,

    transcriptsChannelId:
      parsedEnv.data
        .CHANNEL_TRANSCRIPTS_ID,
  },

  roles: {
    leadershipId:
      parsedEnv.data
        .ROLE_LEADERSHIP_ID,

    financeId:
      parsedEnv.data
        .ROLE_FINANCE_ID,

    operationsId:
      parsedEnv.data
        .ROLE_OPERATIONS_ID,
  },
} as const;

/* =========================================================
   LOG DE CONFIGURAÇÃO
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
      config.tickets.categoryId || 'não definida'
    }`,
  );

  console.log(
    `📜 Canal de Transcripts: ${
      config.tickets.transcriptsChannelId ||
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
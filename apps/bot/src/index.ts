// apps/bot/src/index.ts

import {
  Client,
  GatewayIntentBits,
  Partials,
} from 'discord.js';

import {
  config,
  printConfig,
} from './utils/config.js';

import {
  registerCommands,
} from './commands/register.js';

import {
  onInteraction,
} from './events/interaction.js';

/* =========================================================
   CLIENT DISCORD
========================================================= */

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],

  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.GuildMember,
    Partials.User,
  ],
});

/* =========================================================
   INTERAÇÕES
========================================================= */

client.on(
  'interactionCreate',
  async (interaction) => {
    try {
      await onInteraction(
        interaction,
      );
    } catch (error) {
      console.error(
        '❌ Erro ao processar interação:',
        error,
      );
    }
  },
);

/* =========================================================
   READY
========================================================= */

client.once(
  'ready',
  async (readyClient) => {
    console.log('');
    console.log(
      '👻 ========================================',
    );
    console.log(
      '👻       GHOST SYNDICATE BOT',
    );
    console.log(
      '👻 ========================================',
    );
    console.log('');

    console.log(
      `✅ Conectado como: ${readyClient.user.tag}`,
    );

    console.log(
      `🌐 Servidores: ${readyClient.guilds.cache.size}`,
    );

    console.log(
      `🆔 Client ID: ${readyClient.user.id}`,
    );

    console.log('');

    printConfig();

    try {
      await registerCommands();

      console.log(
        '✅ Slash commands sincronizados.',
      );
    } catch (error) {
      console.error('');
      console.error(
        '❌ Falha ao sincronizar os slash commands.',
      );
      console.error('');
      console.error(error);
      console.error('');
    }

    console.log(
      '🚀 Ghost Syndicate iniciado com sucesso.',
    );

    console.log('');
  },
);

/* =========================================================
   ERRO DO CLIENTE
========================================================= */

client.on(
  'error',
  (error) => {
    console.error('');
    console.error(
      '❌ Erro no cliente Discord:',
    );
    console.error(error);
    console.error('');
  },
);

/* =========================================================
   AVISOS DO DISCORD.JS
========================================================= */

client.on(
  'warn',
  (message) => {
    console.warn(
      '⚠️ Discord.js:',
      message,
    );
  },
);

/* =========================================================
   DEBUG DE INTERAÇÕES
========================================================= */

client.on(
  'debug',
  (message) => {
    if (
      process.env.NODE_ENV ===
      'development'
    ) {
      console.debug(
        '🔎 Discord.js:',
        message,
      );
    }
  },
);

/* =========================================================
   PROMISES NÃO TRATADAS
========================================================= */

process.on(
  'unhandledRejection',
  (error) => {
    console.error('');
    console.error(
      '❌ Unhandled Rejection:',
    );
    console.error(error);
    console.error('');
  },
);

/* =========================================================
   EXCEÇÕES NÃO TRATADAS
========================================================= */

process.on(
  'uncaughtException',
  (error) => {
    console.error('');
    console.error(
      '❌ Uncaught Exception:',
    );
    console.error(error);
    console.error('');

    process.exit(1);
  },
);

/* =========================================================
   ENCERRAMENTO SEGURO
========================================================= */

async function shutdown(
  signal: string,
): Promise<void> {
  console.log('');
  console.log(
    `🛑 ${signal} recebido.`,
  );

  console.log(
    '👻 Encerrando Ghost Syndicate...',
  );

  try {
    if (client.isReady()) {
      client.destroy();
    }

    console.log(
      '✅ Bot encerrado com segurança.',
    );
  } catch (error) {
    console.error(
      '❌ Erro ao encerrar o bot:',
      error,
    );
  }

  process.exit(0);
}

/* =========================================================
   SIGNALS
========================================================= */

process.on(
  'SIGINT',
  () => {
    void shutdown('SIGINT');
  },
);

process.on(
  'SIGTERM',
  () => {
    void shutdown('SIGTERM');
  },
);

/* =========================================================
   LOGIN
========================================================= */

console.log('');
console.log(
  '🔄 Conectando ao Discord...',
);
console.log('');

client
  .login(
    config.discord.token,
  )
  .catch((error) => {
    console.error('');
    console.error(
      '❌ Não foi possível conectar ao Discord.',
    );
    console.error('');
    console.error(error);
    console.error('');

    process.exit(1);
  });
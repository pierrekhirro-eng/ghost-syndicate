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

import {
  onVoiceState,
  reconcileGuildVoice,
} from './events/voiceState.js';

/* =========================================================
   CLIENT DISCORD
========================================================= */

const client =
  new Client({
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
   INTERACTIONS
========================================================= */

client.on(
  'interactionCreate',
  async (
    interaction,
  ) => {
    try {
      await onInteraction(
        interaction,
      );
    } catch (
      error
    ) {
      console.error(
        '❌ [INTERACTION] Erro:',
        error,
      );
    }
  },
);

/* =========================================================
   VOICE STATE UPDATE
========================================================= */

client.on(
  'voiceStateUpdate',
  async (
    oldState,
    newState,
  ) => {
    try {
      await onVoiceState(
        oldState,
        newState,
      );
    } catch (
      error
    ) {
      console.error(
        '❌ [VOICE EVENT] Erro:',
        error,
      );
    }
  },
);

/* =========================================================
   RECONCILIAR TODOS OS SERVIDORES
========================================================= */

let reconciliationRunning =
  false;

async function reconcileAllGuilds(): Promise<void> {
  if (
    reconciliationRunning
  ) {
    return;
  }

  reconciliationRunning =
    true;

  try {
    for (
      const guild of client.guilds.cache.values()
    ) {
      await reconcileGuildVoice(
        guild,
      );
    }

  } catch (
    error
  ) {
    console.error(
      '❌ [VOICE] Erro na reconciliação geral:',
      error,
    );

  } finally {
    reconciliationRunning =
      false;
  }
}

/* =========================================================
   READY
========================================================= */

client.once(
  'ready',
  async (
    readyClient,
  ) => {
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

    /*
     * =====================================================
     * REGISTRAR COMMANDS
     * =====================================================
     */

    try {
      await registerCommands();

      console.log(
        '✅ Slash commands sincronizados.',
      );

    } catch (
      error
    ) {
      console.error('');
      console.error(
        '❌ Falha ao sincronizar os slash commands.',
      );
      console.error('');
      console.error(
        error,
      );
      console.error('');
    }

    /*
     * =====================================================
     * PEQUENO DELAY
     * =====================================================
     *
     * Dá tempo para o cache de VoiceState estabilizar
     * após o READY.
     */

    setTimeout(
      () => {
        void reconcileAllGuilds();
      },
      2_000,
    );

    /*
     * =====================================================
     * RECONCILIAÇÃO AUTOMÁTICA
     * =====================================================
     *
     * A cada 10 segundos:
     *
     * Discord
     *   ↓
     * VoiceState
     *   ↓
     * banco
     *
     * Assim uma sessão fantasma é corrigida
     * automaticamente.
     */

    setInterval(
      () => {
        void reconcileAllGuilds();
      },
      10_000,
    );

    console.log(
      '🛡️ [VOICE] Reconciliação automática ativa a cada 10s.',
    );

    console.log('');
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
  (
    error,
  ) => {
    console.error(
      '❌ [CLIENT] Erro do Discord:',
      error,
    );
  },
);

/* =========================================================
   WARNING
========================================================= */

client.on(
  'warn',
  (
    message,
  ) => {
    console.warn(
      '⚠️ [DISCORD]',
      message,
    );
  },
);

/* =========================================================
   DEBUG
========================================================= */

client.on(
  'debug',
  (
    message,
  ) => {
    if (
      process.env.NODE_ENV ===
      'development'
    ) {
      console.debug(
        '🔎 [DEBUG]',
        message,
      );
    }
  },
);

/* =========================================================
   UNHANDLED REJECTION
========================================================= */

process.on(
  'unhandledRejection',
  (
    error,
  ) => {
    console.error(
      '❌ [UNHANDLED REJECTION]',
      error,
    );
  },
);

/* =========================================================
   UNCAUGHT EXCEPTION
========================================================= */

process.on(
  'uncaughtException',
  (
    error,
  ) => {
    console.error(
      '❌ [UNCAUGHT EXCEPTION]',
      error,
    );
  },
);

/* =========================================================
   SHUTDOWN
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
    if (
      client.isReady()
    ) {
      client.destroy();
    }

    console.log(
      '✅ Bot encerrado com segurança.',
    );

  } catch (
    error
  ) {
    console.error(
      '❌ Erro durante shutdown:',
      error,
    );
  }

  process.exit(
    0,
  );
}

/* =========================================================
   SIGNALS
========================================================= */

process.on(
  'SIGINT',
  () => {
    void shutdown(
      'SIGINT',
    );
  },
);

process.on(
  'SIGTERM',
  () => {
    void shutdown(
      'SIGTERM',
    );
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
  .catch(
    (
      error,
    ) => {
      console.error('');
      console.error(
        '❌ Não foi possível conectar ao Discord.',
      );
      console.error('');
      console.error(
        error,
      );
      console.error('');

      process.exit(
        1,
      );
    },
  );
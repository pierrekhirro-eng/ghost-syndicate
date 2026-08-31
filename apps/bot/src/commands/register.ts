// apps/bot/src/commands/register.ts

import {
  REST,
  Routes,
  SlashCommandBuilder,
} from 'discord.js';

import {
  config,
} from '../utils/config.js';

import {
  adminCommand,
} from './admin.js';

/* =========================================================
   COMANDOS
========================================================= */

const commands = [

  /* =======================================================
     CAIXA
  ======================================================= */

  new SlashCommandBuilder()
    .setName('caixa')
    .setDescription(
      'Mostra o saldo atual da Ghost Syndicate.',
    ),

  /* =======================================================
     ENTRADA
  ======================================================= */

  new SlashCommandBuilder()
    .setName('entrada')
    .setDescription(
      'Registra uma entrada no caixa.',
    )
    .addIntegerOption(
      (option) =>
        option
          .setName('valor')
          .setDescription(
            'Valor da entrada em K.',
          )
          .setRequired(true)
          .setMinValue(1),
    )
    .addStringOption(
      (option) =>
        option
          .setName('motivo')
          .setDescription(
            'Motivo da entrada.',
          )
          .setRequired(true)
          .setMaxLength(200),
    ),

  /* =======================================================
     SAÍDA
  ======================================================= */

  new SlashCommandBuilder()
    .setName('saida')
    .setDescription(
      'Registra uma saída do caixa.',
    )
    .addIntegerOption(
      (option) =>
        option
          .setName('valor')
          .setDescription(
            'Valor da saída em K.',
          )
          .setRequired(true)
          .setMinValue(1),
    )
    .addStringOption(
      (option) =>
        option
          .setName('motivo')
          .setDescription(
            'Motivo da saída.',
          )
          .setRequired(true)
          .setMaxLength(200),
    ),

  /* =======================================================
     EMPRÉSTIMO
  ======================================================= */

  new SlashCommandBuilder()
    .setName('emprestimo')
    .setDescription(
      'Registra um novo empréstimo.',
    )

    .addUserOption(
      (option) =>
        option
          .setName('membro')
          .setDescription(
            'Membro que receberá o empréstimo.',
          )
          .setRequired(true),
    )

    .addStringOption(
      (option) =>
        option
          .setName('tipo')
          .setDescription(
            'Tipo do empréstimo.',
          )
          .setRequired(true)
          .addChoices(
            {
              name:
                '💵 Dinheiro',

              value:
                'DINHEIRO',
            },

            {
              name:
                '🚗 Veículo',

              value:
                'VEICULO',
            },
          ),
    )

    .addStringOption(
      (option) =>
        option
          .setName('valor')
          .setDescription(
            'Valor em dinheiro ou item/veículo.',
          )
          .setRequired(true)
          .setMaxLength(150),
    )

    .addStringOption(
      (option) =>
        option
          .setName('prazo')
          .setDescription(
            'Ex.: 30 dias, 30d, 31/12/2026.',
          )
          .setRequired(true)
          .setMaxLength(100),
    )

    .addStringOption(
      (option) =>
        option
          .setName('juros')
          .setDescription(
            'Ex.: 10% ou Sem juros.',
          )
          .setRequired(false)
          .setMaxLength(50),
    ),

  /* =======================================================
     HORAS
  ======================================================= */

  new SlashCommandBuilder()
    .setName('horas')
    .setDescription(
      'Mostra suas horas acumuladas em call.',
    ),

  /* =======================================================
     RANKING
  ======================================================= */

  new SlashCommandBuilder()
    .setName('ranking-voz')
    .setDescription(
      'Mostra o ranking de horas em call.',
    ),

  /* =======================================================
     TICKET SETUP
  ======================================================= */

  new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription(
      'Envia a central de tickets.',
    ),

  /* =======================================================
     ADMIN
  ======================================================= */

  adminCommand,

].map(
  (command) =>
    command.toJSON(),
);

/* =========================================================
   REGISTRO
========================================================= */

export async function registerCommands(): Promise<void> {
  console.log('');

  console.log(
    '📡 Registrando comandos do Ghost Syndicate...',
  );

  console.log('');

  /*
   * ATENÇÃO:
   * A configuração real do projeto é:
   *
   * config.discord.token
   * config.discord.clientId
   * config.discord.guildId
   */
  const rest =
    new REST({
      version:
        '10',
    }).setToken(
      config.discord.token,
    );

  try {
    console.log(
      `📦 Total de comandos: ${commands.length}`,
    );

    console.log(
      '📝 Comandos:',
    );

    for (
      const command of commands
    ) {
      console.log(
        `   /${command.name}`,
      );
    }

    console.log('');

    await rest.put(
      Routes.applicationGuildCommands(
        config.discord.clientId,
        config.discord.guildId,
      ),

      {
        body:
          commands,
      },
    );

    console.log('');

    console.log(
      `✅ ${commands.length} comandos registrados com sucesso.`,
    );

    console.log(
      `🌐 Servidor: ${config.discord.guildId}`,
    );

    console.log('');

  } catch (
    error
  ) {
    console.error('');

    console.error(
      '❌ Erro ao registrar os comandos:',
    );

    console.error(
      error,
    );

    console.error('');

    throw error;
  }
}

/* =========================================================
   EXECUÇÃO DIRETA
========================================================= */

const currentFile =
  process.argv[1] ??
  '';

const isDirectExecution =
  currentFile.endsWith(
    'register.js',
  ) ||
  currentFile.endsWith(
    'register.ts',
  );

if (
  isDirectExecution
) {
  registerCommands()
    .then(
      () => {
        console.log(
          '✅ Processo de registro finalizado.',
        );

        process.exit(
          0,
        );
      },
    )
    .catch(
      () => {
        process.exit(
          1,
        );
      },
    );
}
// apps/bot/src/commands/register.ts

import {
  REST,
  Routes,
  SlashCommandBuilder,
} from 'discord.js';

import { config } from '../utils/config.js';

/* =========================================================
   COMANDOS
========================================================= */

const commands = [
  new SlashCommandBuilder()
    .setName('caixa')
    .setDescription(
      'Mostra o saldo atual da Ghost Syndicate.',
    ),

  new SlashCommandBuilder()
    .setName('entrada')
    .setDescription(
      'Registra uma entrada no caixa.',
    )
    .addIntegerOption((option) =>
      option
        .setName('valor')
        .setDescription(
          'Valor da entrada em K.',
        )
        .setRequired(true)
        .setMinValue(1),
    )
    .addStringOption((option) =>
      option
        .setName('motivo')
        .setDescription(
          'Motivo da entrada.',
        )
        .setRequired(true)
        .setMaxLength(200),
    ),

  new SlashCommandBuilder()
    .setName('saida')
    .setDescription(
      'Registra uma saída do caixa.',
    )
    .addIntegerOption((option) =>
      option
        .setName('valor')
        .setDescription(
          'Valor da saída em K.',
        )
        .setRequired(true)
        .setMinValue(1),
    )
    .addStringOption((option) =>
      option
        .setName('motivo')
        .setDescription(
          'Motivo da saída.',
        )
        .setRequired(true)
        .setMaxLength(200),
    ),

  new SlashCommandBuilder()
    .setName('emprestimo')
    .setDescription(
      'Registra um novo empréstimo.',
    )
    .addStringOption((option) =>
      option
        .setName('tipo')
        .setDescription(
          'Tipo do empréstimo.',
        )
        .setRequired(true)
        .addChoices(
          {
            name: 'Dinheiro',
            value: 'DINHEIRO',
          },
          {
            name: 'Veículo',
            value: 'VEICULO',
          },
        ),
    )
    .addStringOption((option) =>
      option
        .setName('valor')
        .setDescription(
          'Valor ou veículo emprestado.',
        )
        .setRequired(true)
        .setMaxLength(150),
    )
    .addStringOption((option) =>
      option
        .setName('prazo')
        .setDescription(
          'Prazo para devolução.',
        )
        .setRequired(true)
        .setMaxLength(100),
    )
    .addStringOption((option) =>
      option
        .setName('juros')
        .setDescription(
          'Juros do empréstimo.',
        )
        .setRequired(false)
        .setMaxLength(50),
    ),

  new SlashCommandBuilder()
    .setName('horas')
    .setDescription(
      'Mostra suas horas acumuladas em call.',
    ),

  new SlashCommandBuilder()
    .setName('ranking-voz')
    .setDescription(
      'Mostra o ranking de horas em call.',
    ),

  new SlashCommandBuilder()
    .setName('ticket-setup')
    .setDescription(
      'Envia a central de tickets.',
    ),
];

/* =========================================================
   REGISTRO DOS COMANDOS
========================================================= */

export async function registerCommands(): Promise<void> {
  console.log('');
  console.log(
    '📡 Registrando comandos do Ghost Syndicate...',
  );
  console.log('');

  const rest = new REST({
    version: '10',
  }).setToken(
    config.discord.token,
  );

  try {
    const commandData =
      commands.map((command) =>
        command.toJSON(),
      );

    await rest.put(
      Routes.applicationGuildCommands(
        config.discord.clientId,
        config.discord.guildId,
      ),
      {
        body: commandData,
      },
    );

    console.log(
      `✅ ${commandData.length} comandos registrados com sucesso.`,
    );

    console.log(
      `🌐 Servidor: ${config.discord.guildId}`,
    );

    console.log('');
  } catch (error) {
    console.error('');
    console.error(
      '❌ Erro ao registrar os comandos:',
    );
    console.error(error);
    console.error('');

    throw error;
  }
}

/* =========================================================
   EXECUÇÃO DIRETA
========================================================= */

const currentFile =
  process.argv[1] ?? '';

const isDirectExecution =
  currentFile.endsWith(
    'register.js',
  ) ||
  currentFile.endsWith(
    'register.ts',
  );

if (isDirectExecution) {
  registerCommands()
    .then(() => {
      console.log(
        '✅ Processo de registro finalizado.',
      );

      process.exit(0);
    })
    .catch(() => {
      process.exit(1);
    });
}
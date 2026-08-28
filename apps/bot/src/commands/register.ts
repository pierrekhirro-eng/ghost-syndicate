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

import {
  financeCommand,
} from './finance.js';

import {
  operationsCommand,
} from './operations.js';

import {
  missionsCommand,
} from './missions.js';

import {
  loansCommand,
} from './loans.js';

import {
  rankingCommand,
} from './ranking.js';

import {
  rewardsCommand,
} from './rewards.js';

import {
  ticketsCommand,
} from './tickets.js';

import {
  membersCommand,
} from './members.js';

import {
  configCommand,
} from './config.js';

import {
  moderationCommand,
} from './moderation.js';

/* =========================================================
   COMANDOS
========================================================= */

/*
 * Os comandos antigos simples continuam existindo porque
 * já são usados pelo sistema:
 *
 * /caixa
 * /entrada
 * /saida
 * /horas
 * /ranking-voz
 *
 * Os módulos novos entram abaixo.
 */

const commands = [

  /* =======================================================
     FINANCEIRO BÁSICO
  ======================================================= */

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

  financeCommand,

  /* =======================================================
     VOZ
  ======================================================= */

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

  /* =======================================================
     ADMINISTRAÇÃO
  ======================================================= */

  adminCommand,

  configCommand,

  membersCommand,

  moderationCommand,

  /* =======================================================
     OPERAÇÕES
  ======================================================= */

  operationsCommand,

  missionsCommand,

  /* =======================================================
     EMPRÉSTIMOS
  ======================================================= */

  loansCommand,

  /* =======================================================
     RANKING / PREMIAÇÕES
  ======================================================= */

  rankingCommand,

  rewardsCommand,

  /* =======================================================
     TICKETS
  ======================================================= */

  ticketsCommand,
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

  const rest =
    new REST({
      version: '10',
    }).setToken(
      config.discord.token,
    );

  try {
    const commandData =
      commands.map(
        (command) =>
          command.toJSON(),
      );

    console.log(
      `📦 Total de comandos: ${commandData.length}`,
    );

    console.log(
      '📝 Comandos:',
    );

    for (
      const command
      of commandData
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
          commandData,
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
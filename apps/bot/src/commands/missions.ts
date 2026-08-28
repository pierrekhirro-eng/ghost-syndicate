// apps/bot/src/commands/missions.ts

import {
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
} from 'discord.js';

import {
  requireAdmin,
} from '../utils/permissions.js';

/* =========================================================
   TIPOS
========================================================= */

export type MissionStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

/* =========================================================
   COMANDO
========================================================= */

export const missionsCommand =
  new SlashCommandBuilder()
    .setName('missao')
    .setDescription(
      'Gerencia as missões da Ghost Syndicate.',
    )

    /* -------------------------------------------------------
       CRIAR
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('criar')
        .setDescription(
          'Cria uma nova missão.',
        )
        .addStringOption((option) =>
          option
            .setName('nome')
            .setDescription(
              'Nome da missão.',
            )
            .setRequired(true)
            .setMaxLength(100),
        )
        .addStringOption((option) =>
          option
            .setName('descricao')
            .setDescription(
              'Descrição da missão.',
            )
            .setRequired(true)
            .setMaxLength(1000),
        )
        .addStringOption((option) =>
          option
            .setName('objetivo')
            .setDescription(
              'Objetivo da missão.',
            )
            .setRequired(true)
            .setMaxLength(500),
        )
        .addStringOption((option) =>
          option
            .setName('responsavel')
            .setDescription(
              'Responsável pela missão.',
            )
            .setRequired(true)
            .setMaxLength(100),
        )
        .addIntegerOption((option) =>
          option
            .setName('recompensa')
            .setDescription(
              'Recompensa da missão.',
            )
            .setRequired(false)
            .setMinValue(0),
        ),
    )

    /* -------------------------------------------------------
       LISTAR
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('listar')
        .setDescription(
          'Lista as missões cadastradas.',
        )
        .addStringOption((option) =>
          option
            .setName('status')
            .setDescription(
              'Filtra pelo status.',
            )
            .setRequired(false)
            .addChoices(
              {
                name: 'Pendentes',
                value: 'PENDING',
              },
              {
                name: 'Ativas',
                value: 'ACTIVE',
              },
              {
                name: 'Concluídas',
                value: 'COMPLETED',
              },
              {
                name: 'Canceladas',
                value: 'CANCELLED',
              },
            ),
        ),
    )

    /* -------------------------------------------------------
       VER
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('ver')
        .setDescription(
          'Mostra uma missão específica.',
        )
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription(
              'ID da missão.',
            )
            .setRequired(true)
            .setMaxLength(50),
        ),
    )

    /* -------------------------------------------------------
       INICIAR
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('iniciar')
        .setDescription(
          'Inicia uma missão pendente.',
        )
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription(
              'ID da missão.',
            )
            .setRequired(true)
            .setMaxLength(50),
        ),
    )

    /* -------------------------------------------------------
       CONCLUIR
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('concluir')
        .setDescription(
          'Conclui uma missão ativa.',
        )
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription(
              'ID da missão.',
            )
            .setRequired(true)
            .setMaxLength(50),
        )
        .addStringOption((option) =>
          option
            .setName('resultado')
            .setDescription(
              'Resultado da missão.',
            )
            .setRequired(true)
            .setMaxLength(1000),
        ),
    )

    /* -------------------------------------------------------
       CANCELAR
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('cancelar')
        .setDescription(
          'Cancela uma missão.',
        )
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription(
              'ID da missão.',
            )
            .setRequired(true)
            .setMaxLength(50),
        )
        .addStringOption((option) =>
          option
            .setName('motivo')
            .setDescription(
              'Motivo do cancelamento.',
            )
            .setRequired(true)
            .setMaxLength(500),
        ),
    )

    /* -------------------------------------------------------
       ATRIBUIR
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('atribuir')
        .setDescription(
          'Atribui uma missão a um membro.',
        )
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription(
              'ID da missão.',
            )
            .setRequired(true)
            .setMaxLength(50),
        )
        .addUserOption((option) =>
          option
            .setName('membro')
            .setDescription(
              'Membro que receberá a missão.',
            )
            .setRequired(true),
        ),
    );

/* =========================================================
   EXECUTOR
========================================================= */

export async function executeMissionsCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content:
        '❌ Este comando só pode ser usado dentro do servidor.',
      ephemeral: true,
    });

    return;
  }

  const member =
    await interaction.guild.members.fetch(
      interaction.user.id,
    );

  try {
    requireAdmin(member);
  } catch (error) {
    await interaction.reply({
      content:
        error instanceof Error
          ? `❌ ${error.message}`
          : '❌ Você não possui permissão para gerenciar missões.',
      ephemeral: true,
    });

    return;
  }

  const subcommand =
    interaction.options.getSubcommand();

  switch (subcommand) {
    case 'criar':
      await handleCreate(
        interaction,
        member,
      );
      break;

    case 'listar':
      await handleList(
        interaction,
      );
      break;

    case 'ver':
      await handleView(
        interaction,
      );
      break;

    case 'iniciar':
      await handleStart(
        interaction,
      );
      break;

    case 'concluir':
      await handleComplete(
        interaction,
      );
      break;

    case 'cancelar':
      await handleCancel(
        interaction,
      );
      break;

    case 'atribuir':
      await handleAssign(
        interaction,
      );
      break;

    default:
      await interaction.reply({
        content:
          '❌ Subcomando de missão inválido.',
        ephemeral: true,
      });
      break;
  }
}

/* =========================================================
   CRIAR
========================================================= */

async function handleCreate(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  const name =
    interaction.options.getString(
      'nome',
      true,
    ).trim();

  const description =
    interaction.options
      .getString(
        'descricao',
        true,
      )
      .trim();

  const objective =
    interaction.options
      .getString(
        'objetivo',
        true,
      )
      .trim();

  const responsible =
    interaction.options
      .getString(
        'responsavel',
        true,
      )
      .trim();

  const reward =
    interaction.options.getInteger(
      'recompensa',
    ) ?? 0;

  const temporaryId =
    `MIS-${Date.now()
      .toString(36)
      .toUpperCase()}`;

  const embed =
    new EmbedBuilder()
      .setColor(0x7c5cff)
      .setTitle(
        '📦 MISSÃO CRIADA',
      )
      .setDescription(
        [
          `> **${name}**`,
          '',
          `🆔 **ID:** \`${temporaryId}\``,
          `📝 **Descrição:** ${description}`,
          `🎯 **Objetivo:** ${objective}`,
          `👤 **Responsável:** ${responsible}`,
          `💰 **Recompensa:** ${reward}`,
          `📊 **Status:** 🟡 PENDENTE`,
          `🛡️ **Criada por:** ${member}`,
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Missões',
      })
      .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* =========================================================
   LISTAR
========================================================= */

async function handleList(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const status =
    interaction.options.getString(
      'status',
    );

  const statusLabel =
    getStatusLabel(
      status as MissionStatus | null,
    );

  const embed =
    new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(
        '📋 MISSÕES',
      )
      .setDescription(
        [
          '> Central de missões da Ghost Syndicate.',
          '',
          `🔎 **Filtro:** ${statusLabel}`,
          '',
          'Nenhuma missão persistida foi carregada ainda.',
          '',
          'A camada de banco de dados será conectada na etapa de integração.',
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Missões',
      })
      .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* =========================================================
   VER
========================================================= */

async function handleView(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const id =
    interaction.options.getString(
      'id',
      true,
    ).trim();

  const embed =
    new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(
        '📦 MISSÃO',
      )
      .setDescription(
        [
          `🆔 **ID:** \`${id}\``,
          '',
          'A consulta detalhada será ligada ao banco de dados na etapa de integração.',
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Missões',
      })
      .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* =========================================================
   INICIAR
========================================================= */

async function handleStart(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const id =
    interaction.options.getString(
      'id',
      true,
    ).trim();

  const embed =
    new EmbedBuilder()
      .setColor(0x35d39a)
      .setTitle(
        '🚀 MISSÃO INICIADA',
      )
      .setDescription(
        [
          `🆔 **Missão:** \`${id}\``,
          '',
          '🟢 Status alterado para **ATIVA**.',
        ].join('\n'),
      )
      .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* =========================================================
   CONCLUIR
========================================================= */

async function handleComplete(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const id =
    interaction.options.getString(
      'id',
      true,
    ).trim();

  const result =
    interaction.options
      .getString(
        'resultado',
        true,
      )
      .trim();

  const embed =
    new EmbedBuilder()
      .setColor(0x35d39a)
      .setTitle(
        '✅ MISSÃO CONCLUÍDA',
      )
      .setDescription(
        [
          `🆔 **Missão:** \`${id}\``,
          '',
          `📋 **Resultado:** ${result}`,
          '',
          '📊 Status alterado para **CONCLUÍDA**.',
        ].join('\n'),
      )
      .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* =========================================================
   CANCELAR
========================================================= */

async function handleCancel(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const id =
    interaction.options.getString(
      'id',
      true,
    ).trim();

  const reason =
    interaction.options
      .getString(
        'motivo',
        true,
      )
      .trim();

  const embed =
    new EmbedBuilder()
      .setColor(0xf15b6b)
      .setTitle(
        '❌ MISSÃO CANCELADA',
      )
      .setDescription(
        [
          `🆔 **Missão:** \`${id}\``,
          '',
          `📝 **Motivo:** ${reason}`,
          '',
          '📊 Status alterado para **CANCELADA**.',
        ].join('\n'),
      )
      .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* =========================================================
   ATRIBUIR
========================================================= */

async function handleAssign(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const id =
    interaction.options.getString(
      'id',
      true,
    ).trim();

  const target =
    interaction.options.getUser(
      'membro',
      true,
    );

  const embed =
    new EmbedBuilder()
      .setColor(0x7c5cff)
      .setTitle(
        '👤 MISSÃO ATRIBUÍDA',
      )
      .setDescription(
        [
          `🆔 **Missão:** \`${id}\``,
          `👤 **Membro:** ${target}`,
          '',
          '✅ A atribuição foi preparada.',
          'A persistência no banco será conectada na etapa de integração.',
        ].join('\n'),
      )
      .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* =========================================================
   STATUS
========================================================= */

function getStatusLabel(
  status:
    | MissionStatus
    | null,
): string {
  switch (status) {
    case 'PENDING':
      return '🟡 Pendentes';

    case 'ACTIVE':
      return '🟢 Ativas';

    case 'COMPLETED':
      return '✅ Concluídas';

    case 'CANCELLED':
      return '❌ Canceladas';

    default:
      return '📋 Todas';
  }
}
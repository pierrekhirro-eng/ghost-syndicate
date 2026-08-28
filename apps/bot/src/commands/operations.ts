// apps/bot/src/commands/operations.ts

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

export type OperationStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED';

/* =========================================================
   COMANDO
========================================================= */

export const operationsCommand =
  new SlashCommandBuilder()
    .setName('operacao')
    .setDescription(
      'Gerencia as operações da Ghost Syndicate.',
    )

    /* -------------------------------------------------------
       CRIAR
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('criar')
        .setDescription(
          'Cria uma nova operação.',
        )
        .addStringOption((option) =>
          option
            .setName('nome')
            .setDescription(
              'Nome da operação.',
            )
            .setRequired(true)
            .setMaxLength(100),
        )
        .addStringOption((option) =>
          option
            .setName('descricao')
            .setDescription(
              'Descrição da operação.',
            )
            .setRequired(true)
            .setMaxLength(1000),
        )
        .addStringOption((option) =>
          option
            .setName('objetivo')
            .setDescription(
              'Objetivo principal.',
            )
            .setRequired(true)
            .setMaxLength(500),
        )
        .addStringOption((option) =>
          option
            .setName('responsavel')
            .setDescription(
              'Responsável pela operação.',
            )
            .setRequired(true)
            .setMaxLength(100),
        ),

    )

    /* -------------------------------------------------------
       LISTAR
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('listar')
        .setDescription(
          'Lista as operações cadastradas.',
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
          'Mostra uma operação específica.',
        )
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription(
              'ID da operação.',
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
          'Inicia uma operação pendente.',
        )
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription(
              'ID da operação.',
            )
            .setRequired(true)
            .setMaxLength(50),
        ),
    )

    /* -------------------------------------------------------
       FINALIZAR
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('finalizar')
        .setDescription(
          'Finaliza uma operação ativa.',
        )
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription(
              'ID da operação.',
            )
            .setRequired(true)
            .setMaxLength(50),
        )
        .addStringOption((option) =>
          option
            .setName('resultado')
            .setDescription(
              'Resultado da operação.',
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
          'Cancela uma operação.',
        )
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription(
              'ID da operação.',
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
    );

/* =========================================================
   EXECUTOR
========================================================= */

export async function executeOperationsCommand(
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
          : '❌ Você não possui permissão para gerenciar operações.',
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

    case 'finalizar':
      await handleFinish(
        interaction,
      );
      break;

    case 'cancelar':
      await handleCancel(
        interaction,
      );
      break;

    default:
      await interaction.reply({
        content:
          '❌ Subcomando de operação inválido.',
        ephemeral: true,
      });
      break;
  }
}

/* =========================================================
   CRIAR OPERAÇÃO
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

  if (
    name.length < 3 ||
    description.length < 3 ||
    objective.length < 3 ||
    responsible.length < 2
  ) {
    await interaction.reply({
      content:
        '❌ Verifique os dados informados da operação.',
      ephemeral: true,
    });

    return;
  }

  const temporaryId =
    `OP-${Date.now()
      .toString(36)
      .toUpperCase()}`;

  const embed =
    new EmbedBuilder()
      .setColor(0x7c5cff)
      .setTitle(
        '🎯 OPERAÇÃO CRIADA',
      )
      .setDescription(
        [
          `> **${name}**`,
          '',
          `🆔 **ID:** \`${temporaryId}\``,
          `📝 **Descrição:** ${description}`,
          `🎯 **Objetivo:** ${objective}`,
          `👤 **Responsável:** ${responsible}`,
          `📊 **Status:** 🟡 PENDENTE`,
          `🛡️ **Criada por:** ${member}`,
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Operações',
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
      status as OperationStatus | null,
    );

  const embed =
    new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(
        '📋 OPERAÇÕES',
      )
      .setDescription(
        [
          '> Central de operações da Ghost Syndicate.',
          '',
          `🔎 **Filtro:** ${statusLabel}`,
          '',
          'Nenhuma operação persistida foi carregada ainda.',
          '',
          'A camada de banco de dados será conectada quando terminarmos todos os módulos.',
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Operações',
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
        '🎯 OPERAÇÃO',
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
          'Ghost Syndicate • Operações',
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
        '🚀 OPERAÇÃO INICIADA',
      )
      .setDescription(
        [
          `🆔 **Operação:** \`${id}\``,
          '',
          '🟢 Status alterado para **ATIVA**.',
          '',
          'A persistência dessa alteração será ligada na etapa de integração.',
        ].join('\n'),
      )
      .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* =========================================================
   FINALIZAR
========================================================= */

async function handleFinish(
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
        '✅ OPERAÇÃO FINALIZADA',
      )
      .setDescription(
        [
          `🆔 **Operação:** \`${id}\``,
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
        '❌ OPERAÇÃO CANCELADA',
      )
      .setDescription(
        [
          `🆔 **Operação:** \`${id}\``,
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
   STATUS
========================================================= */

function getStatusLabel(
  status:
    | OperationStatus
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
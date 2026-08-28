// apps/bot/src/commands/moderation.ts

import {
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
  type TextChannel,
} from 'discord.js';

import {
  requireAdmin,
} from '../utils/permissions.js';

/* =========================================================
   CORES
========================================================= */

const COLORS = {
  brand: 0x7c5cff,
  success: 0x35d39a,
  warning: 0xffc857,
  danger: 0xf15b6b,
  info: 0x5865f2,
} as const;

/* =========================================================
   COMANDO
========================================================= */

export const moderationCommand =
  new SlashCommandBuilder()
    .setName('moderacao')
    .setDescription(
      'Ferramentas de moderação da Ghost Syndicate.',
    )

    /* -------------------------------------------------------
       WARN
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('warn')
        .setDescription(
          'Registra uma advertência.',
        )
        .addUserOption((option) =>
          option
            .setName('membro')
            .setDescription(
              'Membro advertido.',
            )
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('motivo')
            .setDescription(
              'Motivo da advertência.',
            )
            .setRequired(true)
            .setMaxLength(500),
        ),
    )

    /* -------------------------------------------------------
       KICK
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('kick')
        .setDescription(
          'Expulsa um membro do servidor.',
        )
        .addUserOption((option) =>
          option
            .setName('membro')
            .setDescription(
              'Membro que será expulso.',
            )
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('motivo')
            .setDescription(
              'Motivo da expulsão.',
            )
            .setRequired(true)
            .setMaxLength(500),
        ),
    )

    /* -------------------------------------------------------
       BAN
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('ban')
        .setDescription(
          'Bane um membro do servidor.',
        )
        .addUserOption((option) =>
          option
            .setName('membro')
            .setDescription(
              'Membro que será banido.',
            )
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('motivo')
            .setDescription(
              'Motivo do banimento.',
            )
            .setRequired(true)
            .setMaxLength(500),
        )
        .addIntegerOption((option) =>
          option
            .setName('dias')
            .setDescription(
              'Dias de mensagens a excluir.',
            )
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(7),
        ),
    )

    /* -------------------------------------------------------
       TIMEOUT
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('timeout')
        .setDescription(
          'Aplica timeout em um membro.',
        )
        .addUserOption((option) =>
          option
            .setName('membro')
            .setDescription(
              'Membro que receberá o timeout.',
            )
            .setRequired(true),
        )
        .addIntegerOption((option) =>
          option
            .setName('minutos')
            .setDescription(
              'Duração em minutos.',
            )
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(40320),
        )
        .addStringOption((option) =>
          option
            .setName('motivo')
            .setDescription(
              'Motivo do timeout.',
            )
            .setRequired(true)
            .setMaxLength(500),
        ),
    )

    /* -------------------------------------------------------
       UNTIMEOUT
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('untimeout')
        .setDescription(
          'Remove o timeout de um membro.',
        )
        .addUserOption((option) =>
          option
            .setName('membro')
            .setDescription(
              'Membro que terá o timeout removido.',
            )
            .setRequired(true),
        ),
    )

    /* -------------------------------------------------------
       PURGE
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('limpar')
        .setDescription(
          'Apaga mensagens recentes de um canal.',
        )
        .addIntegerOption((option) =>
          option
            .setName('quantidade')
            .setDescription(
              'Quantidade de mensagens.',
            )
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(100),
        ),
    )

    /* -------------------------------------------------------
       INFO
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('info')
        .setDescription(
          'Mostra informações de moderação de um membro.',
        )
        .addUserOption((option) =>
          option
            .setName('membro')
            .setDescription(
              'Membro consultado.',
            )
            .setRequired(true),
        ),
    );

/* =========================================================
   EXECUTOR
========================================================= */

export async function executeModerationCommand(
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

  const executor =
    await interaction.guild.members.fetch(
      interaction.user.id,
    );

  try {
    requireAdmin(executor);
  } catch (error) {
    await interaction.reply({
      content:
        error instanceof Error
          ? `❌ ${error.message}`
          : '❌ Você não possui permissão para moderar o servidor.',
      ephemeral: true,
    });

    return;
  }

  const subcommand =
    interaction.options.getSubcommand();

  try {
    switch (subcommand) {
      case 'warn':
        await handleWarn(
          interaction,
          executor,
        );
        break;

      case 'kick':
        await handleKick(
          interaction,
          executor,
        );
        break;

      case 'ban':
        await handleBan(
          interaction,
          executor,
        );
        break;

      case 'timeout':
        await handleTimeout(
          interaction,
          executor,
        );
        break;

      case 'untimeout':
        await handleUntimeout(
          interaction,
          executor,
        );
        break;

      case 'limpar':
        await handlePurge(
          interaction,
          executor,
        );
        break;

      case 'info':
        await handleInfo(
          interaction,
        );
        break;

      default:
        await interaction.reply({
          content:
            '❌ Subcomando de moderação inválido.',
          ephemeral: true,
        });
        break;
    }
  } catch (error) {
    console.error(
      '❌ [MODERATION COMMAND]',
      error,
    );

    await sendError(
      interaction,
      error,
    );
  }
}

/* =========================================================
   WARN
========================================================= */

async function handleWarn(
  interaction: ChatInputCommandInteraction,
  executor: GuildMember,
): Promise<void> {
  if (!interaction.guild) {
    return;
  }

  const target =
    interaction.options.getMember(
      'membro',
    ) as GuildMember | null;

  const reason =
    interaction.options
      .getString(
        'motivo',
        true,
      )
      .trim();

  if (!target) {
    await interaction.reply({
      content:
        '❌ Membro não encontrado no servidor.',
      ephemeral: true,
    });

    return;
  }

  if (
    target.id ===
    executor.id
  ) {
    await interaction.reply({
      content:
        '❌ Você não pode advertir a si mesmo.',
      ephemeral: true,
    });

    return;
  }

  if (
    !canModerateTarget(
      executor,
      target,
    )
  ) {
    await interaction.reply({
      content:
        '❌ Você não pode moderar um membro com cargo igual ou superior ao seu.',
      ephemeral: true,
    });

    return;
  }

  const embed =
    createModerationEmbed(
      COLORS.warning,
      '⚠️ ADVERTÊNCIA REGISTRADA',
      [
        `👤 **Membro:** ${target}`,
        `📝 **Motivo:** ${reason}`,
        `🛡️ **Aplicada por:** ${executor}`,
        '',
        '📋 A advertência foi preparada para persistência no sistema.',
      ].join('\n'),
    );

  await interaction.reply({
    embeds: [embed],
    ephemeral: false,
  });
}

/* =========================================================
   KICK
========================================================= */

async function handleKick(
  interaction: ChatInputCommandInteraction,
  executor: GuildMember,
): Promise<void> {
  const target =
    interaction.options.getMember(
      'membro',
    ) as GuildMember | null;

  const reason =
    interaction.options
      .getString(
        'motivo',
        true,
      )
      .trim();

  if (!target) {
    await interaction.reply({
      content:
        '❌ Membro não encontrado.',
      ephemeral: true,
    });

    return;
  }

  if (
    !canModerateTarget(
      executor,
      target,
    )
  ) {
    await interaction.reply({
      content:
        '❌ Você não pode expulsar este membro.',
      ephemeral: true,
    });

    return;
  }

  if (
    !target.kickable
  ) {
    await interaction.reply({
      content:
        '❌ O bot não possui hierarquia/permissão para expulsar este membro.',
      ephemeral: true,
    });

    return;
  }

  await target.kick(
    reason,
  );

  const embed =
    createModerationEmbed(
      COLORS.danger,
      '🚪 MEMBRO EXPULSO',
      [
        `👤 **Membro:** ${target.user.tag}`,
        `📝 **Motivo:** ${reason}`,
        `🛡️ **Responsável:** ${executor}`,
      ].join('\n'),
    );

  await interaction.reply({
    embeds: [embed],
  });
}

/* =========================================================
   BAN
========================================================= */

async function handleBan(
  interaction: ChatInputCommandInteraction,
  executor: GuildMember,
): Promise<void> {
  const target =
    interaction.options.getMember(
      'membro',
    ) as GuildMember | null;

  const user =
    interaction.options.getUser(
      'membro',
      true,
    );

  const reason =
    interaction.options
      .getString(
        'motivo',
        true,
      )
      .trim();

  const days =
    interaction.options.getInteger(
      'dias',
    ) ?? 0;

  if (
    target &&
    !canModerateTarget(
      executor,
      target,
    )
  ) {
    await interaction.reply({
      content:
        '❌ Você não pode banir este membro.',
      ephemeral: true,
    });

    return;
  }

  if (
    target &&
    !target.bannable
  ) {
    await interaction.reply({
      content:
        '❌ O bot não possui hierarquia/permissão para banir este membro.',
      ephemeral: true,
    });

    return;
  }

  await interaction.guild?.members.ban(
    user.id,
    {
      reason,
      deleteMessageSeconds:
        days * 24 * 60 * 60,
    },
  );

  const embed =
    createModerationEmbed(
      COLORS.danger,
      '🔨 MEMBRO BANIDO',
      [
        `👤 **Membro:** ${user.tag}`,
        `📝 **Motivo:** ${reason}`,
        `🗑️ **Mensagens removidas:** ${days} dia(s)`,
        `🛡️ **Responsável:** ${executor}`,
      ].join('\n'),
    );

  await interaction.reply({
    embeds: [embed],
  });
}

/* =========================================================
   TIMEOUT
========================================================= */

async function handleTimeout(
  interaction: ChatInputCommandInteraction,
  executor: GuildMember,
): Promise<void> {
  const target =
    interaction.options.getMember(
      'membro',
    ) as GuildMember | null;

  const minutes =
    interaction.options.getInteger(
      'minutos',
      true,
    );

  const reason =
    interaction.options
      .getString(
        'motivo',
        true,
      )
      .trim();

  if (!target) {
    await interaction.reply({
      content:
        '❌ Membro não encontrado.',
      ephemeral: true,
    });

    return;
  }

  if (
    !canModerateTarget(
      executor,
      target,
    )
  ) {
    await interaction.reply({
      content:
        '❌ Você não pode aplicar timeout neste membro.',
      ephemeral: true,
    });

    return;
  }

  if (
    !target.moderatable
  ) {
    await interaction.reply({
      content:
        '❌ O bot não possui hierarquia/permissão para aplicar timeout.',
      ephemeral: true,
    });

    return;
  }

  await target.timeout(
    minutes * 60 * 1000,
    reason,
  );

  const embed =
    createModerationEmbed(
      COLORS.warning,
      '🔇 TIMEOUT APLICADO',
      [
        `👤 **Membro:** ${target}`,
        `⏱️ **Duração:** ${minutes} minuto(s)`,
        `📝 **Motivo:** ${reason}`,
        `🛡️ **Responsável:** ${executor}`,
      ].join('\n'),
    );

  await interaction.reply({
    embeds: [embed],
  });
}

/* =========================================================
   UNTIMEOUT
========================================================= */

async function handleUntimeout(
  interaction: ChatInputCommandInteraction,
  executor: GuildMember,
): Promise<void> {
  const target =
    interaction.options.getMember(
      'membro',
    ) as GuildMember | null;

  if (!target) {
    await interaction.reply({
      content:
        '❌ Membro não encontrado.',
      ephemeral: true,
    });

    return;
  }

  if (
    !canModerateTarget(
      executor,
      target,
    )
  ) {
    await interaction.reply({
      content:
        '❌ Você não pode remover o timeout deste membro.',
      ephemeral: true,
    });

    return;
  }

  if (
    !target.moderatable
  ) {
    await interaction.reply({
      content:
        '❌ O bot não possui hierarquia/permissão para alterar este membro.',
      ephemeral: true,
    });

    return;
  }

  await target.timeout(
    null,
    'Timeout removido pela administração.',
  );

  const embed =
    createModerationEmbed(
      COLORS.success,
      '🔊 TIMEOUT REMOVIDO',
      [
        `👤 **Membro:** ${target}`,
        `🛡️ **Responsável:** ${executor}`,
        '',
        '✅ O membro voltou a poder interagir normalmente.',
      ].join('\n'),
    );

  await interaction.reply({
    embeds: [embed],
  });
}

/* =========================================================
   LIMPAR
========================================================= */

async function handlePurge(
  interaction: ChatInputCommandInteraction,
  executor: GuildMember,
): Promise<void> {
  const quantity =
    interaction.options.getInteger(
      'quantidade',
      true,
    );

  const channel =
    interaction.channel;

  if (
    !channel ||
    !channel.isTextBased() ||
    channel.isDMBased()
  ) {
    await interaction.reply({
      content:
        '❌ Este comando precisa ser usado em um canal de texto do servidor.',
      ephemeral: true,
    });

    return;
  }

  if (
    !channel.isThread()
  ) {
    const textChannel =
      channel as TextChannel;

    if (
      !textChannel
        .permissionsFor(
          interaction.guild!.members.me!,
        )
        ?.has(
          PermissionFlagsBits.ManageMessages,
        )
    ) {
      await interaction.reply({
        content:
          '❌ O bot não possui `Gerenciar Mensagens` neste canal.',
        ephemeral: true,
      });

      return;
    }
  }

  const messages =
    await channel.messages.fetch({
      limit:
        Math.min(
          quantity,
          100,
        ),
    });

  if (
    messages.size === 0
  ) {
    await interaction.reply({
      content:
        '⚠️ Nenhuma mensagem encontrada para apagar.',
      ephemeral: true,
    });

    return;
  }

  const deleted =
    await channel.bulkDelete(
      messages,
      true,
    );

  const embed =
    createModerationEmbed(
      COLORS.success,
      '🧹 CANAL LIMPO',
      [
        `🗑️ **Mensagens removidas:** ${deleted.size}`,
        `📍 **Canal:** ${channel}`,
        `🛡️ **Responsável:** ${executor}`,
      ].join('\n'),
    );

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* =========================================================
   INFO
========================================================= */

async function handleInfo(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const target =
    interaction.options.getMember(
      'membro',
    ) as GuildMember | null;

  if (!target) {
    await interaction.reply({
      content:
        '❌ Membro não encontrado.',
      ephemeral: true,
    });

    return;
  }

  const timeout =
    target.communicationDisabledUntilTimestamp;

  const embed =
    createModerationEmbed(
      COLORS.info,
      '🔍 INFORMAÇÕES DE MODERAÇÃO',
      [
        `👤 **Membro:** ${target}`,
        `🆔 **ID:** \`${target.id}\``,
        '',
        `🔨 **Banível pelo bot:** ${
          target.bannable
            ? '✅'
            : '❌'
        }`,
        `🚪 **Expulsável pelo bot:** ${
          target.kickable
            ? '✅'
            : '❌'
        }`,
        `🔇 **Moderável pelo bot:** ${
          target.moderatable
            ? '✅'
            : '❌'
        }`,
        `⏱️ **Timeout atual:** ${
          timeout
            ? `<t:${Math.floor(timeout / 1000)}:F>`
            : 'Nenhum'
        }`,
      ].join('\n'),
    );

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* =========================================================
   HIERARQUIA
========================================================= */

function canModerateTarget(
  executor: GuildMember,
  target: GuildMember,
): boolean {
  if (
    target.id ===
    executor.id
  ) {
    return false;
  }

  if (
    target.id ===
    executor.guild.ownerId
  ) {
    return false;
  }

  return (
    executor.roles.highest.position >
    target.roles.highest.position
  );
}

/* =========================================================
   EMBED
========================================================= */

function createModerationEmbed(
  color: number,
  title: string,
  description: string,
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(description)
    .setFooter({
      text:
        'Ghost Syndicate • Moderação',
    })
    .setTimestamp();
}

/* =========================================================
   ERRO
========================================================= */

async function sendError(
  interaction: ChatInputCommandInteraction,
  error: unknown,
): Promise<void> {
  const message =
    error instanceof Error
      ? error.message
      : 'Não foi possível executar a ação de moderação.';

  if (
    interaction.replied ||
    interaction.deferred
  ) {
    await interaction.followUp({
      content:
        `❌ ${message}`,
      ephemeral: true,
    });

    return;
  }

  await interaction.reply({
    content:
      `❌ ${message}`,
    ephemeral: true,
  });
}
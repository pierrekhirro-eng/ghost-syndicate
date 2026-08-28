// apps/bot/src/commands/rewards.ts

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

export type RewardType =
  | 'MONEY'
  | 'ITEM'
  | 'ROLE'
  | 'BONUS'
  | 'CUSTOM';

export type RewardStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'DELIVERED'
  | 'CANCELLED';

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

export const rewardsCommand =
  new SlashCommandBuilder()
    .setName('premiacao')
    .setDescription(
      'Gerencia as premiações da Ghost Syndicate.',
    )

    /* -------------------------------------------------------
       CRIAR
       IMPORTANTE:
       opções obrigatórias primeiro;
       opcionais depois.
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('criar')
        .setDescription(
          'Cria uma nova premiação.',
        )

        .addUserOption((option) =>
          option
            .setName('membro')
            .setDescription(
              'Membro que receberá a premiação.',
            )
            .setRequired(true),
        )

        .addStringOption((option) =>
          option
            .setName('tipo')
            .setDescription(
              'Tipo da premiação.',
            )
            .setRequired(true)
            .addChoices(
              {
                name: '💰 Dinheiro',
                value: 'MONEY',
              },
              {
                name: '📦 Item',
                value: 'ITEM',
              },
              {
                name: '🎖️ Cargo',
                value: 'ROLE',
              },
              {
                name: '⭐ Bônus',
                value: 'BONUS',
              },
              {
                name: '🎁 Personalizada',
                value: 'CUSTOM',
              },
            ),
        )

        .addStringOption((option) =>
          option
            .setName('nome')
            .setDescription(
              'Nome da premiação.',
            )
            .setRequired(true)
            .setMaxLength(100),
        )

        .addStringOption((option) =>
          option
            .setName('descricao')
            .setDescription(
              'Descrição da premiação.',
            )
            .setRequired(true)
            .setMaxLength(500),
        )

        .addStringOption((option) =>
          option
            .setName('motivo')
            .setDescription(
              'Motivo da premiação.',
            )
            .setRequired(true)
            .setMaxLength(500),
        )

        /* OPCIONAIS FICAM POR ÚLTIMO */

        .addIntegerOption((option) =>
          option
            .setName('valor')
            .setDescription(
              'Valor da premiação em K.',
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
          'Lista as premiações.',
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
                name: 'Aprovadas',
                value: 'APPROVED',
              },
              {
                name: 'Entregues',
                value: 'DELIVERED',
              },
              {
                name: 'Canceladas',
                value: 'CANCELLED',
              },
            ),
        )
        .addUserOption((option) =>
          option
            .setName('membro')
            .setDescription(
              'Filtra por membro.',
            )
            .setRequired(false),
        ),
    )

    /* -------------------------------------------------------
       VER
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('ver')
        .setDescription(
          'Mostra uma premiação específica.',
        )
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription(
              'ID da premiação.',
            )
            .setRequired(true)
            .setMaxLength(50),
        ),
    )

    /* -------------------------------------------------------
       APROVAR
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('aprovar')
        .setDescription(
          'Aprova uma premiação pendente.',
        )
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription(
              'ID da premiação.',
            )
            .setRequired(true)
            .setMaxLength(50),
        ),
    )

    /* -------------------------------------------------------
       ENTREGAR
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('entregar')
        .setDescription(
          'Marca uma premiação como entregue.',
        )
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription(
              'ID da premiação.',
            )
            .setRequired(true)
            .setMaxLength(50),
        )
        .addStringOption((option) =>
          option
            .setName('observacao')
            .setDescription(
              'Observação da entrega.',
            )
            .setRequired(false)
            .setMaxLength(500),
        ),
    )

    /* -------------------------------------------------------
       CANCELAR
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('cancelar')
        .setDescription(
          'Cancela uma premiação.',
        )
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription(
              'ID da premiação.',
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
       HISTÓRICO
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('historico')
        .setDescription(
          'Mostra o histórico de premiações de um membro.',
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

export async function executeRewardsCommand(
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
          : '❌ Você não possui permissão para gerenciar premiações.',
      ephemeral: true,
    });

    return;
  }

  const subcommand =
    interaction.options.getSubcommand();

  try {
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

      case 'aprovar':
        await handleApprove(
          interaction,
          member,
        );
        break;

      case 'entregar':
        await handleDeliver(
          interaction,
        );
        break;

      case 'cancelar':
        await handleCancel(
          interaction,
        );
        break;

      case 'historico':
        await handleHistory(
          interaction,
        );
        break;

      default:
        await interaction.reply({
          content:
            '❌ Subcomando de premiação inválido.',
          ephemeral: true,
        });
        break;
    }
  } catch (error) {
    console.error(
      '❌ [REWARD COMMAND]',
      error,
    );

    await sendError(
      interaction,
      error,
    );
  }
}

/* =========================================================
   CRIAR
========================================================= */

async function handleCreate(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  const target =
    interaction.options.getUser(
      'membro',
      true,
    );

  const type =
    interaction.options.getString(
      'tipo',
      true,
    ) as RewardType;

  const name =
    interaction.options
      .getString(
        'nome',
        true,
      )
      .trim();

  const description =
    interaction.options
      .getString(
        'descricao',
        true,
      )
      .trim();

  const reason =
    interaction.options
      .getString(
        'motivo',
        true,
      )
      .trim();

  const value =
    interaction.options.getInteger(
      'valor',
    ) ?? 0;

  const id =
    `PREM-${Date.now()
      .toString(36)
      .toUpperCase()}`;

  const embed =
    new EmbedBuilder()
      .setColor(
        COLORS.warning,
      )
      .setTitle(
        '🏆 PREMIAÇÃO CRIADA',
      )
      .setDescription(
        [
          `🆔 **ID:** \`${id}\``,
          `👤 **Membro:** ${target}`,
          `🏷️ **Tipo:** ${getRewardTypeLabel(type)}`,
          `🎁 **Prêmio:** ${name}`,
          `📝 **Descrição:** ${description}`,
          `📋 **Motivo:** ${reason}`,
          `💰 **Valor:** ${formatRewardValue(value)}`,
          `📊 **Status:** 🟡 PENDENTE`,
          '',
          `🛡️ **Criada por:** ${member}`,
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Premiações',
      })
      .setTimestamp();

  await interaction.reply({
    embeds: [
      embed,
    ],
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
    ) as RewardStatus | null;

  const target =
    interaction.options.getUser(
      'membro',
    );

  const embed =
    new EmbedBuilder()
      .setColor(
        COLORS.brand,
      )
      .setTitle(
        '🏆 PREMIAÇÕES',
      )
      .setDescription(
        [
          '> Central de premiações da Ghost Syndicate.',
          '',
          `🔎 **Status:** ${getStatusLabel(status)}`,
          `👤 **Membro:** ${
            target
              ? `${target}`
              : 'Todos'
          }`,
          '',
          '📦 Nenhuma premiação persistida foi carregada nesta etapa.',
          '',
          'A integração definitiva com o banco será realizada na etapa de persistência dos módulos.',
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Premiações',
      })
      .setTimestamp();

  await interaction.reply({
    embeds: [
      embed,
    ],
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
    );

  const embed =
    new EmbedBuilder()
      .setColor(
        COLORS.info,
      )
      .setTitle(
        '🏆 DETALHES DA PREMIAÇÃO',
      )
      .setDescription(
        [
          `🆔 **ID:** \`${id}\``,
          '',
          '📋 A consulta detalhada será ligada ao banco durante a integração deste módulo.',
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Premiações',
      })
      .setTimestamp();

  await interaction.reply({
    embeds: [
      embed,
    ],
    ephemeral: true,
  });
}

/* =========================================================
   APROVAR
========================================================= */

async function handleApprove(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  const id =
    interaction.options.getString(
      'id',
      true,
    );

  const embed =
    new EmbedBuilder()
      .setColor(
        COLORS.success,
      )
      .setTitle(
        '✅ PREMIAÇÃO APROVADA',
      )
      .setDescription(
        [
          `🆔 **ID:** \`${id}\``,
          '📊 **Status:** ✅ APROVADA',
          '',
          `🛡️ **Aprovada por:** ${member}`,
          '',
          'A alteração será persistida quando o módulo estiver ligado ao banco.',
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Premiações',
      })
      .setTimestamp();

  await interaction.reply({
    embeds: [
      embed,
    ],
    ephemeral: true,
  });
}

/* =========================================================
   ENTREGAR
========================================================= */

async function handleDeliver(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const id =
    interaction.options.getString(
      'id',
      true,
    );

  const observation =
    interaction.options.getString(
      'observacao',
    ) ??
    'Nenhuma';

  const embed =
    new EmbedBuilder()
      .setColor(
        COLORS.success,
      )
      .setTitle(
        '🎁 PREMIAÇÃO ENTREGUE',
      )
      .setDescription(
        [
          `🆔 **ID:** \`${id}\``,
          '📊 **Status:** ✅ ENTREGUE',
          `📝 **Observação:** ${observation}`,
          '',
          '✅ A entrega foi preparada para persistência.',
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Premiações',
      })
      .setTimestamp();

  await interaction.reply({
    embeds: [
      embed,
    ],
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
    );

  const reason =
    interaction.options
      .getString(
        'motivo',
        true,
      )
      .trim();

  const embed =
    new EmbedBuilder()
      .setColor(
        COLORS.danger,
      )
      .setTitle(
        '❌ PREMIAÇÃO CANCELADA',
      )
      .setDescription(
        [
          `🆔 **ID:** \`${id}\``,
          `📝 **Motivo:** ${reason}`,
          '',
          '📊 **Status:** CANCELADA',
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Premiações',
      })
      .setTimestamp();

  await interaction.reply({
    embeds: [
      embed,
    ],
    ephemeral: true,
  });
}

/* =========================================================
   HISTÓRICO
========================================================= */

async function handleHistory(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const target =
    interaction.options.getUser(
      'membro',
      true,
    );

  const embed =
    new EmbedBuilder()
      .setColor(
        COLORS.info,
      )
      .setTitle(
        '📜 HISTÓRICO DE PREMIAÇÕES',
      )
      .setDescription(
        [
          `👤 **Membro:** ${target}`,
          '',
          '📋 O histórico individual será carregado do banco após a integração deste módulo.',
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Premiações',
      })
      .setTimestamp();

  await interaction.reply({
    embeds: [
      embed,
    ],
    ephemeral: true,
  });
}

/* =========================================================
   LABELS
========================================================= */

function getRewardTypeLabel(
  type: RewardType,
): string {
  switch (type) {
    case 'MONEY':
      return '💰 Dinheiro';

    case 'ITEM':
      return '📦 Item';

    case 'ROLE':
      return '🎖️ Cargo';

    case 'BONUS':
      return '⭐ Bônus';

    case 'CUSTOM':
      return '🎁 Personalizada';

    default:
      return '❓ Desconhecida';
  }
}

function getStatusLabel(
  status:
    | RewardStatus
    | null,
): string {
  switch (status) {
    case 'PENDING':
      return '🟡 Pendentes';

    case 'APPROVED':
      return '✅ Aprovadas';

    case 'DELIVERED':
      return '🎁 Entregues';

    case 'CANCELLED':
      return '❌ Canceladas';

    default:
      return '📋 Todas';
  }
}

function formatRewardValue(
  value: number,
): string {
  if (value <= 0) {
    return 'Não definido';
  }

  return `${value.toLocaleString(
    'pt-BR',
  )} K`;
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
      : 'Não foi possível executar a operação de premiação.';

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
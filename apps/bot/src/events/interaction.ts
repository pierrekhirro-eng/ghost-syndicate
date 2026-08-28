// apps/bot/src/events/interaction.ts

import {
  ButtonInteraction,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Interaction,
} from 'discord.js';

import {
  db,
} from '../services/db.js';

import {
  addMovement,
  ensureGuild,
  ensureMember,
} from '../services/finance.js';

import {
  memberVoiceSeconds,
  topVoice,
} from '../services/voice.js';

import {
  duration,
  money,
} from '../utils/format.js';

/* =========================================================
   COMMAND MODULES
========================================================= */

import {
  executeAdminCommand,
} from '../commands/admin.js';

import {
  executeFinanceCommand,
} from '../commands/finance.js';

import {
  executeOperationsCommand,
} from '../commands/operations.js';

import {
  executeMissionsCommand,
} from '../commands/missions.js';

import {
  executeLoansCommand,
} from '../commands/loans.js';

import {
  executeRankingCommand,
} from '../commands/ranking.js';

import {
  executeRewardsCommand,
} from '../commands/rewards.js';

import {
  executeTicketsCommand,
  handleTicketInteraction,
} from '../commands/tickets.js';

import {
  executeMembersCommand,
} from '../commands/members.js';

import {
  executeConfigCommand,
} from '../commands/config.js';

import {
  executeModerationCommand,
} from '../commands/moderation.js';

/* =========================================================
   INTERACTION PRINCIPAL
========================================================= */

export async function onInteraction(
  interaction: Interaction,
): Promise<void> {
  try {
    if (
      interaction.isChatInputCommand()
    ) {
      await handleCommand(
        interaction,
      );

      return;
    }

    if (
      interaction.isButton()
    ) {
      await handleButton(
        interaction,
      );

      return;
    }
  } catch (error) {
    console.error(
      '❌ [INTERACTION ERROR]',
      error,
    );

    await sendError(
      interaction,
    );
  }
}

/* =========================================================
   COMMAND HANDLER
========================================================= */

async function handleCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (
    !interaction.guild
  ) {
    await safeReply(
      interaction,
      '❌ Este comando só pode ser usado dentro de um servidor.',
      true,
    );

    return;
  }

  const guild =
    interaction.guild;

  /*
   * Garante que o servidor exista na base.
   */

  await ensureGuild(
    guild.id,
    guild.name,
  );

  /*
   * Garante que o usuário exista na base.
   */

  await ensureMember(
    guild.id,
    {
      id:
        interaction.user.id,

      username:
        interaction.user.username,

      displayName:
        interaction.user.globalName ??
        interaction.user.username,
    },
  );

  /* =======================================================
     COMANDOS
  ======================================================= */

  switch (
    interaction.commandName
  ) {

    /* -------------------------------------------------------
       CAIXA
    ------------------------------------------------------- */

    case 'caixa':
      await handleCaixa(
        interaction,
      );
      break;

    /* -------------------------------------------------------
       ENTRADA
    ------------------------------------------------------- */

    case 'entrada':
      await handleMovement(
        interaction,
        'IN',
      );
      break;

    /* -------------------------------------------------------
       SAÍDA
    ------------------------------------------------------- */

    case 'saida':
      await handleMovement(
        interaction,
        'OUT',
      );
      break;

    /* -------------------------------------------------------
       FINANCEIRO
    ------------------------------------------------------- */

    case 'financeiro':
      await executeFinanceCommand(
        interaction,
      );
      break;

    /* -------------------------------------------------------
       VOZ
    ------------------------------------------------------- */

    case 'horas':
      await handleHoras(
        interaction,
      );
      break;

    case 'ranking-voz':
      await handleRankingVoz(
        interaction,
      );
      break;

    /* -------------------------------------------------------
       ADMIN
    ------------------------------------------------------- */

    case 'admin':
      await executeAdminCommand(
        interaction,
      );
      break;

    case 'config':
      await executeConfigCommand(
        interaction,
      );
      break;

    case 'membro':
      await executeMembersCommand(
        interaction,
      );
      break;

    case 'moderacao':
      await executeModerationCommand(
        interaction,
      );
      break;

    /* -------------------------------------------------------
       OPERAÇÕES
    ------------------------------------------------------- */

    case 'operacao':
      await executeOperationsCommand(
        interaction,
      );
      break;

    /* -------------------------------------------------------
       MISSÕES
    ------------------------------------------------------- */

    case 'missao':
      await executeMissionsCommand(
        interaction,
      );
      break;

    /* -------------------------------------------------------
       EMPRÉSTIMOS
    ------------------------------------------------------- */

    case 'emprestimo':
      await executeLoansCommand(
        interaction,
      );
      break;

    /* -------------------------------------------------------
       RANKING
    ------------------------------------------------------- */

    case 'ranking':
      await executeRankingCommand(
        interaction,
      );
      break;

    /* -------------------------------------------------------
       PREMIAÇÕES
    ------------------------------------------------------- */

    case 'premiacao':
      await executeRewardsCommand(
        interaction,
      );
      break;

    /* -------------------------------------------------------
       TICKET
    ------------------------------------------------------- */

    case 'ticket':
      await executeTicketsCommand(
        interaction,
      );
      break;

    /* -------------------------------------------------------
       DESCONHECIDO
    ------------------------------------------------------- */

    default:
      await safeReply(
        interaction,
        '❌ Comando não encontrado.',
        true,
      );
      break;
  }
}

/* =========================================================
   CAIXA
========================================================= */

async function handleCaixa(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (
    !interaction.guild
  ) {
    return;
  }

  const guild =
    await db.guild.findUnique({
      where: {
        id:
          interaction.guild.id,
      },
    });

  if (!guild) {
    await safeReply(
      interaction,
      '❌ O caixa ainda não foi configurado.',
      true,
    );

    return;
  }

  const embed =
    new EmbedBuilder()
      .setColor(
        0x7c5cff,
      )
      .setTitle(
        '🏦 CAIXA • GHOST SYNDICATE',
      )
      .setDescription(
        [
          '> Controle financeiro oficial da Ghost Syndicate.',
          '',
          `💰 **Saldo atual:** ${money(
            guild.cashBalance,
          )}`,
          '',
          `🎯 **Meta diária:** ${
            guild.dailyGoal > 0
              ? money(
                  guild.dailyGoal,
                )
              : 'Não definida'
          }`,
          '',
          `🛡️ **Reserva:** ${
            guild.reserve > 0
              ? money(
                  guild.reserve,
                )
              : 'Não definida'
          }`,
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Controle Financeiro',
      })
      .setTimestamp();

  await safeReply(
    interaction,
    embed,
  );
}

/* =========================================================
   MOVIMENTAÇÃO
========================================================= */

async function handleMovement(
  interaction: ChatInputCommandInteraction,
  type:
    | 'IN'
    | 'OUT',
): Promise<void> {
  if (
    !interaction.guild
  ) {
    return;
  }

  const amount =
    interaction.options.getInteger(
      'valor',
      true,
    );

  const reason =
    interaction.options
      .getString(
        'motivo',
        true,
      )
      .trim();

  if (
    amount <= 0
  ) {
    await safeReply(
      interaction,
      '❌ O valor precisa ser maior que **0**.',
      true,
    );

    return;
  }

  if (
    reason.length < 2
  ) {
    await safeReply(
      interaction,
      '❌ Informe um motivo válido.',
      true,
    );

    return;
  }

  try {
    const updatedGuild =
      await addMovement(
        interaction.guild.id,
        interaction.user.id,
        type,
        amount,
        reason,
        interaction.user.tag,
      );

    const isEntrada =
      type === 'IN';

    const embed =
      new EmbedBuilder()
        .setColor(
          isEntrada
            ? 0x35d39a
            : 0xf15b6b,
        )
        .setTitle(
          isEntrada
            ? '📥 ENTRADA REGISTRADA'
            : '📤 SAÍDA REGISTRADA',
        )
        .setDescription(
          isEntrada
            ? '> Um novo valor foi adicionado ao caixa.'
            : '> Um valor foi retirado do caixa.',
        )
        .addFields(
          {
            name:
              '💵 VALOR',
            value:
              `**${money(
                amount,
              )}**`,
            inline:
              true,
          },
          {
            name:
              '📝 MOTIVO',
            value:
              reason,
            inline:
              true,
          },
          {
            name:
              '🏦 NOVO SALDO',
            value:
              `**${money(
                updatedGuild.cashBalance,
              )}**`,
            inline:
              true,
          },
          {
            name:
              '👤 RESPONSÁVEL',
            value:
              `${interaction.user}`,
            inline:
              false,
          },
        )
        .setFooter({
          text:
            'Ghost Syndicate • Controle Financeiro',
        })
        .setTimestamp();

    await safeReply(
      interaction,
      embed,
    );
  } catch (error) {
    console.error(
      '❌ [MOVEMENT]',
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : 'Não foi possível registrar a movimentação.';

    await safeReply(
      interaction,
      `❌ ${message}`,
      true,
    );
  }
}

/* =========================================================
   HORAS
========================================================= */

async function handleHoras(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (
    !interaction.guild
  ) {
    return;
  }

  const seconds =
    await memberVoiceSeconds(
      interaction.guild.id,
      interaction.user.id,
    );

  const embed =
    new EmbedBuilder()
      .setColor(
        0x8b5cf6,
      )
      .setTitle(
        '🎙️ SUAS HORAS EM CALL',
      )
      .setDescription(
        [
          `> **${interaction.user.displayName}**`,
          '',
          'Seu tempo registrado em canais de voz:',
          '',
          `# ${duration(
            seconds,
          )}`,
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Voice Tracker',
      })
      .setTimestamp();

  await safeReply(
    interaction,
    embed,
  );
}

/* =========================================================
   RANKING DE VOZ
========================================================= */

async function handleRankingVoz(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (
    !interaction.guild
  ) {
    return;
  }

  const ranking =
    await topVoice(
      interaction.guild.id,
      10,
    );

  const embed =
    new EmbedBuilder()
      .setColor(
        0x8b5cf6,
      )
      .setTitle(
        '🎙️ RANKING DE HORAS EM CALL',
      )
      .setFooter({
        text:
          'Ghost Syndicate • Voice Tracker',
      })
      .setTimestamp();

  if (
    ranking.length === 0
  ) {
    embed.setDescription(
      [
        '> Ainda não existem registros de tempo em call.',
      ].join('\n'),
    );

    await safeReply(
      interaction,
      embed,
    );

    return;
  }

  const medals = [
    '🥇',
    '🥈',
    '🥉',
  ];

  const description =
    ranking
      .map(
        (
          member,
          index,
        ) => {
          const prefix =
            medals[index] ??
            `**${index + 1}.**`;

          return (
            `${prefix} **${member.name}** — ` +
            `\`${duration(
              member.seconds,
            )}\``
          );
        },
      )
      .join('\n');

  embed.setDescription(
    [
      '> Os membros com maior tempo acumulado:',
      '',
      description,
    ].join('\n'),
  );

  await safeReply(
    interaction,
    embed,
  );
}

/* =========================================================
   BOTÕES
========================================================= */

async function handleButton(
  interaction: ButtonInteraction,
): Promise<void> {
  /*
   * TODO botão de ticket:
   *
   * ticket:create
   * ticket:info
   * ticket:assume
   * ticket:status
   * ticket:setstatus:...
   * ticket:priority
   * ticket:setpriority:...
   * ticket:transcript
   * ticket:close
   *
   * Tudo passa pelo módulo central de tickets.
   */

  if (
    interaction.customId.startsWith(
      'ticket:',
    )
  ) {
    await handleTicketInteraction(
      interaction,
    );

    return;
  }

  await safeReply(
    interaction,
    '❌ Ação não reconhecida.',
    true,
  );
}

/* =========================================================
   SAFE REPLY
========================================================= */

async function safeReply(
  interaction:
    | ChatInputCommandInteraction
    | ButtonInteraction,

  content:
    | string
    | EmbedBuilder,

  ephemeral = false,
): Promise<void> {
  /*
   * INTERACTION JÁ RESPONDIDA
   */

  if (
    interaction.replied
  ) {
    if (
      typeof content ===
      'string'
    ) {
      await interaction.followUp({
        content,
        ephemeral,
      });
    } else {
      await interaction.followUp({
        embeds: [
          content,
        ],
        ephemeral,
      });
    }

    return;
  }

  /*
   * INTERACTION DEFERRED
   */

  if (
    interaction.deferred
  ) {
    if (
      typeof content ===
      'string'
    ) {
      await interaction.editReply({
        content,
      });
    } else {
      await interaction.editReply({
        embeds: [
          content,
        ],
      });
    }

    return;
  }

  /*
   * RESPOSTA NORMAL
   */

  if (
    typeof content ===
    'string'
  ) {
    await interaction.reply({
      content,
      ephemeral,
    });

    return;
  }

  await interaction.reply({
    embeds: [
      content,
    ],
    ephemeral,
  });
}

/* =========================================================
   ERROR HANDLER
========================================================= */

async function sendError(
  interaction: Interaction,
): Promise<void> {
  const message =
    '❌ Ocorreu um erro ao processar esta ação.';

  try {
    if (
      !interaction.isChatInputCommand() &&
      !interaction.isButton()
    ) {
      return;
    }

    if (
      interaction.replied
    ) {
      await interaction.followUp({
        content:
          message,
        ephemeral:
          true,
      });

      return;
    }

    if (
      interaction.deferred
    ) {
      await interaction.editReply({
        content:
          message,
      });

      return;
    }

    await interaction.reply({
      content:
        message,
      ephemeral:
        true,
    });
  } catch (error) {
    console.error(
      '❌ [ERROR REPLY]',
      error,
    );
  }
}
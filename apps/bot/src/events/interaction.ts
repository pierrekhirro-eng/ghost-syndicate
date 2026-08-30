// apps/bot/src/events/interaction.ts

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Interaction,
} from 'discord.js';

import { db } from '../services/db.js';

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

import {
  executeAdminCommand,
} from '../commands/admin.js';

import {
  handleTicketSetup,
  handleTicketButton,
} from '../commands/tickets.js';

/* =========================================================
   INTERACTION PRINCIPAL
========================================================= */

export async function onInteraction(
  interaction: Interaction,
): Promise<void> {
  try {
    /* =======================================================
       SLASH COMMANDS
    ======================================================= */

    if (
      interaction.isChatInputCommand()
    ) {
      await handleCommand(
        interaction,
      );

      return;
    }

    /* =======================================================
       BOTÕES
    ======================================================= */

    if (
      interaction.isButton()
    ) {
      /*
       * Todos os botões relacionados ao sistema de tickets
       * usam o tickets.ts.
       *
       * Outros botões que eventualmente existirem no bot
       * não devem cair no sistema de tickets.
       */

      if (
        interaction.customId.startsWith(
          'ticket:',
        )
      ) {
        await handleTicketButton(
          interaction,
        );

        return;
      }

      await handleUnknownButton(
        interaction,
      );

      return;
    }
  } catch (
    error
  ) {
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
   COMANDOS
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

  /* =======================================================
     GARANTE GUILD
  ======================================================= */

  await ensureGuild(
    interaction.guild.id,
    interaction.guild.name,
  );

  /* =======================================================
     GARANTE MEMBRO
  ======================================================= */

  await ensureMember(
    interaction.guild.id,
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
     ROTEAMENTO
  ======================================================= */

  switch (
    interaction.commandName
  ) {
    case 'caixa':
      await handleCaixa(
        interaction,
      );

      break;

    case 'entrada':
      await handleMovement(
        interaction,
        'IN',
      );

      break;

    case 'saida':
      await handleMovement(
        interaction,
        'OUT',
      );

      break;

    case 'emprestimo':
      await handleEmprestimo(
        interaction,
      );

      break;

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

    case 'ticket-setup':
      await handleTicketSetup(
        interaction,
      );

      break;

    case 'admin':
      await executeAdminCommand(
        interaction,
      );

      break;

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

  if (
    !guild
  ) {
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
        '> Controle financeiro oficial da Ghost Syndicate.',
      )
      .addFields(
        {
          name:
            '💰 SALDO ATUAL',

          value:
            `**${money(
              guild.cashBalance,
            )}**`,

          inline:
            true,
        },

        {
          name:
            '🎯 META DIÁRIA',

          value:
            guild.dailyGoal > 0
              ? `**${money(
                  guild.dailyGoal,
                )}**`
              : '**Não definida**',

          inline:
            true,
        },

        {
          name:
            '🛡️ RESERVA',

          value:
            guild.reserve > 0
              ? `**${money(
                  guild.reserve,
                )}**`
              : '**Não definida**',

          inline:
            true,
        },
      )
      .setFooter({
        text:
          'Ghost Syndicate • Organização • Lealdade • Resultado',
      })
      .setTimestamp();

  await safeReply(
    interaction,
    embed,
  );
}

/* =========================================================
   ENTRADA / SAÍDA
========================================================= */

async function handleMovement(
  interaction: ChatInputCommandInteraction,
  type: 'IN' | 'OUT',
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
      type ===
      'IN';

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
            ? '> Um novo valor foi adicionado ao caixa da Ghost Syndicate.'
            : '> Um valor foi retirado do caixa da Ghost Syndicate.',
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
  } catch (
    error
  ) {
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
   EMPRÉSTIMO
========================================================= */

async function handleEmprestimo(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  await safeReply(
    interaction,
    [
      '💳 **SISTEMA DE EMPRÉSTIMOS**',
      '',
      'O comando foi registrado corretamente.',
      'A lógica completa de empréstimos será integrada ao módulo financeiro.',
    ].join(
      '\n',
    ),
    true,
  );
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
        ].join(
          '\n',
        ),
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
   RANKING
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

  const publicUrl =
    (
      process.env.WEB_PUBLIC_URL ??
      `http://localhost:${
        process.env.WEB_PORT ??
        '3010'
      }`
    ).replace(
      /\/$/,
      '',
    );

  const rankingUrl =
    `${publicUrl}/ranking`;

  const embed =
    new EmbedBuilder()
      .setColor(
        0x43ff98,
      )
      .setAuthor({
        name:
          'GHOST SYNDICATE • VOICE TRACKER',
      })
      .setTitle(
        '🎙️ RANKING DE HORAS EM CALL',
      )
      .setDescription(
        [
          '> 🟢 **Acompanhamento de atividade em voz**',
          '',
          'O ranking considera o tempo total acumulado em canais de voz.',
          'Quem estiver em call agora continua acumulando tempo em tempo real.',
        ].join(
          '\n',
        ),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Ranking oficial • Atualização em tempo real',
      })
      .setTimestamp();

  /* =======================================================
     SEM REGISTROS
  ======================================================= */

  if (
    ranking.length === 0
  ) {
    embed.addFields({
      name:
        '📊 STATUS',

      value:
        'Ainda não existem registros de tempo em call.\nEntre em uma call e o ranking será atualizado automaticamente.',
    });

    const row =
      new ActionRowBuilder<ButtonBuilder>()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              'ranking:web',
            )
            .setLabel(
              'Abrir Ranking',
            )
            .setEmoji(
              '🌐',
            )
            .setStyle(
              ButtonStyle.Link,
            )
            .setURL(
              rankingUrl,
            ),
        );

    await interaction.reply({
      embeds: [
        embed,
      ],

      components: [
        row,
      ],
    });

    return;
  }

  /* =======================================================
     MEDALHAS
  ======================================================= */

  const medals = [
    '🥇',
    '🥈',
    '🥉',
  ];

  /* =======================================================
     ATIVOS
  ======================================================= */

  const liveCount =
    ranking.filter(
      (
        member,
      ) =>
        member.active,
    ).length;

  /* =======================================================
     TEXTO
  ======================================================= */

  const rankingText =
    ranking
      .map(
        (
          member,
          index,
        ) => {

          const prefix =
            medals[index] ??
            `**${index + 1}.**`;

          const live =
            member.active
              ? ' 🟢'
              : '';

          return (
            `${prefix} **${member.name}**${live} — ` +
            `\`${duration(
              member.seconds,
            )}\``
          );
        },
      )
      .join(
        '\n',
      );

  const leader =
    ranking[0];

  embed.addFields(
    {
      name:
        '🏆 LÍDER ATUAL',

      value:
        [
          `**${leader.name}**`,
          `⏱️ \`${duration(
            leader.seconds,
          )}\``,

          leader.active
            ? '🟢 **AO VIVO NA CALL**'
            : '⚪ Fora da call no momento',
        ].join(
          '\n',
        ),

      inline:
        true,
    },

    {
      name:
        '🟢 ATIVIDADE AGORA',

      value:
        `**${liveCount}** membro(s) em call`,

      inline:
        true,
    },

    {
      name:
        '📊 CLASSIFICAÇÃO',

      value:
        rankingText,

      inline:
        false,
    },
  );

  const row =
    new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            'ranking:web',
          )
          .setLabel(
            'Abrir Ranking Completo',
          )
          .setEmoji(
            '🎙️',
          )
          .setStyle(
            ButtonStyle.Link,
          )
          .setURL(
            rankingUrl,
          ),
      );

  await interaction.reply({
    embeds: [
      embed,
    ],

    components: [
      row,
    ],
  });
}

/* =========================================================
   BOTÃO DESCONHECIDO
========================================================= */

async function handleUnknownButton(
  interaction: ButtonInteraction,
): Promise<void> {
  /*
   * Botões que não pertencem ao sistema de tickets
   * não devem quebrar a interação.
   *
   * O ranking usa LinkButton e normalmente não chega aqui.
   */

  if (
    interaction.customId ===
    'ranking:web'
  ) {
    return;
  }

  await safeReply(
    interaction,
    '❌ Essa ação não está disponível.',
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
  /* =======================================================
     TEXTO
  ======================================================= */

  if (
    typeof content ===
    'string'
  ) {
    if (
      interaction.replied
    ) {
      await interaction.followUp({
        content,
        ephemeral,
      });

      return;
    }

    if (
      interaction.deferred
    ) {
      await interaction.editReply({
        content,
      });

      return;
    }

    await interaction.reply({
      content,
      ephemeral,
    });

    return;
  }

  /* =======================================================
     EMBED
  ======================================================= */

  if (
    interaction.replied
  ) {
    await interaction.followUp({
      embeds: [
        content,
      ],

      ephemeral,
    });

    return;
  }

  if (
    interaction.deferred
  ) {
    await interaction.editReply({
      embeds: [
        content,
      ],
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
  } catch (
    error
  ) {
    console.error(
      '❌ [ERROR REPLY]',
      error,
    );
  }
}
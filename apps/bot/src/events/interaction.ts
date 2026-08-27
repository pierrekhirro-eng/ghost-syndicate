// apps/bot/src/events/interaction.ts

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  Interaction,
  PermissionFlagsBits,
  TextChannel,
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
  createTranscript,
} from '../services/transcript.js';

import {
  duration,
  money,
} from '../utils/format.js';

import {
  config,
} from '../utils/config.js';

import {
  executeAdminCommand,
} from '../commands/admin.js';

/* =========================================================
   INTERACTION PRINCIPAL
========================================================= */

export async function onInteraction(
  interaction: Interaction,
): Promise<void> {
  try {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleButton(interaction);
      return;
    }
  } catch (error) {
    console.error(
      '❌ [INTERACTION ERROR]',
      error,
    );

    await sendError(interaction);
  }
}

/* =========================================================
   COMMANDS
========================================================= */

async function handleCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) {
    await safeReply(
      interaction,
      '❌ Este comando só pode ser usado dentro de um servidor.',
      true,
    );

    return;
  }

  await ensureGuild(
    interaction.guild.id,
    interaction.guild.name,
  );

  await ensureMember(
    interaction.guild.id,
    {
      id: interaction.user.id,
      username: interaction.user.username,
      displayName:
        interaction.user.globalName ??
        interaction.user.username,
    },
  );

  switch (interaction.commandName) {
    case 'caixa':
      await handleCaixa(interaction);
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
      await handleHoras(interaction);
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
  if (!interaction.guild) {
    return;
  }

  const guild =
    await db.guild.findUnique({
      where: {
        id: interaction.guild.id,
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
      .setColor(0x7c5cff)
      .setTitle(
        '🏦 CAIXA • GHOST SYNDICATE',
      )
      .setDescription(
        '> Controle financeiro oficial da Ghost Syndicate.',
      )
      .addFields(
        {
          name: '💰 SALDO ATUAL',
          value:
            `**${money(guild.cashBalance)}**`,
          inline: true,
        },
        {
          name: '🎯 META DIÁRIA',
          value:
            guild.dailyGoal > 0
              ? `**${money(guild.dailyGoal)}**`
              : '**Não definida**',
          inline: true,
        },
        {
          name: '🛡️ RESERVA',
          value:
            guild.reserve > 0
              ? `**${money(guild.reserve)}**`
              : '**Não definida**',
          inline: true,
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
  if (!interaction.guild) {
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

  if (amount <= 0) {
    await safeReply(
      interaction,
      '❌ O valor precisa ser maior que **0**.',
      true,
    );

    return;
  }

  if (reason.length < 2) {
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
            ? '> Um novo valor foi adicionado ao caixa da Ghost Syndicate.'
            : '> Um valor foi retirado do caixa da Ghost Syndicate.',
        )
        .addFields(
          {
            name: '💵 VALOR',
            value:
              `**${money(amount)}**`,
            inline: true,
          },
          {
            name: '📝 MOTIVO',
            value: reason,
            inline: true,
          },
          {
            name: '🏦 NOVO SALDO',
            value:
              `**${money(updatedGuild.cashBalance)}**`,
            inline: true,
          },
          {
            name: '👤 RESPONSÁVEL',
            value:
              `${interaction.user}`,
            inline: false,
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
      'A lógica completa de empréstimos será integrada na próxima etapa do módulo financeiro.',
    ].join('\n'),
    true,
  );
}

/* =========================================================
   HORAS EM CALL
========================================================= */

async function handleHoras(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) {
    return;
  }

  const seconds =
    await memberVoiceSeconds(
      interaction.guild.id,
      interaction.user.id,
    );

  const embed =
    new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(
        '🎙️ SUAS HORAS EM CALL',
      )
      .setDescription(
        [
          `> **${interaction.user.displayName}**`,
          '',
          'Seu tempo registrado em canais de voz:',
          '',
          `# ${duration(seconds)}`,
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
  if (!interaction.guild) {
    return;
  }

  const ranking =
    await topVoice(
      interaction.guild.id,
      10,
    );

  const embed =
    new EmbedBuilder()
      .setColor(0x8b5cf6)
      .setTitle(
        '🎙️ RANKING DE HORAS EM CALL',
      )
      .setFooter({
        text:
          'Ghost Syndicate • Voice Tracker',
      })
      .setTimestamp();

  if (ranking.length === 0) {
    embed.setDescription(
      '> Ainda não existem registros de tempo em call.',
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
        (member, index) => {
          const prefix =
            medals[index] ??
            `**${index + 1}.**`;

          return (
            `${prefix} **${member.name}** — ` +
            `\`${duration(member.seconds)}\``
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
   TICKET SETUP
========================================================= */

async function handleTicketSetup(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const embed =
    new EmbedBuilder()
      .setColor(0x7c5cff)
      .setTitle(
        '🎫 CENTRAL DE ATENDIMENTO',
      )
      .setDescription(
        [
          '> Precisa de ajuda?',
          '',
          'Abra um ticket privado com a equipe da **Ghost Syndicate**.',
          '',
          '🔒 Atendimento privado',
          '📋 Organização',
          '📜 Transcript automático',
          '⚡ Atendimento pela equipe',
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Central de Atendimento',
      })
      .setTimestamp();

  const row =
    new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            'ticket:create',
          )
          .setLabel(
            'Abrir Ticket',
          )
          .setEmoji('🎫')
          .setStyle(
            ButtonStyle.Primary,
          ),
      );

  await interaction.reply({
    embeds: [embed],
    components: [row],
  });
}

/* =========================================================
   BUTTONS
========================================================= */

async function handleButton(
  interaction: ButtonInteraction,
): Promise<void> {
  switch (
    interaction.customId
  ) {
    case 'ticket:create':
      await createTicket(
        interaction,
      );
      break;

    case 'ticket:close':
      await closeTicket(
        interaction,
      );
      break;

    default:
      await safeReply(
        interaction,
        '❌ Ação não reconhecida.',
        true,
      );
      break;
  }
}

/* =========================================================
   CREATE TICKET
========================================================= */

async function createTicket(
  interaction: ButtonInteraction,
): Promise<void> {
  const guild =
    interaction.guild;

  if (!guild) {
    await safeReply(
      interaction,
      '❌ Servidor não encontrado.',
      true,
    );

    return;
  }

  const safeUsername =
    interaction.user.username
      .toLowerCase()
      .replace(
        /[^a-z0-9-]/g,
        '',
      )
      .slice(0, 18);

  const channelName =
    `ticket-${
      safeUsername ||
      interaction.user.id.slice(-6)
    }`;

  const existingChannel =
    guild.channels.cache.find(
      (channel) =>
        channel.type ===
          ChannelType.GuildText &&
        channel.name ===
          channelName,
    );

  if (existingChannel) {
    await safeReply(
      interaction,
      `⚠️ Você já possui um ticket aberto: ${existingChannel}`,
      true,
    );

    return;
  }

  const permissionOverwrites =
    [
      {
        id:
          guild.roles.everyone.id,
        deny: [
          PermissionFlagsBits.ViewChannel,
        ],
      },
      {
        id:
          interaction.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.AttachFiles,
          PermissionFlagsBits.EmbedLinks,
        ],
      },
    ];

  /*
   * 👑 LIDERANÇA
   */

  if (
    config.roles.leadershipId
  ) {
    permissionOverwrites.push({
      id:
        config.roles.leadershipId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    });
  }

  /*
   * 💰 FINANCEIRO
   */

  if (
    config.roles.financeId
  ) {
    permissionOverwrites.push({
      id:
        config.roles.financeId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    });
  }

  /*
   * 🎯 OPERAÇÕES
   */

  if (
    config.roles.operationsId
  ) {
    permissionOverwrites.push({
      id:
        config.roles.operationsId,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    });
  }

  const channel =
    await guild.channels.create(
      {
        name: channelName,
        type:
          ChannelType.GuildText,
        parent:
          config.tickets
            .categoryId ||
          undefined,
        permissionOverwrites,
      },
    );

  const ticketEmbed =
    new EmbedBuilder()
      .setColor(0x7c5cff)
      .setTitle(
        '🎫 TICKET ABERTO',
      )
      .setDescription(
        [
          `Olá ${interaction.user}, seu atendimento foi criado.`,
          '',
          '📝 Explique detalhadamente o que você precisa.',
          '👥 Nossa equipe irá assumir o atendimento.',
          '📜 Ao finalizar, um transcript será gerado automaticamente.',
        ].join('\n'),
      )
      .addFields(
        {
          name: '👤 ABERTO POR',
          value:
            `${interaction.user}`,
          inline: true,
        },
        {
          name: '🕐 ABERTO EM',
          value:
            `<t:${Math.floor(
              Date.now() / 1000,
            )}:F>`,
          inline: true,
        },
      )
      .setFooter({
        text:
          'Ghost Syndicate • Atendimento',
      })
      .setTimestamp();

  const closeRow =
    new ActionRowBuilder<ButtonBuilder>()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            'ticket:close',
          )
          .setLabel(
            'Fechar Ticket',
          )
          .setEmoji('🔒')
          .setStyle(
            ButtonStyle.Danger,
          ),
      );

  await (
    channel as TextChannel
  ).send({
    content:
      `<@${interaction.user.id}>`,
    embeds: [
      ticketEmbed,
    ],
    components: [
      closeRow,
    ],
  });

  await safeReply(
    interaction,
    `✅ Ticket criado com sucesso: ${channel}`,
    true,
  );
}

/* =========================================================
   CLOSE TICKET
========================================================= */

async function closeTicket(
  interaction: ButtonInteraction,
): Promise<void> {
  const channel =
    interaction.channel;

  if (
    !channel ||
    channel.type !==
      ChannelType.GuildText
  ) {
    await safeReply(
      interaction,
      '❌ Este botão precisa estar em um canal de texto.',
      true,
    );

    return;
  }

  const textChannel =
    channel as TextChannel;

  await interaction.reply({
    content:
      '🔒 **Encerrando ticket...**\n📜 Gerando transcript...',
  });

  try {
    const transcriptPath =
      await createTranscript(
        textChannel,
        interaction.user.tag,
      );

    console.log(
      `[TRANSCRIPT] ${textChannel.name} -> ${transcriptPath}`,
    );

    await interaction.editReply({
      content:
        '✅ **Ticket encerrado com sucesso.**\n' +
        '📜 O transcript foi gerado e enviado ao canal configurado.',
    });

    setTimeout(
      () => {
        textChannel
          .delete(
            'Ticket encerrado e transcript gerado',
          )
          .catch(
            (error) => {
              console.error(
                '❌ [TICKET DELETE]',
                error,
              );
            },
          );
      },
      2500,
    );
  } catch (error) {
    console.error(
      '❌ [TRANSCRIPT ERROR]',
      error,
    );

    await interaction.editReply({
      content:
        '⚠️ O ticket será fechado, mas ocorreu um erro ao gerar o transcript.',
    });

    setTimeout(
      () => {
        textChannel
          .delete(
            'Ticket encerrado após erro no transcript',
          )
          .catch(() => {});
      },
      2500,
    );
  }
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
  if (
    typeof content ===
    'string'
  ) {
    if (
      interaction.replied
    ) {
      await interaction.followUp(
        {
          content,
          ephemeral,
        },
      );

      return;
    }

    if (
      interaction.deferred
    ) {
      await interaction.editReply(
        {
          content,
        },
      );

      return;
    }

    await interaction.reply({
      content,
      ephemeral,
    });

    return;
  }

  if (
    interaction.replied
  ) {
    await interaction.followUp(
      {
        embeds: [
          content,
        ],
        ephemeral,
      },
    );

    return;
  }

  if (
    interaction.deferred
  ) {
    await interaction.editReply(
      {
        embeds: [
          content,
        ],
      },
    );

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
      await interaction.followUp(
        {
          content: message,
          ephemeral: true,
        },
      );

      return;
    }

    if (
      interaction.deferred
    ) {
      await interaction.editReply(
        {
          content: message,
        },
      );

      return;
    }

    await interaction.reply(
      {
        content: message,
        ephemeral: true,
      },
    );
  } catch (error) {
    console.error(
      '❌ [ERROR REPLY]',
      error,
    );
  }
}
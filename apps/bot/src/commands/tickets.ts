// apps/bot/src/commands/tickets.ts

import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';

import path from 'node:path';
import fs from 'node:fs';

import {
  createTranscript,
} from '../services/transcript.js';

import {
  db,
} from '../services/db.js';

import {
  config,
} from '../utils/config.js';

/* =========================================================
   TIPOS
========================================================= */

type TicketType =
  | 'SUPORTE'
  | 'FINANCEIRO';

type TicketConfig = {
  ticketsEnabled: boolean;

  ticketTitle: string;
  ticketDescription: string;
  ticketWelcomeText: string;

  ticketOpenButtonLabel: string;
  ticketOpenButtonEmoji: string;

  ticketHowButtonLabel: string;
  ticketHowButtonEmoji: string;

  ticketFinanceButtonLabel: string;
  ticketFinanceButtonEmoji: string;

  ticketCategoryId: string | null;
  transcriptChannelId: string | null;

  ownerRoleId: string | null;
  adminRoleId: string | null;
  recruitRoleId: string | null;
  financeRoleId: string | null;
  operationsRoleId: string | null;
};

/* =========================================================
   CORES
========================================================= */

const COLORS = {
  primary: 0x43ff98,
  secondary: 0x7c5cff,
  danger: 0xf15b6b,
  warning: 0xffb347,
  finance: 0x35d39a,
} as const;

/* =========================================================
   PADRÕES
========================================================= */

const DEFAULTS: Omit<
  TicketConfig,
  'ticketCategoryId' |
  'transcriptChannelId' |
  'ownerRoleId' |
  'adminRoleId' |
  'recruitRoleId' |
  'financeRoleId' |
  'operationsRoleId'
> = {
  ticketsEnabled: true,

  ticketTitle:
    'CENTRAL DE ATENDIMENTO',

  ticketDescription:
    'Precisa de ajuda? Abra um atendimento privado com a equipe da Ghost Syndicate.',

  ticketWelcomeText:
    'Olá {user}, seu atendimento foi aberto. Explique abaixo o que você precisa e aguarde nossa equipe.',

  ticketOpenButtonLabel:
    'Abrir Atendimento',

  ticketOpenButtonEmoji:
    '📩',

  ticketHowButtonLabel:
    'Como funciona',

  ticketHowButtonEmoji:
    '❓',

  ticketFinanceButtonLabel:
    'Financeiro',

  ticketFinanceButtonEmoji:
    '💰',
};

/* =========================================================
   TEXTO SEGURO
========================================================= */

function safeString(
  value: unknown,
  fallback: string,
): string {
  if (
    typeof value !==
    'string'
  ) {
    return fallback;
  }

  const clean =
    value.trim();

  return (
    clean ||
    fallback
  );
}

/* =========================================================
   CONFIGURAÇÃO PERSISTENTE
========================================================= */

async function getTicketConfig(
  guildId: string,
): Promise<TicketConfig> {
  const saved =
    await db.guildConfig.findUnique({
      where: {
        guildId,
      },
    });

  /*
   * O banco é a fonte principal.
   *
   * O config.ts fica apenas como
   * fallback de compatibilidade para
   * instalações antigas.
   */
  return {
    ticketsEnabled:
      typeof saved?.ticketsEnabled ===
      'boolean'
        ? saved.ticketsEnabled
        : DEFAULTS.ticketsEnabled,

    ticketTitle:
      safeString(
        saved?.ticketTitle,
        DEFAULTS.ticketTitle,
      ),

    ticketDescription:
      safeString(
        saved?.ticketDescription,
        DEFAULTS.ticketDescription,
      ),

    ticketWelcomeText:
      safeString(
        saved?.ticketWelcomeText,
        DEFAULTS.ticketWelcomeText,
      ),

    ticketOpenButtonLabel:
      safeString(
        saved?.ticketOpenButtonLabel,
        DEFAULTS.ticketOpenButtonLabel,
      ),

    ticketOpenButtonEmoji:
      safeString(
        saved?.ticketOpenButtonEmoji,
        DEFAULTS.ticketOpenButtonEmoji,
      ),

    ticketHowButtonLabel:
      safeString(
        saved?.ticketHowButtonLabel,
        DEFAULTS.ticketHowButtonLabel,
      ),

    ticketHowButtonEmoji:
      safeString(
        saved?.ticketHowButtonEmoji,
        DEFAULTS.ticketHowButtonEmoji,
      ),

    ticketFinanceButtonLabel:
      safeString(
        saved?.ticketFinanceButtonLabel,
        DEFAULTS.ticketFinanceButtonLabel,
      ),

    ticketFinanceButtonEmoji:
      safeString(
        saved?.ticketFinanceButtonEmoji,
        DEFAULTS.ticketFinanceButtonEmoji,
      ),

    ticketCategoryId:
      saved?.ticketCategoryId ??
      config.tickets.categoryId ??
      null,

    transcriptChannelId:
      saved?.transcriptChannelId ??
      config.tickets.transcriptsChannelId ??
      null,

    ownerRoleId:
      saved?.ownerRoleId ??
      config.roles.ownerId ??
      null,

    adminRoleId:
      saved?.adminRoleId ??
      config.roles.leadershipId ??
      null,

    recruitRoleId:
      saved?.recruitRoleId ??
      config.roles.recruitsId ??
      null,

    financeRoleId:
      saved?.financeRoleId ??
      config.roles.financeId ??
      null,

    operationsRoleId:
      saved?.operationsRoleId ??
      config.roles.operationsId ??
      null,
  };
}

/* =========================================================
   CANAL / TÓPICO
========================================================= */

function getTopicValue(
  channel: TextChannel,
  key: string,
): string | null {
  const topic =
    channel.topic ??
    '';

  const match =
    topic.match(
      new RegExp(
        `(?:^|;)${key}=([^;]+)`,
        'i',
      ),
    );

  return (
    match?.[1] ??
    null
  );
}

function setTopicValue(
  topic: string,
  key: string,
  value: string,
): string {
  const parts =
    topic
      .split(';')
      .filter(Boolean);

  const index =
    parts.findIndex(
      (part) =>
        part
          .toLowerCase()
          .startsWith(
            `${key.toLowerCase()}=`,
          ),
    );

  const replacement =
    `${key}=${value}`;

  if (
    index >= 0
  ) {
    parts[index] =
      replacement;
  } else {
    parts.push(
      replacement,
    );
  }

  return parts
    .join(';')
    .slice(0, 1024);
}

function isTicketChannel(
  channel: TextChannel,
): boolean {
  return Boolean(
    getTopicValue(
      channel,
      'ticket-owner',
    ),
  );
}

/* =========================================================
   NOME DO CANAL
========================================================= */

function cleanChannelName(
  username: string,
): string {
  const normalized =
    username
      .toLowerCase()
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        '',
      )
      .replace(
        /[^a-z0-9-]/g,
        '-',
      )
      .replace(
        /-+/g,
        '-',
      )
      .replace(
        /^-|-$/g,
        '',
      );

  return (
    normalized.slice(
      0,
      25,
    ) ||
    'usuario'
  );
}

/* =========================================================
   CARGOS DA EQUIPE
========================================================= */

function getStaffRoleIds(
  ticketConfig: TicketConfig,
): string[] {
  return [
    ticketConfig.ownerRoleId,
    ticketConfig.adminRoleId,
    ticketConfig.recruitRoleId,
    ticketConfig.financeRoleId,
    ticketConfig.operationsRoleId,
  ].filter(
    (
      id,
    ): id is string =>
      Boolean(id),
  );
}

/* =========================================================
   PERMISSÃO DA EQUIPE
========================================================= */

function hasStaffPermission(
  interaction: ButtonInteraction,
  ticketConfig: TicketConfig,
): boolean {
  if (
    !interaction.inCachedGuild()
  ) {
    return false;
  }

  if (
    interaction.member.permissions.has(
      PermissionFlagsBits.Administrator,
    )
  ) {
    return true;
  }

  const roleIds =
    getStaffRoleIds(
      ticketConfig,
    );

  return roleIds.some(
    (
      roleId,
    ) =>
      interaction.member.roles.cache.has(
        roleId,
      ),
  );
}

/* =========================================================
   BOTÕES DA CENTRAL
========================================================= */

function buildCentralRow(
  ticketConfig: TicketConfig,
): ActionRowBuilder<ButtonBuilder> {
  const openButton =
    new ButtonBuilder()
      .setCustomId(
        'ticket:create',
      )
      .setLabel(
        ticketConfig.ticketOpenButtonLabel,
      )
      .setStyle(
        ButtonStyle.Primary,
      );

  if (
    ticketConfig.ticketOpenButtonEmoji
  ) {
    openButton.setEmoji(
      ticketConfig.ticketOpenButtonEmoji,
    );
  }

  const howButton =
    new ButtonBuilder()
      .setCustomId(
        'ticket:how',
      )
      .setLabel(
        ticketConfig.ticketHowButtonLabel,
      )
      .setStyle(
        ButtonStyle.Secondary,
      );

  if (
    ticketConfig.ticketHowButtonEmoji
  ) {
    howButton.setEmoji(
      ticketConfig.ticketHowButtonEmoji,
    );
  }

  const financeButton =
    new ButtonBuilder()
      .setCustomId(
        'ticket:finance',
      )
      .setLabel(
        ticketConfig.ticketFinanceButtonLabel,
      )
      .setStyle(
        ButtonStyle.Success,
      );

  if (
    ticketConfig.ticketFinanceButtonEmoji
  ) {
    financeButton.setEmoji(
      ticketConfig.ticketFinanceButtonEmoji,
    );
  }

  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      openButton,
      howButton,
      financeButton,
    );
}

/* =========================================================
   BOTÕES DO TICKET
========================================================= */

function buildTicketRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(
          'ticket:assume',
        )
        .setLabel(
          'Assumir',
        )
        .setEmoji(
          '🛡️',
        )
        .setStyle(
          ButtonStyle.Primary,
        ),

      new ButtonBuilder()
        .setCustomId(
          'ticket:transcript',
        )
        .setLabel(
          'Transcript',
        )
        .setEmoji(
          '📜',
        )
        .setStyle(
          ButtonStyle.Secondary,
        ),

      new ButtonBuilder()
        .setCustomId(
          'ticket:close',
        )
        .setLabel(
          'Encerrar',
        )
        .setEmoji(
          '🔒',
        )
        .setStyle(
          ButtonStyle.Danger,
        ),
    );
}

/* =========================================================
   BOTÃO DE TRANSCRIPT WEB
========================================================= */

function buildTranscriptUrl(
  transcriptPath: string,
): string | null {
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

  /*
   * A página web atual usa:
   *
   * /transcripts/:id
   *
   * quando o arquivo foi salvo como:
   *
   * transcript-123456789.html
   */
  const filename =
    path.basename(
      transcriptPath,
    );

  const idMatch =
    filename.match(
      /^transcript-(\d{15,25})\.html$/i,
    );

  if (
    !idMatch
  ) {
    return null;
  }

  return (
    `${publicUrl}/transcripts/` +
    idMatch[1]
  );
}

/* =========================================================
   ARQUIVO DO TRANSCRIPT
========================================================= */

function resolveTranscriptPath(
  transcriptPath: string,
): string {
  if (
    path.isAbsolute(
      transcriptPath,
    )
  ) {
    return transcriptPath;
  }

  return path.resolve(
    process.cwd(),
    transcriptPath,
  );
}

/* =========================================================
   RESPOSTAS
========================================================= */

async function replyButton(
  interaction: ButtonInteraction,
  content: string,
  ephemeral = true,
): Promise<void> {
  if (
    interaction.replied ||
    interaction.deferred
  ) {
    await interaction.followUp({
      content,
      ephemeral,
    });

    return;
  }

  await interaction.reply({
    content,
    ephemeral,
  });
}

async function replyEmbed(
  interaction: ButtonInteraction,
  embed: EmbedBuilder,
  components?: ActionRowBuilder<ButtonBuilder>[],
  ephemeral = false,
): Promise<void> {
  if (
    interaction.replied ||
    interaction.deferred
  ) {
    await interaction.followUp({
      embeds: [embed],
      components,
      ephemeral,
    });

    return;
  }

  await interaction.reply({
    embeds: [embed],
    components,
    ephemeral,
  });
}

/* =========================================================
   SETUP
========================================================= */

export async function handleTicketSetup(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (
    !interaction.guild
  ) {
    await interaction.reply({
      content:
        '❌ Este comando precisa ser usado dentro de um servidor.',
      ephemeral:
        true,
    });

    return;
  }

  if (
    !interaction.memberPermissions?.has(
      PermissionFlagsBits.Administrator,
    )
  ) {
    await interaction.reply({
      content:
        '⛔ Apenas administradores podem publicar a central de tickets.',
      ephemeral:
        true,
    });

    return;
  }

  const ticketConfig =
    await getTicketConfig(
      interaction.guild.id,
    );

  if (
    !ticketConfig.ticketsEnabled
  ) {
    await interaction.reply({
      content:
        '⚠️ O sistema de tickets está desativado no painel administrativo.',
      ephemeral:
        true,
    });

    return;
  }

  if (
    !ticketConfig.ticketCategoryId
  ) {
    await interaction.reply({
      content:
        '⚠️ Configure a categoria dos tickets no painel administrativo antes de publicar a central.',
      ephemeral:
        true,
    });

    return;
  }

  const embed =
    new EmbedBuilder()
      .setColor(
        COLORS.secondary,
      )
      .setTitle(
        `🎫 ${ticketConfig.ticketTitle}`,
      )
      .setDescription(
        [
          ticketConfig.ticketDescription,

          '',

          ticketConfig.ticketWelcomeText.replace(
            '{user}',
            interaction.user.toString(),
          ),

          '',

          '🔒 **Atendimento privado**',
          '👥 **Equipe autorizada**',
          '📜 **Transcript automático**',
        ].join(
          '\n',
        ),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Central de Atendimento',
      })
      .setTimestamp();

  await interaction.reply({
    embeds: [
      embed,
    ],
    components: [
      buildCentralRow(
        ticketConfig,
      ),
    ],
  });
}

/* =========================================================
   ROUTER DOS BOTÕES
========================================================= */

export async function handleTicketButton(
  interaction: ButtonInteraction,
): Promise<void> {
  switch (
    interaction.customId
  ) {
    case 'ticket:create':
      await createTicket(
        interaction,
        'SUPORTE',
      );
      return;

    case 'ticket:finance':
      await createTicket(
        interaction,
        'FINANCEIRO',
      );
      return;

    case 'ticket:how':
      await showHowItWorks(
        interaction,
      );
      return;

    case 'ticket:assume':
      await assumeTicket(
        interaction,
      );
      return;

    case 'ticket:transcript':
      await generateTicketTranscript(
        interaction,
      );
      return;

    case 'ticket:close':
      await closeTicket(
        interaction,
      );
      return;

    default:
      await replyButton(
        interaction,
        '❌ Ação de ticket não reconhecida.',
        true,
      );
  }
}

/* =========================================================
   COMO FUNCIONA
========================================================= */

async function showHowItWorks(
  interaction: ButtonInteraction,
): Promise<void> {
  const embed =
    new EmbedBuilder()
      .setColor(
        COLORS.primary,
      )
      .setTitle(
        '❓ COMO FUNCIONA',
      )
      .setDescription(
        [
          '1️⃣ Abra o atendimento desejado.',

          '',

          '2️⃣ Um canal privado será criado automaticamente.',

          '',

          '3️⃣ Explique sua solicitação no canal.',

          '',

          '4️⃣ Um membro autorizado poderá assumir o atendimento.',

          '',

          '5️⃣ Ao finalizar, o histórico poderá ser arquivado em transcript.',
        ].join(
          '\n',
        ),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Central de Atendimento',
      });

  await replyEmbed(
    interaction,
    embed,
    undefined,
    true,
  );
}

/* =========================================================
   CRIAR TICKET
========================================================= */

async function createTicket(
  interaction: ButtonInteraction,
  type: TicketType,
): Promise<void> {
  const guild =
    interaction.guild;

  if (
    !guild
  ) {
    await replyButton(
      interaction,
      '❌ Servidor não encontrado.',
      true,
    );

    return;
  }

  const ticketConfig =
    await getTicketConfig(
      guild.id,
    );

  if (
    !ticketConfig.ticketsEnabled
  ) {
    await replyButton(
      interaction,
      '⚠️ O sistema de tickets está desativado no painel administrativo.',
      true,
    );

    return;
  }

  if (
    !ticketConfig.ticketCategoryId
  ) {
    await replyButton(
      interaction,
      '⚠️ A categoria de tickets não está configurada no painel administrativo.',
      true,
    );

    return;
  }

  const category =
    await guild.channels.fetch(
      ticketConfig.ticketCategoryId,
    ).catch(
      () => null,
    );

  if (
    !category ||
    category.type !==
      ChannelType.GuildCategory
  ) {
    await replyButton(
      interaction,
      '❌ A categoria salva no painel não existe mais ou não é uma categoria válida.',
      true,
    );

    return;
  }

  const ownerId =
    interaction.user.id;

  /* -------------------------------------------------------
     VERIFICAR TICKET EXISTENTE
  ------------------------------------------------------- */

  const existing =
    guild.channels.cache.find(
      (
        channel,
      ) => {
        if (
          channel.type !==
          ChannelType.GuildText
        ) {
          return false;
        }

        const textChannel =
          channel as TextChannel;

        return (
          getTopicValue(
            textChannel,
            'ticket-owner',
          ) ===
          ownerId
        );
      },
    );

  if (
    existing
  ) {
    await replyButton(
      interaction,
      `⚠️ Você já possui um atendimento aberto: ${existing}`,
      true,
    );

    return;
  }

  await interaction.deferReply({
    ephemeral:
      true,
  });

  const username =
    cleanChannelName(
      interaction.user.username,
    );

  const prefix =
    type ===
    'FINANCEIRO'
      ? 'financeiro'
      : 'ticket';

  const channelName =
    `${prefix}-${username}-${ownerId.slice(-5)}`
      .slice(
        0,
        100,
      );

  /* -------------------------------------------------------
     PERMISSÕES INICIAIS
  ------------------------------------------------------- */

  const permissionOverwrites = [
    {
      id:
        guild.roles.everyone.id,

      deny: [
        PermissionFlagsBits.ViewChannel,
      ],
    },

    {
      id:
        ownerId,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    },
  ];

  for (
    const roleId of getStaffRoleIds(
      ticketConfig,
    )
  ) {
    if (
      roleId ===
      guild.roles.everyone.id
    ) {
      continue;
    }

    permissionOverwrites.push({
      id:
        roleId,

      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.EmbedLinks,
      ],
    });
  }

  /* -------------------------------------------------------
     CRIAÇÃO
  ------------------------------------------------------- */

  try {
    const channel =
      await guild.channels.create({
        name:
          channelName,

        type:
          ChannelType.GuildText,

        parent:
          category.id,

        topic:
          [
            `ticket-owner=${ownerId}`,
            `ticket-type=${type}`,
            `ticket-status=OPEN`,
            `ticket-assigned=`,
            `created=${Date.now()}`,
          ].join(';'),

        permissionOverwrites,
      });

    const title =
      type ===
      'FINANCEIRO'
        ? '💰 ATENDIMENTO FINANCEIRO'
        : '🎫 ATENDIMENTO';

    const description =
      type ===
      'FINANCEIRO'
        ? [
            `Olá ${interaction.user}, seu atendimento financeiro foi aberto.`,

            '',

            '💰 Explique o assunto financeiro com clareza.',

            '👥 Uma pessoa autorizada poderá assumir o atendimento.',
          ].join(
            '\n',
          )
        : [
            `Olá ${interaction.user}, seu atendimento foi aberto.`,

            '',

            '📝 Explique detalhadamente o que você precisa.',

            '👥 Um membro autorizado poderá assumir o atendimento.',
          ].join(
            '\n',
          );

    const ticketEmbed =
      new EmbedBuilder()
        .setColor(
          type ===
            'FINANCEIRO'
            ? COLORS.finance
            : COLORS.secondary,
        )
        .setTitle(
          title,
        )
        .setDescription(
          description,
        )
        .addFields(
          {
            name:
              '👤 SOLICITANTE',

            value:
              interaction.user.toString(),

            inline:
              true,
          },

          {
            name:
              '📁 TIPO',

            value:
              type ===
              'FINANCEIRO'
                ? 'Financeiro'
                : 'Atendimento',

            inline:
              true,
          },
        )
        .setFooter({
          text:
            'Ghost Syndicate • Atendimento',
        })
        .setTimestamp();

    await channel.send({
      content:
        interaction.user.toString(),

      embeds: [
        ticketEmbed,
      ],

      components: [
        buildTicketRow(),
      ],
    });

    const successEmbed =
      new EmbedBuilder()
        .setColor(
          COLORS.primary,
        )
        .setTitle(
          '✅ ATENDIMENTO CRIADO',
        )
        .setDescription(
          [
            'Seu atendimento foi criado com sucesso.',

            '',

            `🎫 **Canal:** ${channel}`,

            '',

            'Nossa equipe poderá assumir seu atendimento em breve.',
          ].join(
            '\n',
          ),
        )
        .setFooter({
          text:
            'Ghost Syndicate • Central de Atendimento',
        })
        .setTimestamp();

    await interaction.editReply({
      embeds: [
        successEmbed,
      ],
    });

  } catch (
    error
  ) {
    console.error(
      '❌ [TICKET CREATE]',
      error,
    );

    await interaction.editReply({
      content:
        '❌ Não foi possível criar o atendimento. Verifique a categoria configurada e as permissões do bot.',
    });
  }
}

/* =========================================================
   ASSUMIR
========================================================= */

async function assumeTicket(
  interaction: ButtonInteraction,
): Promise<void> {
  if (
    !interaction.inCachedGuild()
  ) {
    await replyButton(
      interaction,
      '❌ Esta ação precisa ser usada dentro de um servidor.',
      true,
    );

    return;
  }

  const channel =
    interaction.channel;

  if (
    !channel ||
    channel.type !==
      ChannelType.GuildText
  ) {
    await replyButton(
      interaction,
      '❌ Este botão precisa estar dentro de um ticket.',
      true,
    );

    return;
  }

  const textChannel =
    channel as TextChannel;

  if (
    !isTicketChannel(
      textChannel,
    )
  ) {
    await replyButton(
      interaction,
      '❌ Este canal não é um ticket válido.',
      true,
    );

    return;
  }

  const ticketConfig =
    await getTicketConfig(
      interaction.guild.id,
    );

  if (
    !hasStaffPermission(
      interaction,
      ticketConfig,
    )
  ) {
    await replyButton(
      interaction,
      '⛔ Você não possui permissão para assumir este atendimento.',
      true,
    );

    return;
  }

  const assigned =
    getTopicValue(
      textChannel,
      'ticket-assigned',
    );

  if (
    assigned
  ) {
    await replyButton(
      interaction,
      `⚠️ Este atendimento já foi assumido por <@${assigned}>.`,
      true,
    );

    return;
  }

  /* -------------------------------------------------------
     BLOQUEAR OUTROS ATENDENTES
  ------------------------------------------------------- */

  for (
    const roleId of getStaffRoleIds(
      ticketConfig,
    )
  ) {
    await textChannel.permissionOverwrites
      .edit(
        roleId,
        {
          SendMessages:
            false,

          ViewChannel:
            true,

          ReadMessageHistory:
            true,
        },
      )
      .catch(
        (
          error,
        ) => {
          console.error(
            `⚠️ [TICKET ASSUME] Não foi possível atualizar o cargo ${roleId}:`,
            error,
          );
        },
      );
  }

  /* -------------------------------------------------------
     LIBERAR O RESPONSÁVEL
  ------------------------------------------------------- */

  await textChannel.permissionOverwrites
    .edit(
      interaction.user.id,
      {
        ViewChannel:
          true,

        SendMessages:
          true,

        ReadMessageHistory:
          true,

        AttachFiles:
          true,

        EmbedLinks:
          true,
      },
    );

  /* -------------------------------------------------------
     GARANTIR SOLICITANTE
  ------------------------------------------------------- */

  const ownerId =
    getTopicValue(
      textChannel,
      'ticket-owner',
    );

  if (
    ownerId
  ) {
    await textChannel.permissionOverwrites
      .edit(
        ownerId,
        {
          ViewChannel:
            true,

          SendMessages:
            true,

          ReadMessageHistory:
            true,

          AttachFiles:
            true,

          EmbedLinks:
            true,
        },
      )
      .catch(
        () => {},
      );
  }

  /* -------------------------------------------------------
     ATUALIZAR TÓPICO
  ------------------------------------------------------- */

  await textChannel.setTopic(
    setTopicValue(
      setTopicValue(
        textChannel.topic ??
          '',
        'ticket-assigned',
        interaction.user.id,
      ),
      'ticket-status',
      'ASSIGNED',
    ),
  );

  const embed =
    new EmbedBuilder()
      .setColor(
        COLORS.primary,
      )
      .setTitle(
        '🛡️ ATENDIMENTO ASSUMIDO',
      )
      .setDescription(
        [
          `${interaction.user} assumiu este atendimento.`,

          '',

          '🔒 A partir de agora, somente o **solicitante** e o **responsável pelo atendimento** poderão conversar aqui.',
        ].join(
          '\n',
        ),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Atendimento',
      })
      .setTimestamp();

  await replyEmbed(
    interaction,
    embed,
  );
}

/* =========================================================
   GERAR TRANSCRIPT
========================================================= */

async function generateTicketTranscript(
  interaction: ButtonInteraction,
): Promise<void> {
  if (
    !interaction.inCachedGuild()
  ) {
    await replyButton(
      interaction,
      '❌ Esta ação precisa ser usada dentro de um servidor.',
      true,
    );

    return;
  }

  const channel =
    interaction.channel;

  if (
    !channel ||
    channel.type !==
      ChannelType.GuildText
  ) {
    await replyButton(
      interaction,
      '❌ Este botão precisa estar dentro de um ticket.',
      true,
    );

    return;
  }

  const textChannel =
    channel as TextChannel;

  if (
    !isTicketChannel(
      textChannel,
    )
  ) {
    await replyButton(
      interaction,
      '❌ Este canal não é um ticket válido.',
      true,
    );

    return;
  }

  const ticketConfig =
    await getTicketConfig(
      interaction.guild.id,
    );

  if (
    !hasStaffPermission(
      interaction,
      ticketConfig,
    )
  ) {
    await replyButton(
      interaction,
      '⛔ Você não possui permissão para gerar o transcript.',
      true,
    );

    return;
  }

  await interaction.deferReply({
    ephemeral:
      true,
  });

  try {
    const transcriptPath =
      await createTranscript(
        textChannel,
        interaction.user.tag,
      );

    const filename =
      path.basename(
        transcriptPath,
      );

    const webUrl =
      buildTranscriptUrl(
        transcriptPath,
      );

    const embed =
      new EmbedBuilder()
        .setColor(
          COLORS.primary,
        )
        .setTitle(
          '📜 TRANSCRIPT DO ATENDIMENTO',
        )
        .addFields(
          {
            name:
              '🎫 Ticket',

            value:
              `\`${textChannel.name}\``,

            inline:
              false,
          },

          {
            name:
              '👤 Solicitante',

            value:
              ownerIdMention(
                textChannel,
              ),

            inline:
              true,
          },

          {
            name:
              '🛡️ Gerado por',

            value:
              `${interaction.user}`,

            inline:
              true,
          },

          {
            name:
              '✅ Status',

            value:
              'Histórico processado e arquivado.',

            inline:
              false,
          },
        )
        .setFooter({
          text:
            'Ghost Syndicate • Central de Atendimento • Arquivo oficial',
        })
        .setTimestamp();

    const components =
      webUrl
        ? [
            new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setLabel(
                    'Abrir Transcript',
                  )
                  .setEmoji(
                    '🌐',
                  )
                  .setStyle(
                    ButtonStyle.Link,
                  )
                  .setURL(
                    webUrl,
                  ),
              ),
          ]
        : undefined;

    /*
     * Se o viewer web puder ser montado,
     * usamos o botão bonito.
     *
     * Caso o arquivo atual ainda não use
     * o padrão transcript-ID.html,
     * enviamos o arquivo para o Discord.
     */
    const resolvedPath =
      resolveTranscriptPath(
        transcriptPath,
      );

    if (
      !webUrl &&
      fs.existsSync(
        resolvedPath,
      )
    ) {
      const attachment =
        new AttachmentBuilder(
          resolvedPath,
          {
            name:
              filename,
          },
        );

      embed.addFields({
        name:
          '📁 Arquivo',

        value:
          `\`${filename}\``,

        inline:
          false,
      });

      await interaction.editReply({
        embeds: [
          embed,
        ],

        files: [
          attachment,
        ],
      });

      return;
    }

    await interaction.editReply({
      embeds: [
        embed,
      ],

      components,
    });

  } catch (
    error
  ) {
    console.error(
      '❌ [TICKET TRANSCRIPT]',
      error,
    );

    await interaction.editReply({
      content:
        '❌ Não foi possível gerar o transcript.',
    });
  }
}

/* =========================================================
   MENÇÃO DO SOLICITANTE
========================================================= */

function ownerIdMention(
  channel: TextChannel,
): string {
  const ownerId =
    getTopicValue(
      channel,
      'ticket-owner',
    );

  return ownerId
    ? `<@${ownerId}>`
    : 'Não identificado';
}

/* =========================================================
   ENCERRAR
========================================================= */

async function closeTicket(
  interaction: ButtonInteraction,
): Promise<void> {
  if (
    !interaction.inCachedGuild()
  ) {
    await replyButton(
      interaction,
      '❌ Esta ação precisa ser usada dentro de um servidor.',
      true,
    );

    return;
  }

  const channel =
    interaction.channel;

  if (
    !channel ||
    channel.type !==
      ChannelType.GuildText
  ) {
    await replyButton(
      interaction,
      '❌ Este botão precisa estar dentro de um ticket.',
      true,
    );

    return;
  }

  const textChannel =
    channel as TextChannel;

  if (
    !isTicketChannel(
      textChannel,
    )
  ) {
    await replyButton(
      interaction,
      '❌ Este canal não é um ticket válido.',
      true,
    );

    return;
  }

  const ticketConfig =
    await getTicketConfig(
      interaction.guild.id,
    );

  const ownerId =
    getTopicValue(
      textChannel,
      'ticket-owner',
    );

  const authorized =
    hasStaffPermission(
      interaction,
      ticketConfig,
    );

  if (
    !authorized &&
    ownerId !==
      interaction.user.id
  ) {
    await replyButton(
      interaction,
      '⛔ Somente o solicitante ou a equipe autorizada pode encerrar este atendimento.',
      true,
    );

    return;
  }

  await interaction.deferReply({
    ephemeral:
      true,
  });

  let transcriptPath:
    | string
    | null =
      null;

  try {
    transcriptPath =
      await createTranscript(
        textChannel,
        interaction.user.tag,
      );
  } catch (
    error
  ) {
    console.error(
      '⚠️ [CLOSE TRANSCRIPT]',
      error,
    );
  }

  /* -------------------------------------------------------
     EMBED DE ENCERRAMENTO
  ------------------------------------------------------- */

  const embed =
    new EmbedBuilder()
      .setColor(
        transcriptPath
          ? COLORS.primary
          : COLORS.warning,
      )
      .setTitle(
        transcriptPath
          ? '✅ ATENDIMENTO ENCERRADO'
          : '⚠️ ATENDIMENTO ENCERRADO',
      )
      .setDescription(
        transcriptPath
          ? 'O atendimento foi encerrado e o histórico foi processado com sucesso.'
          : 'O atendimento foi encerrado, mas o histórico não pôde ser processado.',
      )
      .addFields(
        {
          name:
            '🎫 Ticket',

          value:
            `\`${textChannel.name}\``,

          inline:
            false,
        },

        {
          name:
            '👤 Solicitante',

          value:
            ownerId
              ? `<@${ownerId}>`
              : 'Não identificado',

          inline:
            true,
        },

        {
          name:
            '🛡️ Encerrado por',

          value:
            `${interaction.user}`,

          inline:
            true,
        },

        {
          name:
            '📜 Transcript',

          value:
            transcriptPath
              ? '✅ Gerado e arquivado.'
              : '⚠️ Não foi gerado.',

          inline:
            false,
        },
      )
      .setFooter({
        text:
          'Ghost Syndicate • Central de Atendimento • Atendimento encerrado',
      })
      .setTimestamp();

  /* -------------------------------------------------------
     ARQUIVO / LINK
  ------------------------------------------------------- */

  let transcriptUrl:
    | string
    | null =
      null;

  if (
    transcriptPath
  ) {
    transcriptUrl =
      buildTranscriptUrl(
        transcriptPath,
      );
  }

  /* -------------------------------------------------------
     ENVIAR PARA CANAL DE TRANSCRIPT
  ------------------------------------------------------- */

  let archiveSent =
    false;

  if (
    transcriptPath &&
    ticketConfig.transcriptChannelId
  ) {
    const transcriptChannel =
      await interaction.guild.channels
        .fetch(
          ticketConfig.transcriptChannelId,
        )
        .catch(
          () => null,
        );

    if (
      transcriptChannel &&
      transcriptChannel.type ===
        ChannelType.GuildText
    ) {
      const archiveEmbed =
        new EmbedBuilder()
          .setColor(
            COLORS.primary,
          )
          .setTitle(
            '📜 TRANSCRIPT DO ATENDIMENTO',
          )
          .addFields(
            {
              name:
                '🎫 Ticket',

              value:
                `\`${textChannel.name}\``,

              inline:
                false,
            },

            {
              name:
                '👤 Solicitante',

              value:
                ownerId
                  ? `<@${ownerId}>`
                  : 'Não identificado',

              inline:
                true,
            },

            {
              name:
                '🛡️ Gerado por',

              value:
                `${interaction.user}`,

              inline:
                true,
            },

            {
              name:
                '✅ Status',

              value:
                'Histórico processado e arquivado.',

              inline:
                false,
            },
          )
          .setFooter({
            text:
              'Ghost Syndicate • Central de Atendimento • Arquivo oficial',
          })
          .setTimestamp();

      const archiveComponents:
        ActionRowBuilder<ButtonBuilder>[] =
          [];

      if (
        transcriptUrl
      ) {
        archiveComponents.push(
          new ActionRowBuilder<ButtonBuilder>()
            .addComponents(
              new ButtonBuilder()
                .setLabel(
                  'Abrir Transcript',
                )
                .setEmoji(
                  '🌐',
                )
                .setStyle(
                  ButtonStyle.Link,
                )
                .setURL(
                  transcriptUrl,
                ),
            ),
        );
      }

      try {
        const absolutePath =
          resolveTranscriptPath(
            transcriptPath,
          );

        if (
          fs.existsSync(
            absolutePath,
          )
        ) {
          const attachment =
            new AttachmentBuilder(
              absolutePath,
            );

          await (
            transcriptChannel as TextChannel
          ).send({
            embeds: [
              archiveEmbed,
            ],

            components:
              archiveComponents,

            files: [
              attachment,
            ],
          });
        } else {
          await (
            transcriptChannel as TextChannel
          ).send({
            embeds: [
              archiveEmbed,
            ],

            components:
              archiveComponents,
          });
        }

        archiveSent =
          true;
      } catch (
        error
      ) {
        console.error(
          '❌ [TRANSCRIPT ARCHIVE]',
          error,
        );
      }
    }
  }

  /* -------------------------------------------------------
     MENSAGEM FINAL NO TICKET
  ------------------------------------------------------- */

  if (
    transcriptPath
  ) {
    const finalComponents =
      transcriptUrl
        ? [
            new ActionRowBuilder<ButtonBuilder>()
              .addComponents(
                new ButtonBuilder()
                  .setLabel(
                    'Abrir Transcript',
                  )
                  .setEmoji(
                    '🌐',
                  )
                  .setStyle(
                    ButtonStyle.Link,
                  )
                  .setURL(
                    transcriptUrl,
                  ),
              ),
          ]
        : undefined;

    if (
      archiveSent
    ) {
      embed.addFields({
        name:
          '📦 Arquivo',

        value:
          '✅ Arquivado no canal de transcripts.',

        inline:
          false,
      });
    }

    try {
      await textChannel.send({
        embeds: [
          embed,
        ],

        components:
          finalComponents,
      });
    } catch (
      error
    ) {
      console.error(
        '⚠️ [TICKET CLOSE MESSAGE]',
        error,
      );
    }

    await interaction.editReply({
      embeds: [
        embed,
      ],

      components:
        finalComponents,
    });
  } else {
    await textChannel.send({
      embeds: [
        embed,
      ],
    }).catch(
      () => {},
    );

    await interaction.editReply({
      embeds: [
        embed,
      ],
    });
  }

  /* -------------------------------------------------------
     MARCAR COMO ENCERRADO
  ------------------------------------------------------- */

  await textChannel.setTopic(
    setTopicValue(
      textChannel.topic ??
        '',
      'ticket-status',
      'CLOSED',
    ),
  ).catch(
    () => {},
  );

  /* -------------------------------------------------------
     APAGAR O CANAL
  ------------------------------------------------------- */

  setTimeout(
    () => {
      void textChannel
        .delete(
          'Atendimento encerrado',
        )
        .catch(
          (
            error,
          ) => {
            console.error(
              '❌ [TICKET DELETE]',
              error,
            );
          },
        );
    },
    5000,
  );
}
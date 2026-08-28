// apps/bot/src/commands/tickets.ts

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
  type OverwriteResolvable,
  type TextChannel,
} from 'discord.js';

import * as discordTranscripts from 'discord.js-html-transcript';

import {
  mkdir,
  writeFile,
} from 'node:fs/promises';

import path from 'node:path';

import {
  requireAdmin,
} from '../utils/permissions.js';

import {
  config,
} from '../utils/config.js';

/* =========================================================
   TIPOS
========================================================= */

type TicketStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'CLOSED';

/* =========================================================
   IDENTIDADE VISUAL
========================================================= */

const COLORS = {
  brand: 0x7c5cff,
  success: 0x35d39a,
  warning: 0xffc857,
  danger: 0xf15b6b,
  info: 0x5865f2,
} as const;

const FOOTER =
  'Ghost Syndicate • Central de Atendimento';

/* =========================================================
   COMANDO
========================================================= */

export const ticketsCommand =
  new SlashCommandBuilder()
    .setName('ticket')
    .setDescription(
      'Abre a central de atendimento da Ghost Syndicate.',
    );

/* =========================================================
   EXECUTOR DO /TICKET
========================================================= */

export async function executeTicketsCommand(
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

  await interaction.reply({
    embeds: [
      createMainPanelEmbed(),
    ],
    components: [
      createMainPanelButtons(),
    ],
  });
}

/* =========================================================
   PAINEL PRINCIPAL
========================================================= */

function createMainPanelEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(
      COLORS.brand,
    )
    .setTitle(
      '👻 GHOST SYNDICATE',
    )
    .setDescription(
      [
        '## 🎫 CENTRAL DE ATENDIMENTO',
        '',
        '> O canal oficial para suporte e atendimento da Ghost Syndicate.',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '### 🔒 ATENDIMENTO PRIVADO',
        '',
        'Abra um canal exclusivo com você e a equipe autorizada.',
        '',
        '### ⚡ SIMPLES E ORGANIZADO',
        '',
        'Seu atendimento é criado automaticamente e permanece separado dos demais.',
        '',
        '### 📜 HISTÓRICO',
        '',
        'Ao finalizar, o histórico pode ser arquivado como transcript.',
        '',
        '━━━━━━━━━━━━━━━━━━━━━━━━',
        '',
        '### 📌 ANTES DE ABRIR',
        '',
        'Explique sua solicitação com clareza.',
        '',
        'Envie prints ou arquivos quando forem necessários.',
        '',
        'Evite abrir vários tickets para o mesmo assunto.',
        '',
        '### 🎫 PRECISA DE AJUDA?',
        '',
        'Clique em **Abrir Atendimento**.',
      ].join('\n'),
    )
    .addFields(
      {
        name:
          '🔒 PRIVADO',
        value:
          'Acesso restrito aos envolvidos.',
        inline:
          true,
      },
      {
        name:
          '🛡️ EQUIPE',
        value:
          'Atendimento administrativo.',
        inline:
          true,
      },
      {
        name:
          '📜 HISTÓRICO',
        value:
          'Transcript arquivado.',
        inline:
          true,
      },
    )
    .setFooter({
      text:
        FOOTER,
    })
    .setTimestamp();
}

/* =========================================================
   BOTÕES DO PAINEL
========================================================= */

function createMainPanelButtons(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(
          'ticket:create',
        )
        .setLabel(
          'Abrir Atendimento',
        )
        .setEmoji(
          '🎫',
        )
        .setStyle(
          ButtonStyle.Primary,
        ),

      new ButtonBuilder()
        .setCustomId(
          'ticket:info',
        )
        .setLabel(
          'Como funciona',
        )
        .setEmoji(
          '❔',
        )
        .setStyle(
          ButtonStyle.Secondary,
        ),

      new ButtonBuilder()
        .setCustomId(
          'ticket:finance',
        )
        .setLabel(
          'Financeiro',
        )
        .setEmoji(
          '💰',
        )
        .setStyle(
          ButtonStyle.Secondary,
        ),
    );
}

/* =========================================================
   HANDLER CENTRAL
========================================================= */

export async function handleTicketInteraction(
  interaction: ButtonInteraction,
): Promise<void> {
  try {
    switch (
      interaction.customId
    ) {
      case 'ticket:create':
        await createTicket(
          interaction,
        );
        break;

      case 'ticket:info':
        await showGeneralInfo(
          interaction,
        );
        break;

      case 'ticket:finance':
        await showFinanceInfo(
          interaction,
        );
        break;

      case 'ticket:assume':
        await assumeTicket(
          interaction,
        );
        break;

      case 'ticket:transcript':
        await generateAndSendTranscript(
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
          '❌ Ação de ticket não reconhecida.',
          true,
        );
        break;
    }
  } catch (error) {
    console.error(
      '❌ [TICKET]',
      error,
    );

    await safeReply(
      interaction,
      error instanceof Error
        ? `❌ ${error.message}`
        : '❌ Ocorreu um erro no sistema de tickets.',
      true,
    );
  }
}

/* =========================================================
   CRIAR TICKET
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

  /*
   * Impede múltiplos tickets para o mesmo usuário.
   */

  const existing =
    guild.channels.cache.find(
      (channel) =>
        channel.type ===
          ChannelType.GuildText &&
        channel.topic?.includes(
          `ticket-owner:${interaction.user.id}`,
        ),
    );

  if (existing) {
    await safeReply(
      interaction,
      `⚠️ Você já possui um atendimento aberto: ${existing}`,
      true,
    );

    return;
  }

  /*
   * Nome do canal.
   */

  const username =
    interaction.user.username
      .toLowerCase()
      .replace(
        /[^a-z0-9-]/g,
        '',
      )
      .slice(
        0,
        12,
      );

  const userShortId =
    interaction.user.id.slice(
      -6,
    );

  const channelName =
    `ticket-${username || 'usuario'}-${userShortId}`;

  /*
   * Permissões básicas.
   */

  const overwrites:
    OverwriteResolvable[] =
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
   * Staff autorizado.
   */

  addStaffRole(
    overwrites,
    config.roles.leadershipId,
  );

  addStaffRole(
    overwrites,
    config.roles.financeId,
  );

  addStaffRole(
    overwrites,
    config.roles.operationsId,
  );

  /*
   * Metadados do canal.
   */

  const createdAt =
    Math.floor(
      Date.now() /
        1000,
    );

  const topic =
    [
      `ticket-owner:${interaction.user.id}`,
      'status:OPEN',
      `created:${createdAt}`,
    ].join(
      ' | ',
    );

  /*
   * Cria o ticket.
   */

  const channel =
    await guild.channels.create({
      name:
        channelName,

      type:
        ChannelType.GuildText,

      topic:
        topic.slice(
          0,
          1024,
        ),

      parent:
        config.tickets.categoryId ||
        undefined,

      permissionOverwrites:
        overwrites,
    });

  /*
   * Envia o painel do ticket.
   */

  await channel.send({
    content:
      interaction.user.toString(),

    embeds: [
      createTicketEmbed(
        interaction,
      ),
    ],

    components: [
      createTicketControlButtons(),
    ],

    allowedMentions: {
      users: [
        interaction.user.id,
      ],
    },
  });

  /*
   * Confirmação privada.
   */

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(
          COLORS.success,
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
            'Explique o que você precisa e aguarde nossa equipe.',
          ].join('\n'),
        )
        .setFooter({
          text:
            FOOTER,
        })
        .setTimestamp(),
    ],
    ephemeral:
      true,
  });
}

/* =========================================================
   EMBED DO TICKET
========================================================= */

function createTicketEmbed(
  interaction: ButtonInteraction,
): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(
      COLORS.brand,
    )
    .setTitle(
      '🎫 ATENDIMENTO ABERTO',
    )
    .setDescription(
      [
        `Olá ${interaction.user}.`,
        '',
        'Seu atendimento foi criado com sucesso.',
        '',
        'Explique abaixo o que você precisa e aguarde nossa equipe.',
        '',
        '🔒 **Este canal é privado.**',
      ].join('\n'),
    )
    .addFields(
      {
        name:
          '👤 Solicitante',
        value:
          `${interaction.user}`,
        inline:
          true,
      },
      {
        name:
          '📊 Status',
        value:
          '🟢 Aberto',
        inline:
          true,
      },
      {
        name:
          '🕐 Aberto em',
        value:
          `<t:${Math.floor(
            Date.now() /
              1000,
          )}:F>`,
        inline:
          false,
      },
    )
    .setFooter({
      text:
        `${FOOTER} • Atendimento privado`,
    })
    .setTimestamp();
}

/* =========================================================
   BOTÕES DO TICKET
========================================================= */

function createTicketControlButtons(): ActionRowBuilder<ButtonBuilder> {
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
   ASSUMIR
========================================================= */

async function assumeTicket(
  interaction: ButtonInteraction,
): Promise<void> {
  if (!interaction.guild) {
    return;
  }

  const member =
    await interaction.guild.members.fetch(
      interaction.user.id,
    );

  requireAdmin(
    member,
  );

  const channel =
    getTicketChannel(
      interaction,
    );

  if (!channel) {
    return;
  }

  await updateTicketTopic(
    channel,
    'status',
    'IN_PROGRESS',
  );

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(
          COLORS.success,
        )
        .setTitle(
          '🛡️ ATENDIMENTO ASSUMIDO',
        )
        .setDescription(
          [
            `${member} assumiu este atendimento.`,
            '',
            'O responsável dará continuidade à solicitação.',
          ].join('\n'),
        )
        .setFooter({
          text:
            FOOTER,
        })
        .setTimestamp(),
    ],
  });
}

/* =========================================================
   TRANSCRIPT MANUAL
========================================================= */

async function generateAndSendTranscript(
  interaction: ButtonInteraction,
): Promise<void> {
  if (!interaction.guild) {
    return;
  }

  const member =
    await interaction.guild.members.fetch(
      interaction.user.id,
    );

  requireAdmin(
    member,
  );

  const channel =
    getTicketChannel(
      interaction,
    );

  if (!channel) {
    return;
  }

  const transcriptChannel =
    await getTranscriptChannel(
      interaction,
    );

  if (!transcriptChannel) {
    return;
  }

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(
          COLORS.info,
        )
        .setTitle(
          '📜 GERANDO TRANSCRIPT',
        )
        .setDescription(
          [
            'O histórico deste atendimento está sendo preparado.',
            '',
            '⏳ Aguarde alguns instantes...',
          ].join('\n'),
        )
        .setFooter({
          text:
            FOOTER,
        })
        .setTimestamp(),
    ],
    ephemeral:
      true,
  });

  const html =
    await createTranscriptHtml(
      channel,
    );

  const filePath =
    await saveTranscript(
      channel,
      html,
    );

  const siteUrl =
    getTranscriptSiteUrl(
      channel.id,
    );

  const ownerId =
    getTicketOwner(
      channel,
    );

  const embed =
    new EmbedBuilder()
      .setColor(
        COLORS.brand,
      )
      .setTitle(
        '📜 TRANSCRIPT DO ATENDIMENTO',
      )
      .setDescription(
        [
          `🎫 **Ticket:** ${channel.name}`,
          '',
          `👤 **Solicitante:** ${
            ownerId
              ? `<@${ownerId}>`
              : 'Desconhecido'
          }`,
          '',
          `🛡️ **Gerado por:** ${member}`,
          '',
          '✅ Histórico processado e arquivado.',
        ].join('\n'),
      )
      .setFooter({
        text:
          `${FOOTER} • Arquivo oficial`,
      })
      .setTimestamp();

  const messageOptions: {
    embeds: EmbedBuilder[];
    components?: ActionRowBuilder<ButtonBuilder>[];
    files?: Array<{
      attachment: string;
      name: string;
    }>;
  } = {
    embeds: [
      embed,
    ],
  };

  /*
   * Se o site estiver configurado,
   * enviamos somente o botão.
   *
   * Caso contrário, usamos o HTML como fallback.
   */

  if (siteUrl) {
    messageOptions.components = [
      createTranscriptLinkButton(
        siteUrl,
      ),
    ];
  } else {
    messageOptions.files = [
      {
        attachment:
          filePath,
        name:
          `transcript-${channel.id}.html`,
      },
    ];
  }

  await transcriptChannel.send(
    messageOptions,
  );

  await interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setColor(
          COLORS.success,
        )
        .setTitle(
          '✅ TRANSCRIPT PRONTO',
        )
        .setDescription(
          [
            'O transcript foi processado com sucesso.',
            '',
            siteUrl
              ? '🌐 **Disponível no site administrativo.**'
              : '📎 **Arquivo enviado para a central.**',
          ].join('\n'),
        )
        .setFooter({
          text:
            FOOTER,
        })
        .setTimestamp(),
    ],
  });
}

/* =========================================================
   FECHAR TICKET
========================================================= */

async function closeTicket(
  interaction: ButtonInteraction,
): Promise<void> {
  if (!interaction.guild) {
    return;
  }

  const channel =
    getTicketChannel(
      interaction,
    );

  if (!channel) {
    return;
  }

  const member =
    await interaction.guild.members.fetch(
      interaction.user.id,
    );

  const ownerId =
    getTicketOwner(
      channel,
    );

  const isAdmin =
    canUseAdminControls(
      member,
    );

  /*
   * Solicitante ou staff podem encerrar.
   */

  if (
    !isAdmin &&
    ownerId !==
      interaction.user.id
  ) {
    await safeReply(
      interaction,
      '❌ Apenas o solicitante ou a equipe autorizada pode encerrar este atendimento.',
      true,
    );

    return;
  }

  const transcriptChannel =
    await getTranscriptChannel(
      interaction,
    );

  if (!transcriptChannel) {
    return;
  }

  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(
          COLORS.warning,
        )
        .setTitle(
          '🔒 ENCERRANDO ATENDIMENTO',
        )
        .setDescription(
          [
            'Estamos finalizando este atendimento.',
            '',
            '📜 Gerando transcript...',
            '💾 Arquivando histórico...',
          ].join('\n'),
        )
        .setFooter({
          text:
            FOOTER,
        })
        .setTimestamp(),
    ],
    ephemeral:
      true,
  });

  try {
    /*
     * Gera o transcript como HTML.
     */

    const html =
      await createTranscriptHtml(
        channel,
      );

    /*
     * Salva no servidor.
     */

    const filePath =
      await saveTranscript(
        channel,
        html,
      );

    /*
     * URL do site, quando configurada.
     */

    const siteUrl =
      getTranscriptSiteUrl(
        channel.id,
      );

    /*
     * Embed administrativo.
     */

    const archiveEmbed =
      new EmbedBuilder()
        .setColor(
          COLORS.danger,
        )
        .setTitle(
          '🔒 ATENDIMENTO ENCERRADO',
        )
        .setDescription(
          [
            `🎫 **Ticket:** ${channel.name}`,
            '',
            `👤 **Solicitante:** ${
              ownerId
                ? `<@${ownerId}>`
                : 'Desconhecido'
            }`,
            '',
            `🛡️ **Encerrado por:** ${member}`,
            '',
            '📜 **Transcript:** ✅ Gerado',
            '💾 **Arquivo:** ✅ Arquivado',
          ].join('\n'),
        )
        .setFooter({
          text:
            `${FOOTER} • Atendimento encerrado`,
        })
        .setTimestamp();

    const archiveOptions: {
      embeds: EmbedBuilder[];
      components?: ActionRowBuilder<ButtonBuilder>[];
      files?: Array<{
        attachment: string;
        name: string;
      }>;
    } = {
      embeds: [
        archiveEmbed,
      ],
    };

    if (siteUrl) {
      archiveOptions.components = [
        createTranscriptLinkButton(
          siteUrl,
        ),
      ];
    } else {
      archiveOptions.files = [
        {
          attachment:
            filePath,
          name:
            `transcript-${channel.id}.html`,
        },
      ];
    }

    await transcriptChannel.send(
      archiveOptions,
    );

    await updateTicketTopic(
      channel,
      'status',
      'CLOSED',
    );

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(
            COLORS.success,
          )
          .setTitle(
            '✅ ATENDIMENTO ENCERRADO',
          )
          .setDescription(
            [
              'O atendimento foi encerrado com sucesso.',
              '',
              '📜 Transcript gerado.',
              '💾 Histórico arquivado.',
              siteUrl
                ? '🌐 Link disponível no site.'
                : '📎 Arquivo enviado para a central.',
              '',
              '🗑️ Este canal será removido em alguns segundos.',
            ].join('\n'),
          )
          .setFooter({
            text:
              FOOTER,
          })
          .setTimestamp(),
      ],
    });

    /*
     * Remove o canal depois que tudo foi arquivado.
     */

    setTimeout(
      () => {
        channel
          .delete(
            'Ticket encerrado e transcript arquivado.',
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
      4000,
    );
  } catch (error) {
    console.error(
      '❌ [TICKET CLOSE]',
      error,
    );

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(
            COLORS.danger,
          )
          .setTitle(
            '⚠️ ERRO AO ENCERRAR',
          )
          .setDescription(
            [
              'Não foi possível finalizar o atendimento.',
              '',
              `❌ ${
                error instanceof Error
                  ? error.message
                  : 'Erro desconhecido.'
              }`,
              '',
              '🛑 O canal foi mantido para evitar perda do histórico.',
            ].join('\n'),
          )
          .setFooter({
            text:
              FOOTER,
          })
          .setTimestamp(),
      ],
    });
  }
}

/* =========================================================
   GERAÇÃO DO TRANSCRIPT
========================================================= */

async function createTranscriptHtml(
  channel: TextChannel,
): Promise<string> {
  const html =
    await discordTranscripts.createTranscript(
      channel,
      {
        returnType:
          discordTranscripts
            .ExportReturnType
            .String,

        filename:
          `transcript-${channel.id}.html`,

        limit:
          -1,

        saveAssets:
          true,

        assets: {
          attachments:
            true,

          embeds:
            true,

          avatars:
            true,

          emojis:
            true,

          guildIcons:
            true,

          inviteIcons:
            true,

          roleIcons:
            true,

          serverTagBadges:
            true,
        },

        features: {
          search:
            true,

          imagePreview:
            true,

          spoilerReveal:
            true,

          messageLinks:
            true,

          profileBadges:
            true,

          embedTweaks:
            true,
        },

        poweredBy:
          false,

        footerText:
          'Ghost Syndicate • Transcript oficial',
      },
    );

  return html;
}

/* =========================================================
   SALVAR TRANSCRIPT
========================================================= */

async function saveTranscript(
  channel: TextChannel,
  html: string,
): Promise<string> {
  const directory =
    path.join(
      process.cwd(),
      'storage',
      'transcripts',
    );

  await mkdir(
    directory,
    {
      recursive:
        true,
    },
  );

  const filePath =
    path.join(
      directory,
      `transcript-${channel.id}.html`,
    );

  await writeFile(
    filePath,
    html,
    'utf8',
  );

  return filePath;
}

/* =========================================================
   CANAL DE TRANSCRIPTS
========================================================= */

async function getTranscriptChannel(
  interaction: ButtonInteraction,
): Promise<TextChannel | null> {
  if (!interaction.guild) {
    await safeReply(
      interaction,
      '❌ Servidor não encontrado.',
      true,
    );

    return null;
  }

  const channelId =
    config.tickets
      .transcriptsChannelId;

  if (!channelId) {
    await safeReply(
      interaction,
      '❌ `TRANSCRIPT_CHANNEL_ID` não está configurado no .env.',
      true,
    );

    return null;
  }

  const channel =
    await interaction.guild.channels.fetch(
      channelId,
    );

  if (
    !channel ||
    channel.type !==
      ChannelType.GuildText
  ) {
    await safeReply(
      interaction,
      '❌ O canal configurado para transcripts não existe ou não é um canal de texto.',
      true,
    );

    return null;
  }

  return channel;
}

/* =========================================================
   LINK DO SITE
========================================================= */

function getTranscriptSiteUrl(
  ticketId: string,
): string | null {
  const baseUrl =
    process.env.WEB_PUBLIC_URL?.trim();

  if (!baseUrl) {
    return null;
  }

  const clean =
    baseUrl.replace(
      /\/+$/,
      '',
    );

  return `${clean}/transcripts/${ticketId}`;
}

/* =========================================================
   BOTÃO DO SITE
========================================================= */

function createTranscriptLinkButton(
  url: string,
): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>()
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
          url,
        ),
    );
}

/* =========================================================
   INFORMAÇÕES GERAIS
========================================================= */

async function showGeneralInfo(
  interaction: ButtonInteraction,
): Promise<void> {
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(
          COLORS.info,
        )
        .setTitle(
          '❔ COMO FUNCIONA',
        )
        .setDescription(
          [
            '## 🎫 CENTRAL DE ATENDIMENTO',
            '',
            '1️⃣ Clique em **Abrir Atendimento**.',
            '',
            '2️⃣ O sistema cria um canal privado.',
            '',
            '3️⃣ Explique o que você precisa.',
            '',
            '4️⃣ Nossa equipe assume o atendimento.',
            '',
            '5️⃣ Quando terminar, o ticket será encerrado.',
            '',
            '6️⃣ O histórico será transformado em transcript.',
            '',
            '🔒 **Seu atendimento permanece privado.**',
          ].join('\n'),
        )
        .setFooter({
          text:
            FOOTER,
        })
        .setTimestamp(),
    ],
    ephemeral:
      true,
  });
}

/* =========================================================
   FINANCEIRO
========================================================= */

async function showFinanceInfo(
  interaction: ButtonInteraction,
): Promise<void> {
  await interaction.reply({
    embeds: [
      new EmbedBuilder()
        .setColor(
          COLORS.success,
        )
        .setTitle(
          '💰 ATENDIMENTO FINANCEIRO',
        )
        .setDescription(
          [
            '> Para assuntos financeiros, abra um atendimento e explique sua solicitação.',
            '',
            'Podemos tratar de:',
            '',
            '💰 Caixa',
            '📥 Entradas',
            '📤 Saídas',
            '💳 Empréstimos',
            '📊 Movimentações',
          ].join('\n'),
        )
        .setFooter({
          text:
            FOOTER,
        })
        .setTimestamp(),
    ],
    ephemeral:
      true,
  });
}

/* =========================================================
   VALIDAR TICKET
========================================================= */

function getTicketChannel(
  interaction: ButtonInteraction,
): TextChannel | null {
  const channel =
    interaction.channel;

  if (
    !channel ||
    channel.type !==
      ChannelType.GuildText
  ) {
    void safeReply(
      interaction,
      '❌ Esta ação precisa ser usada dentro de um ticket.',
      true,
    );

    return null;
  }

  if (
    !channel.topic?.includes(
      'ticket-owner:',
    )
  ) {
    void safeReply(
      interaction,
      '❌ Este canal não foi identificado como um ticket da Ghost Syndicate.',
      true,
    );

    return null;
  }

  return channel;
}

/* =========================================================
   DONO DO TICKET
========================================================= */

function getTicketOwner(
  channel: TextChannel,
): string | null {
  const topic =
    channel.topic ?? '';

  const match =
    topic.match(
      /ticket-owner:(\d+)/,
    );

  return match?.[1] ?? null;
}

/* =========================================================
   STAFF
========================================================= */

function addStaffRole(
  overwrites:
    OverwriteResolvable[],
  roleId:
    | string
    | undefined,
): void {
  if (!roleId) {
    return;
  }

  overwrites.push({
    id:
      roleId,

    allow: [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.SendMessages,
      PermissionFlagsBits.ReadMessageHistory,
      PermissionFlagsBits.AttachFiles,
      PermissionFlagsBits.EmbedLinks,
      PermissionFlagsBits.ManageMessages,
    ],
  });
}

function canUseAdminControls(
  member: GuildMember,
): boolean {
  try {
    requireAdmin(
      member,
    );

    return true;
  } catch {
    return false;
  }
}

/* =========================================================
   ATUALIZAR TOPIC
========================================================= */

async function updateTicketTopic(
  channel: TextChannel,
  key: string,
  value: string,
): Promise<void> {
  const topic =
    channel.topic ?? '';

  const pattern =
    new RegExp(
      `${key}:[^|]+`,
    );

  const next =
    pattern.test(topic)
      ? topic.replace(
          pattern,
          `${key}:${value}`,
        )
      : `${topic} | ${key}:${value}`;

  await channel.setTopic(
    next.slice(
      0,
      1024,
    ),
  );
}

/* =========================================================
   RESPOSTA SEGURA
========================================================= */

async function safeReply(
  interaction: ButtonInteraction,
  content: string,
  ephemeral = false,
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
// apps/bot/src/commands/tickets.ts

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonInteraction,
  ButtonStyle,
  ChannelType,
  ChatInputCommandInteraction,
  EmbedBuilder,
  PermissionFlagsBits,
  TextChannel,
} from 'discord.js';

import { createTranscript } from '../services/transcript.js';
import { db } from '../services/db.js';

/* =========================================================
   TIPOS
========================================================= */

type TicketType =
  | 'SUPORTE'
  | 'FINANCEIRO'
  | 'RECRUTAMENTO';

type PermissionOverwriteData = {
  id: string;

  allow?: bigint[];

  deny?: bigint[];
};

type TicketConfig = {
  guildId: string;

  serverName: string;

  brandName: string;

  primaryColor: string;

  secondaryColor: string;

  footerText: string;

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
   CONSTANTES
========================================================= */

const COLORS = {
  primary: 0x43ff98,

  secondary: 0x7c5cff,

  danger: 0xf15b6b,

  recruitment: 0x8b5cf6,

  warning: 0xffb347,
} as const;

/*
 * Cargo de recrutadores informado pelo cliente.
 */
const DEFAULT_RECRUIT_ROLE_ID =
  '1543474370192736297';

/* =========================================================
   CONFIGURAÇÕES PADRÃO
========================================================= */

const DEFAULTS = {
  serverName:
    'Ghost Syndicate',

  brandName:
    'Ghost Syndicate',

  primaryColor:
    '#43FF98',

  secondaryColor:
    '#07120C',

  footerText:
    'Ghost Syndicate • Organização • Lealdade • Resultado',

  ticketsEnabled:
    true,

  ticketTitle:
    '🎫 CENTRAL DE ATENDIMENTO',

  ticketDescription:
    'Escolha abaixo o tipo de atendimento que você precisa.',

  ticketWelcomeText:
    'Olá {user}! Descreva o que você precisa e aguarde nossa equipe.',

  ticketOpenButtonLabel:
    'Atendimento',

  ticketOpenButtonEmoji:
    '🎫',

  ticketHowButtonLabel:
    'Ajuda',

  ticketHowButtonEmoji:
    '❓',

  ticketFinanceButtonLabel:
    'Financeiro',

  ticketFinanceButtonEmoji:
    '💰',

  recruitmentButtonLabel:
    'Recrutamento',

  recruitmentButtonEmoji:
    '👤',
} as const;

/* =========================================================
   FORMULÁRIO DE RECRUTAMENTO
========================================================= */

const RECRUITMENT_FORM = [
  '👤 **INFORMAÇÕES DO CANDIDATO**',

  '',

  '1. Nome de usuário no Roblox:',
  '2. Idade:',
  '3. Há quanto tempo joga Metrópoles RP?',
  '4. Já participou de alguma facção? Se sim, qual?',
  '5. Quanto tempo costuma jogar por dia?',
  '6. Por que deseja entrar na Ghost Syndicate?',

  '',

  '🎭 **CONHECIMENTO DE RP**',

  '',

  '7. O que significa RDM?',
  '8. O que significa VDM?',
  '9. O que é Metagaming (MG)?',
  '10. O que é Powergaming (PG)?',
  '11. O que é Fear RP?',
  '12. Se outro jogador começar a provocar você durante uma situação de RP, como você deve agir?',
  '13. Se você descobrir uma informação fora do jogo que seu personagem não sabe, pode utilizar essa informação dentro do RP? Explique.',
  '14. Se um membro da Ghost pedir para você fazer algo que viole as regras do Metrópoles, o que você faria?',

  '',

  '👻 **SOBRE A GHOST SYNDICATE**',

  '',

  '15. Você está de acordo com as regras da Ghost Syndicate?',
  '16. Você consegue cumprir as obrigações financeiras estabelecidas pela facção?',
  '17. Está disposto a participar de missões e operações?',
  '18. Como pretende contribuir para o crescimento da Ghost Syndicate?',
  '19. Como pretende pagar a taxa de entrada de 100k?',
  '💵 Dinheiro / 🔫 Arma / 🚗 Veículo',
  '20. Caso seja com arma ou veículo, qual item pretende oferecer?',
] as const;

/* =========================================================
   HELPERS
========================================================= */

function cleanText(
  value: unknown,

  fallback: string,

  maxLength: number,
): string {
  if (
    typeof value !==
    'string'
  ) {
    return fallback;
  }

  const text =
    value.trim();

  if (
    !text
  ) {
    return fallback;
  }

  return text.slice(
    0,
    maxLength,
  );
}

function cleanEmoji(
  value: unknown,

  fallback: string,
): string {
  const emoji =
    String(
      value ??
        '',
    ).trim();

  if (
    !emoji
  ) {
    return fallback;
  }

  return emoji.slice(
    0,
    100,
  );
}

function normalizeHex(
  value:
    | string
    | null
    | undefined,

  fallback:
    number,
): number {
  const raw =
    String(
      value ??
        '',
    )
      .trim()
      .replace(
        /^#/,
        '',
      );

  if (
    !/^[0-9a-fA-F]{6}$/.test(
      raw,
    )
  ) {
    return fallback;
  }

  return Number.parseInt(
    raw,
    16,
  );
}

function cleanChannelName(
  username: string,
): string {
  const normalized =
    username
      .toLowerCase()
      .normalize(
        'NFD',
      )
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
      24,
    ) ||
    'usuario'
  );
}

function getTopicValue(
  channel: TextChannel,

  key: string,
): string | null {
  const topic =
    channel.topic ??
    '';

  const escapedKey =
    key.replace(
      /[.*+?^${}()|[\]\\]/g,
      '\\$&',
    );

  const match =
    topic.match(
      new RegExp(
        `(?:^|;)${escapedKey}=([^;]+)`,
        'i',
      ),
    );

  return (
    match?.[1] ??
    null
  );
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

function replacePlaceholders(
  text: string,

  interaction: ButtonInteraction,
): string {
  return text
    .replaceAll(
      '{user}',
      interaction.user.toString(),
    )
    .replaceAll(
      '{username}',
      interaction.user.username,
    )
    .replaceAll(
      '{server}',
      interaction.guild?.name ??
        DEFAULTS.serverName,
    );
}

/* =========================================================
   CONFIG DO BANCO
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

  if (
    !saved
  ) {
    return {
      guildId,

      serverName:
        DEFAULTS.serverName,

      brandName:
        DEFAULTS.brandName,

      primaryColor:
        DEFAULTS.primaryColor,

      secondaryColor:
        DEFAULTS.secondaryColor,

      footerText:
        DEFAULTS.footerText,

      ticketsEnabled:
        DEFAULTS.ticketsEnabled,

      ticketTitle:
        DEFAULTS.ticketTitle,

      ticketDescription:
        DEFAULTS.ticketDescription,

      ticketWelcomeText:
        DEFAULTS.ticketWelcomeText,

      ticketOpenButtonLabel:
        DEFAULTS.ticketOpenButtonLabel,

      ticketOpenButtonEmoji:
        DEFAULTS.ticketOpenButtonEmoji,

      ticketHowButtonLabel:
        DEFAULTS.ticketHowButtonLabel,

      ticketHowButtonEmoji:
        DEFAULTS.ticketHowButtonEmoji,

      ticketFinanceButtonLabel:
        DEFAULTS.ticketFinanceButtonLabel,

      ticketFinanceButtonEmoji:
        DEFAULTS.ticketFinanceButtonEmoji,

      ticketCategoryId:
        null,

      transcriptChannelId:
        null,

      ownerRoleId:
        null,

      adminRoleId:
        null,

      recruitRoleId:
        DEFAULT_RECRUIT_ROLE_ID,

      financeRoleId:
        null,

      operationsRoleId:
        null,
    };
  }

  return {
    guildId,

    serverName:
      saved.serverName ??
      DEFAULTS.serverName,

    brandName:
      saved.brandName ??
      DEFAULTS.brandName,

    primaryColor:
      saved.primaryColor ??
      DEFAULTS.primaryColor,

    secondaryColor:
      saved.secondaryColor ??
      DEFAULTS.secondaryColor,

    footerText:
      saved.footerText ??
      DEFAULTS.footerText,

    ticketsEnabled:
      saved.ticketsEnabled ??
      DEFAULTS.ticketsEnabled,

    ticketTitle:
      saved.ticketTitle ??
      DEFAULTS.ticketTitle,

    ticketDescription:
      saved.ticketDescription ??
      DEFAULTS.ticketDescription,

    ticketWelcomeText:
      saved.ticketWelcomeText ??
      DEFAULTS.ticketWelcomeText,

    ticketOpenButtonLabel:
      saved.ticketOpenButtonLabel ??
      DEFAULTS.ticketOpenButtonLabel,

    ticketOpenButtonEmoji:
      saved.ticketOpenButtonEmoji ??
      DEFAULTS.ticketOpenButtonEmoji,

    ticketHowButtonLabel:
      saved.ticketHowButtonLabel ??
      DEFAULTS.ticketHowButtonLabel,

    ticketHowButtonEmoji:
      saved.ticketHowButtonEmoji ??
      DEFAULTS.ticketHowButtonEmoji,

    ticketFinanceButtonLabel:
      saved.ticketFinanceButtonLabel ??
      DEFAULTS.ticketFinanceButtonLabel,

    ticketFinanceButtonEmoji:
      saved.ticketFinanceButtonEmoji ??
      DEFAULTS.ticketFinanceButtonEmoji,

    ticketCategoryId:
      saved.ticketCategoryId ??
      null,

    transcriptChannelId:
      saved.transcriptChannelId ??
      null,

    ownerRoleId:
      saved.ownerRoleId ??
      null,

    adminRoleId:
      saved.adminRoleId ??
      null,

    recruitRoleId:
      saved.recruitRoleId ??
      DEFAULT_RECRUIT_ROLE_ID,

    financeRoleId:
      saved.financeRoleId ??
      null,

    operationsRoleId:
      saved.operationsRoleId ??
      null,
  };
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
      Boolean(
        id,
      ),
  );
}

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

  return getStaffRoleIds(
    ticketConfig,
  ).some(
    (
      roleId,
    ) =>
      interaction.member.roles.cache.has(
        roleId,
      ),
  );
}

/* =========================================================
   RECRUTAMENTO
========================================================= */

function getRecruitRoleId(
  ticketConfig: TicketConfig,
): string {
  return (
    ticketConfig.recruitRoleId ??
    DEFAULT_RECRUIT_ROLE_ID
  );
}

function isRecruiter(
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

  return interaction.member.roles.cache.has(
    getRecruitRoleId(
      ticketConfig,
    ),
  );
}

/* =========================================================
   REPLY
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

      flags:
        ephemeral
          ? 64
          : undefined,
    });

    return;
  }

  await interaction.reply({
    content,

    flags:
      ephemeral
        ? 64
        : undefined,
  });
}

async function replyEmbedButton(
  interaction: ButtonInteraction,

  embed: EmbedBuilder,

  ephemeral = false,
): Promise<void> {
  if (
    interaction.replied ||
    interaction.deferred
  ) {
    await interaction.followUp({
      embeds: [
        embed,
      ],

      flags:
        ephemeral
          ? 64
          : undefined,
    });

    return;
  }

  await interaction.reply({
    embeds: [
      embed,
    ],

    flags:
      ephemeral
        ? 64
        : undefined,
  });
}

/* =========================================================
   PERMISSÕES DE RECRUTAMENTO
========================================================= */

function buildRecruitmentPermissions(
  everyoneId: string,

  candidateId: string,

  recruiterRoleId: string,

  botId: string,
): PermissionOverwriteData[] {
  return [
    {
      /*
       * @everyone
       */
      id:
        everyoneId,

      deny: [
        PermissionFlagsBits.ViewChannel,

        PermissionFlagsBits.SendMessages,
      ],
    },

    {
      /*
       * Candidato
       */
      id:
        candidateId,

      allow: [
        PermissionFlagsBits.ViewChannel,

        PermissionFlagsBits.SendMessages,

        PermissionFlagsBits.ReadMessageHistory,

        PermissionFlagsBits.AttachFiles,

        PermissionFlagsBits.EmbedLinks,
      ],
    },

    {
      /*
       * Cargo de recrutadores.
       *
       * Antes de alguém assumir:
       * o cargo pode visualizar e falar.
       */
      id:
        recruiterRoleId,

      allow: [
        PermissionFlagsBits.ViewChannel,

        PermissionFlagsBits.SendMessages,

        PermissionFlagsBits.ReadMessageHistory,

        PermissionFlagsBits.AttachFiles,

        PermissionFlagsBits.EmbedLinks,
      ],
    },

    {
      /*
       * Bot
       */
      id:
        botId,

      allow: [
        PermissionFlagsBits.ViewChannel,

        PermissionFlagsBits.SendMessages,

        PermissionFlagsBits.ReadMessageHistory,

        PermissionFlagsBits.AttachFiles,

        PermissionFlagsBits.EmbedLinks,

        PermissionFlagsBits.ManageChannels,

        PermissionFlagsBits.ManageMessages,
      ],
    },
  ];
}

/* =========================================================
   CENTRAL
========================================================= */

function buildSetupRow(
  ticketConfig: TicketConfig,
): ActionRowBuilder<ButtonBuilder>[] {
  const row1 =
    new ActionRowBuilder<ButtonBuilder>()
      .addComponents(

        new ButtonBuilder()
          .setCustomId(
            'ticket:create',
          )
          .setLabel(
            cleanText(
              ticketConfig.ticketOpenButtonLabel,

              DEFAULTS.ticketOpenButtonLabel,

              80,
            ),
          )
          .setEmoji(
            cleanEmoji(
              ticketConfig.ticketOpenButtonEmoji,

              DEFAULTS.ticketOpenButtonEmoji,
            ),
          )
          .setStyle(
            ButtonStyle.Primary,
          ),

        new ButtonBuilder()
          .setCustomId(
            'ticket:how',
          )
          .setLabel(
            cleanText(
              ticketConfig.ticketHowButtonLabel,

              DEFAULTS.ticketHowButtonLabel,

              80,
            ),
          )
          .setEmoji(
            cleanEmoji(
              ticketConfig.ticketHowButtonEmoji,

              DEFAULTS.ticketHowButtonEmoji,
            ),
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      );

  const row2 =
    new ActionRowBuilder<ButtonBuilder>()
      .addComponents(

        new ButtonBuilder()
          .setCustomId(
            'ticket:finance',
          )
          .setLabel(
            cleanText(
              ticketConfig.ticketFinanceButtonLabel,

              DEFAULTS.ticketFinanceButtonLabel,

              80,
            ),
          )
          .setEmoji(
            cleanEmoji(
              ticketConfig.ticketFinanceButtonEmoji,

              DEFAULTS.ticketFinanceButtonEmoji,
            ),
          )
          .setStyle(
            ButtonStyle.Success,
          ),

        new ButtonBuilder()
          .setCustomId(
            'ticket:recruitment',
          )
          .setLabel(
            DEFAULTS.recruitmentButtonLabel,
          )
          .setEmoji(
            DEFAULTS.recruitmentButtonEmoji,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      );

  return [
    row1,
    row2,
  ];
}

/* =========================================================
   BOTÕES INTERNOS
========================================================= */

function buildManagementRow():
  ActionRowBuilder<ButtonBuilder> {
  return (
    new ActionRowBuilder<ButtonBuilder>()
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
      )
  );
}

/* =========================================================
   /TICKET-SETUP
========================================================= */

export async function handleTicketSetup(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guild =
    interaction.guild;

  if (
    !guild
  ) {
    await interaction.reply({
      content:
        '❌ Este comando precisa ser usado dentro de um servidor.',

      flags:
        64,
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

      flags:
        64,
    });

    return;
  }

  const ticketConfig =
    await getTicketConfig(
      guild.id,
    );

  if (
    !ticketConfig.ticketsEnabled
  ) {
    await interaction.reply({
      content:
        '⚠️ O sistema de tickets está desativado no painel.',

      flags:
        64,
    });

    return;
  }

  if (
    !ticketConfig.ticketCategoryId
  ) {
    await interaction.reply({
      content:
        '⚠️ A categoria de tickets ainda não está configurada no painel administrativo.',

      flags:
        64,
    });

    return;
  }

  const category =
    guild.channels.cache.get(
      ticketConfig.ticketCategoryId,
    );

  if (
    !category ||
    category.type !==
      ChannelType.GuildCategory
  ) {
    await interaction.reply({
      content:
        '⚠️ A categoria configurada não foi encontrada no Discord.',

      flags:
        64,
    });

    return;
  }

  /*
   * EMBED MAIS LIMPO
   */
  const embed =
    new EmbedBuilder()
      .setColor(
        normalizeHex(
          ticketConfig.primaryColor,

          COLORS.primary,
        ),
      )
      .setTitle(
        cleanText(
          ticketConfig.ticketTitle,

          DEFAULTS.ticketTitle,

          256,
        ),
      )
      .setDescription(
        [
          cleanText(
            ticketConfig.ticketDescription,

            DEFAULTS.ticketDescription,

            1000,
          ),

          '',

          'Escolha uma opção abaixo para continuar.',
        ].join(
          '\n',
        ),
      )
      .setFooter({
        text:
          cleanText(
            ticketConfig.footerText,

            DEFAULTS.footerText,

            2048,
          ),
      })
      .setTimestamp();

  await interaction.reply({
    embeds: [
      embed,
    ],

    components:
      buildSetupRow(
        ticketConfig,
      ),
  });
}

/* =========================================================
   ROTEADOR
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

    case 'ticket:recruitment':
      await createTicket(
        interaction,
        'RECRUTAMENTO',
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
   AJUDA
========================================================= */

async function showHowItWorks(
  interaction: ButtonInteraction,
): Promise<void> {
  const ticketConfig =
    interaction.guild
      ? await getTicketConfig(
          interaction.guild.id,
        )
      : null;

  const embed =
    new EmbedBuilder()
      .setColor(
        normalizeHex(
          ticketConfig?.primaryColor,

          COLORS.primary,
        ),
      )
      .setTitle(
        '❓ COMO FUNCIONA',
      )
      .setDescription(
        [
          'Escolha uma opção na central.',

          '',

          '🎫 **Atendimento** — suporte geral.',

          '💰 **Financeiro** — assuntos financeiros.',

          '👤 **Recrutamento** — processo seletivo.',

          '',

          'Depois de abrir, converse no canal privado criado para você.',
        ].join(
          '\n',
        ),
      )
      .setFooter({
        text:
          cleanText(
            ticketConfig?.footerText,

            DEFAULTS.footerText,

            2048,
          ),
      });

  await replyEmbedButton(
    interaction,

    embed,

    true,
  );
}

/* =========================================================
   CRIAÇÃO DO TICKET
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

      '⚠️ O sistema de tickets está desativado.',

      true,
    );

    return;
  }

  if (
    !ticketConfig.ticketCategoryId
  ) {
    await replyButton(
      interaction,

      '⚠️ A categoria de tickets ainda não foi configurada.',

      true,
    );

    return;
  }

  const category =
    guild.channels.cache.get(
      ticketConfig.ticketCategoryId,
    );

  if (
    !category ||
    category.type !==
      ChannelType.GuildCategory
  ) {
    await replyButton(
      interaction,

      '⚠️ A categoria configurada não existe mais no Discord.',

      true,
    );

    return;
  }

  const ownerId =
    interaction.user.id;

  /*
   * Verifica se já existe ticket deste usuário.
   */
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

        return (
          getTopicValue(
            channel as TextChannel,

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
    flags:
      64,
  });

  /* =======================================================
     NOME
  ======================================================= */

  const username =
    cleanChannelName(
      interaction.user.username,
    );

  const prefix =
    type ===
      'FINANCEIRO'
      ? 'financeiro'
      : type ===
        'RECRUTAMENTO'
        ? 'recrutamento'
        : 'ticket';

  const channelName =
    `${prefix}-${username}-${ownerId.slice(-5)}`
      .slice(
        0,
        100,
      );

  /* =======================================================
     BOT
  ======================================================= */

  const botId =
    interaction.client.user.id;

  /* =======================================================
     PERMISSÕES
  ======================================================= */

  let permissionOverwrites:
    PermissionOverwriteData[];

  if (
    type ===
    'RECRUTAMENTO'
  ) {
    permissionOverwrites =
      buildRecruitmentPermissions(
        guild.roles.everyone.id,

        ownerId,

        getRecruitRoleId(
          ticketConfig,
        ),

        botId,
      );
  } else {
    permissionOverwrites = [
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

      {
        id:
          botId,

        allow: [
          PermissionFlagsBits.ViewChannel,

          PermissionFlagsBits.SendMessages,

          PermissionFlagsBits.ReadMessageHistory,

          PermissionFlagsBits.AttachFiles,

          PermissionFlagsBits.EmbedLinks,

          PermissionFlagsBits.ManageChannels,

          PermissionFlagsBits.ManageMessages,
        ],
      },
    ];

    for (
      const roleId of getStaffRoleIds(
        ticketConfig,
      )
    ) {
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
  }

  /* =======================================================
     CRIAR
  ======================================================= */

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

            `created=${Date.now()}`,
          ].join(
            ';',
          ),

        permissionOverwrites,
      });

    /* =====================================================
       RECRUTAMENTO
    ===================================================== */

    if (
      type ===
      'RECRUTAMENTO'
    ) {
      await createRecruitmentTicket(
        interaction,

        channel,

        ticketConfig,
      );

      return;
    }

    /* =====================================================
       SUPORTE / FINANCEIRO
    ===================================================== */

    const isFinance =
      type ===
      'FINANCEIRO';

    const welcome =
      replacePlaceholders(
        cleanText(
          ticketConfig.ticketWelcomeText,

          DEFAULTS.ticketWelcomeText,

          1500,
        ),

        interaction,
      );

    const ticketEmbed =
      new EmbedBuilder()
        .setColor(
          normalizeHex(
            ticketConfig.primaryColor,

            isFinance
              ? COLORS.primary
              : COLORS.secondary,
          ),
        )
        .setTitle(
          isFinance
            ? '💰 ATENDIMENTO FINANCEIRO'
            : '🎫 ATENDIMENTO',
        )
        .setDescription(
          [
            welcome,

            '',

            'Nossa equipe responderá neste canal.',

            '',

            `👤 ${interaction.user}`,
          ].join(
            '\n',
          ),
        )
        .setFooter({
          text:
            cleanText(
              ticketConfig.footerText,

              DEFAULTS.footerText,

              2048,
            ),
        })
        .setTimestamp();

    await channel.send({
      content:
        interaction.user.toString(),

      embeds: [
        ticketEmbed,
      ],

      components: [
        buildManagementRow(),
      ],
    });

    const channelUrl =
      `https://discord.com/channels/${guild.id}/${channel.id}`;

    const successEmbed =
      new EmbedBuilder()
        .setColor(
          normalizeHex(
            ticketConfig.primaryColor,

            COLORS.primary,
          ),
        )
        .setTitle(
          '✅ ATENDIMENTO CRIADO',
        )
        .setDescription(
          [
            'Seu atendimento foi criado.',

            '',

            `🎫 [Abrir #${channel.name}](${channelUrl})`,

            '',

            'Nossa equipe responderá em breve.',
          ].join(
            '\n',
          ),
        )
        .setFooter({
          text:
            cleanText(
              ticketConfig.footerText,

              DEFAULTS.footerText,

              2048,
            ),
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

    if (
      interaction.deferred
    ) {
      await interaction.editReply({
        content:
          '❌ Não foi possível criar o atendimento. Verifique a categoria e as permissões do bot.',
      });
    }
  }
}

/* =========================================================
   RECRUTAMENTO
========================================================= */

async function createRecruitmentTicket(
  interaction: ButtonInteraction,

  channel: TextChannel,

  ticketConfig: TicketConfig,
): Promise<void> {
  const candidate =
    interaction.user;

  const recruiterRoleId =
    getRecruitRoleId(
      ticketConfig,
    );

  const embed =
    new EmbedBuilder()
      .setColor(
        normalizeHex(
          ticketConfig.primaryColor,

          COLORS.recruitment,
        ),
      )
      .setTitle(
        '👤 RECRUTAMENTO',
      )
      .setDescription(
        [
          `Olá ${candidate}!`,

          '',

          'Responda ao formulário abaixo com atenção.',

          '',

          '👔 **Um recrutador ficará responsável pelo atendimento.**',

          '',

          '━━━━━━━━━━━━━━━━',

          RECRUITMENT_FORM.join(
            '\n',
          ),

          '',

          '━━━━━━━━━━━━━━━━',
        ].join(
          '\n',
        ),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Processo de Recrutamento',
      })
      .setTimestamp();

  await channel.send({
    content:
      candidate.toString(),

    embeds: [
      embed,
    ],

    components: [
      buildManagementRow(),
    ],
  });

  const channelUrl =
    `https://discord.com/channels/${interaction.guild!.id}/${channel.id}`;

  const successEmbed =
    new EmbedBuilder()
      .setColor(
        COLORS.recruitment,
      )
      .setTitle(
        '✅ RECRUTAMENTO ABERTO',
      )
      .setDescription(
        [
          'Seu processo de recrutamento foi criado.',

          '',

          `👤 **Candidato:** ${candidate}`,

          '',

          `🎫 [Abrir recrutamento](https://discord.com/channels/${interaction.guild!.id}/${channel.id})`,

          '',

          'Aguarde um recrutador assumir o atendimento.',
        ].join(
          '\n',
        ),
      )
      .setFooter({
        text:
          cleanText(
            ticketConfig.footerText,

            DEFAULTS.footerText,

            2048,
          ),
      })
      .setTimestamp();

  await interaction.editReply({
    embeds: [
      successEmbed,
    ],
  });
}

/* =========================================================
   ASSUMIR TICKET
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

  if (
    !interaction.channel ||
    interaction.channel.type !==
      ChannelType.GuildText
  ) {
    await replyButton(
      interaction,

      '❌ Este botão precisa estar dentro de um ticket.',

      true,
    );

    return;
  }

  const channel =
    interaction.channel as TextChannel;

  if (
    !isTicketChannel(
      channel,
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

  const ticketType =
    getTopicValue(
      channel,

      'ticket-type',
    );

  /* =======================================================
     QUEM PODE ASSUMIR
  ======================================================= */

  if (
    ticketType ===
    'RECRUTAMENTO'
  ) {
    if (
      !isRecruiter(
        interaction,

        ticketConfig,
      )
    ) {
      await replyButton(
        interaction,

        '⛔ Apenas um recrutador pode assumir este processo.',

        true,
      );

      return;
    }
  } else if (
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

  /* =======================================================
     JÁ ASSUMIDO
  ======================================================= */

  const assigned =
    getTopicValue(
      channel,

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

  /* =======================================================
     RECRUTAMENTO
     TRAVA OS OUTROS RECRUTADORES
  ======================================================= */

  if (
    ticketType ===
    'RECRUTAMENTO'
  ) {
    const recruitRole =
      interaction.guild.roles.cache.get(
        getRecruitRoleId(
          ticketConfig,
        ),
      );

    if (
      recruitRole
    ) {
      /*
       * Remove o direito de falar do cargo.
       */
      await channel.permissionOverwrites.edit(
        recruitRole,

        {
          SendMessages:
            false,

          ViewChannel:
            true,

          ReadMessageHistory:
            true,
        },
      );

      /*
       * Devolve o direito de falar apenas
       * para quem assumiu.
       */
      await channel.permissionOverwrites.edit(
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
    }
  }

  /* =======================================================
     SALVAR RESPONSÁVEL
  ======================================================= */

  const currentTopic =
    channel.topic ??
    '';

  await channel.setTopic(
    [
      currentTopic,

      `ticket-assigned=${interaction.user.id}`,
    ]
      .filter(
        Boolean,
      )
      .join(
        ';',
      )
      .slice(
        0,
        1024,
      ),
  );

  /* =======================================================
     CONFIRMAÇÃO
  ======================================================= */

  const embed =
    new EmbedBuilder()
      .setColor(
        ticketType ===
          'RECRUTAMENTO'
          ? COLORS.recruitment
          : COLORS.primary,
      )
      .setTitle(
        ticketType ===
          'RECRUTAMENTO'
          ? '👔 RECRUTAMENTO ASSUMIDO'
          : '🛡️ ATENDIMENTO ASSUMIDO',
      )
      .setDescription(
        ticketType ===
          'RECRUTAMENTO'
          ? `${interaction.user} assumiu este processo de recrutamento.`
          : `${interaction.user} assumiu este atendimento.`,
      )
      .setFooter({
        text:
          cleanText(
            ticketConfig.footerText,

            DEFAULTS.footerText,

            2048,
          ),
      })
      .setTimestamp();

  await replyEmbedButton(
    interaction,

    embed,

    false,
  );
}

/* =========================================================
   TRANSCRIPT
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

  if (
    !interaction.channel ||
    interaction.channel.type !==
      ChannelType.GuildText
  ) {
    await replyButton(
      interaction,

      '❌ Este botão precisa estar dentro de um ticket.',

      true,
    );

    return;
  }

  const channel =
    interaction.channel as TextChannel;

  if (
    !isTicketChannel(
      channel,
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

  const ticketType =
    getTopicValue(
      channel,

      'ticket-type',
    );

  const assigned =
    getTopicValue(
      channel,

      'ticket-assigned',
    );

  /* =======================================================
     RECRUTAMENTO
  ======================================================= */

  if (
    ticketType ===
    'RECRUTAMENTO'
  ) {
    if (
      !isRecruiter(
        interaction,

        ticketConfig,
      )
    ) {
      await replyButton(
        interaction,

        '⛔ Apenas recrutadores podem gerar o transcript.',

        true,
      );

      return;
    }

    if (
      assigned &&
      assigned !==
        interaction.user.id &&
      !interaction.member.permissions.has(
        PermissionFlagsBits.Administrator,
      )
    ) {
      await replyButton(
        interaction,

        '⛔ Este recrutamento já foi assumido por outro recrutador.',

        true,
      );

      return;
    }
  } else if (
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
    flags:
      64,
  });

  try {
    const transcriptPath =
      await createTranscript(
        channel,

        interaction.user.tag,
      );

    let transcriptUrl:
      | string
      | null =
      null;

    if (
      ticketConfig.transcriptChannelId
    ) {
      const transcriptChannel =
        interaction.guild.channels.cache.get(
          ticketConfig.transcriptChannelId,
        );

      if (
        transcriptChannel &&
        transcriptChannel.type ===
          ChannelType.GuildText
      ) {
        const archiveMessage =
          await transcriptChannel.send({
            content:
              [
                `📜 **Transcript de ${channel.name}**`,

                `👤 **Gerado por:** ${interaction.user}`,

                ticketType ===
                  'RECRUTAMENTO'
                  ? '👔 **Tipo:** Recrutamento'
                  : '',
              ]
                .filter(
                  Boolean,
                )
                .join(
                  '\n',
                ),

            files: [
              transcriptPath,
            ],
          });

        transcriptUrl =
          archiveMessage.attachments.first()
            ?.url ??
          null;
      }
    }

    const embed =
      new EmbedBuilder()
        .setColor(
          ticketType ===
            'RECRUTAMENTO'
            ? COLORS.recruitment
            : COLORS.primary,
        )
        .setTitle(
          '📜 TRANSCRIPT GERADO',
        )
        .setDescription(
          transcriptUrl
            ? [
                'O histórico foi salvo com sucesso.',

                '',

                'Clique no botão abaixo para abrir o transcript.',

                '',

                `👤 **Gerado por:** ${interaction.user}`,
              ].join(
                '\n',
              )
            : [
                'O histórico foi processado.',

                '',

                '⚠️ O canal de transcript não retornou o arquivo.',

                '',

                `👤 **Gerado por:** ${interaction.user}`,
              ].join(
                '\n',
              ),
        )
        .setFooter({
          text:
            cleanText(
              ticketConfig.footerText,

              DEFAULTS.footerText,

              2048,
            ),
        })
        .setTimestamp();

    const components =
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
        : [];

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

  if (
    !interaction.channel ||
    interaction.channel.type !==
      ChannelType.GuildText
  ) {
    await replyButton(
      interaction,

      '❌ Este botão precisa estar dentro de um ticket.',

      true,
    );

    return;
  }

  const channel =
    interaction.channel as TextChannel;

  if (
    !isTicketChannel(
      channel,
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

  const ticketType =
    getTopicValue(
      channel,

      'ticket-type',
    );

  const ownerId =
    getTopicValue(
      channel,

      'ticket-owner',
    );

  const assigned =
    getTopicValue(
      channel,

      'ticket-assigned',
    );

  /* =======================================================
     AUTORIZAÇÃO
  ======================================================= */

  if (
    ticketType ===
    'RECRUTAMENTO'
  ) {
    const recruiter =
      isRecruiter(
        interaction,

        ticketConfig,
      );

    const administrator =
      interaction.member.permissions.has(
        PermissionFlagsBits.Administrator,
      );

    if (
      !recruiter &&
      !administrator
    ) {
      await replyButton(
        interaction,

        '⛔ Somente um recrutador pode encerrar este processo.',

        true,
      );

      return;
    }

    if (
      assigned &&
      assigned !==
        interaction.user.id &&
      !administrator
    ) {
      await replyButton(
        interaction,

        '⛔ Este recrutamento já foi assumido por outro recrutador.',

        true,
      );

      return;
    }
  } else {
    if (
      !hasStaffPermission(
        interaction,

        ticketConfig,
      ) &&
      ownerId !==
        interaction.user.id
    ) {
      await replyButton(
        interaction,

        '⛔ Você não possui permissão para encerrar este atendimento.',

        true,
      );

      return;
    }
  }

  await interaction.deferReply({
    flags:
      64,
  });

  let transcriptPath:
    | string
    | null =
      null;

  let transcriptUrl:
    | string
    | null =
      null;

  /* =======================================================
     TRANSCRIPT
  ======================================================= */

  try {
    transcriptPath =
      await createTranscript(
        channel,

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

  /* =======================================================
     ARQUIVAR
  ======================================================= */

  if (
    transcriptPath &&
    ticketConfig.transcriptChannelId
  ) {
    try {
      const transcriptChannel =
        interaction.guild.channels.cache.get(
          ticketConfig.transcriptChannelId,
        );

      if (
        transcriptChannel &&
        transcriptChannel.type ===
          ChannelType.GuildText
      ) {
        const archiveMessage =
          await transcriptChannel.send({
            content:
              [
                `📜 **Transcript de ${channel.name}**`,

                ownerId
                  ? `👤 **Solicitante:** <@${ownerId}>`
                  : '👤 **Solicitante:** Não identificado',

                `🔒 **Encerrado por:** ${interaction.user}`,

                ticketType ===
                  'RECRUTAMENTO'
                  ? '👔 **Tipo:** Recrutamento'
                  : '',
              ]
                .filter(
                  Boolean,
                )
                .join(
                  '\n',
                ),

            files: [
              transcriptPath,
            ],
          });

        transcriptUrl =
          archiveMessage.attachments.first()
            ?.url ??
          null;
      }
    } catch (
      error
    ) {
      console.error(
        '⚠️ [TRANSCRIPT ARCHIVE]',
        error,
      );
    }
  }

  /* =======================================================
     LINK
  ======================================================= */

  const channelUrl =
    `https://discord.com/channels/${interaction.guild.id}/${channel.id}`;

  /* =======================================================
     EMBED FINAL
  ======================================================= */

  const embed =
    new EmbedBuilder()
      .setColor(
        ticketType ===
          'RECRUTAMENTO'
          ? COLORS.recruitment
          : COLORS.primary,
      )
      .setTitle(
        ticketType ===
          'RECRUTAMENTO'
          ? '🔒 RECRUTAMENTO ENCERRADO'
          : '🔒 ATENDIMENTO ENCERRADO',
      )
      .setDescription(
        [
          ticketType ===
            'RECRUTAMENTO'
            ? 'O processo de recrutamento foi encerrado.'
            : 'O atendimento foi encerrado.',

          '',

          `🎫 **Canal:** [#${channel.name}](${channelUrl})`,

          '',

          transcriptUrl
            ? '📜 **Transcript:** o histórico foi preservado com sucesso.'
            : transcriptPath
              ? '📜 **Transcript:** gerado, mas não foi possível obter o link do arquivo.'
              : '📜 **Transcript:** não foi possível gerar.',

          '',

          ticketType ===
            'RECRUTAMENTO'
            ? '👔 O processo poderá ser analisado pela equipe.'
            : '✅ Obrigado por utilizar a Central de Atendimento.',

          '',

          `👤 **Encerrado por:** ${interaction.user}`,
        ].join(
          '\n',
        ),
      )
      .setFooter({
        text:
          cleanText(
            ticketConfig.footerText,

            DEFAULTS.footerText,

            2048,
          ),
      })
      .setTimestamp();

  const components =
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
      : [];

  /*
   * UMA ÚNICA RESPOSTA.
   */
  await interaction.editReply({
    embeds: [
      embed,
    ],

    components,
  });

  /* =======================================================
     EXCLUIR
  ======================================================= */

  setTimeout(
    () => {

      void channel
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
    3500,
  );
}
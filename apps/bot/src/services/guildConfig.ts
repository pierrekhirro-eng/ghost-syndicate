// apps/bot/src/services/guildConfig.ts

import { db } from './db.js';

/* =========================================================
   TIPOS PÚBLICOS
========================================================= */

export type GuildConfigData = {
  id: string;
  guildId: string;

  // Identidade
  serverName: string;
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  footerText: string;

  // Tickets
  ticketsEnabled: boolean;
  ticketTitle: string;
  ticketDescription: string;
  ticketWelcomeText: string;

  // Botões
  ticketOpenButtonLabel: string;
  ticketOpenButtonEmoji: string;

  ticketHowButtonLabel: string;
  ticketHowButtonEmoji: string;

  ticketFinanceButtonLabel: string;
  ticketFinanceButtonEmoji: string;

  // Canais
  ticketCategoryId: string | null;
  transcriptChannelId: string | null;

  // Cargos
  ownerRoleId: string | null;
  adminRoleId: string | null;
  recruitRoleId: string | null;
  financeRoleId: string | null;
  operationsRoleId: string | null;

  // Ranking
  rankingEnabled: boolean;
  rankingChannelId: string | null;
  rankingTitle: string;
  rankingDescription: string;

  // Financeiro
  financeEnabled: boolean;

  // Moderação
  moderationEnabled: boolean;

  // Datas
  createdAt: Date;
  updatedAt: Date;
};

export type GuildConfigPatch = Partial<{
  // Identidade
  serverName: string;
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  footerText: string;

  // Tickets
  ticketsEnabled: boolean;
  ticketTitle: string;
  ticketDescription: string;
  ticketWelcomeText: string;

  // Botões
  ticketOpenButtonLabel: string;
  ticketOpenButtonEmoji: string;

  ticketHowButtonLabel: string;
  ticketHowButtonEmoji: string;

  ticketFinanceButtonLabel: string;
  ticketFinanceButtonEmoji: string;

  // Canais
  ticketCategoryId: string | null;
  transcriptChannelId: string | null;

  // Cargos
  ownerRoleId: string | null;
  adminRoleId: string | null;
  recruitRoleId: string | null;
  financeRoleId: string | null;
  operationsRoleId: string | null;

  // Ranking
  rankingEnabled: boolean;
  rankingChannelId: string | null;
  rankingTitle: string;
  rankingDescription: string;

  // Financeiro
  financeEnabled: boolean;

  // Moderação
  moderationEnabled: boolean;
}>;

export type TicketConfigPatch = Partial<{
  enabled: boolean;

  title: string;
  description: string;
  welcomeText: string;

  openButtonLabel: string;
  openButtonEmoji: string;

  howButtonLabel: string;
  howButtonEmoji: string;

  financeButtonLabel: string;
  financeButtonEmoji: string;

  categoryId: string | null;
  transcriptChannelId: string | null;
}>;

export type RoleConfigPatch = Partial<{
  ownerRoleId: string | null;
  adminRoleId: string | null;
  recruitRoleId: string | null;
  financeRoleId: string | null;
  operationsRoleId: string | null;
}>;

export type AppearanceConfigPatch = Partial<{
  serverName: string;
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  footerText: string;
}>;

export type RankingConfigPatch = Partial<{
  enabled: boolean;
  channelId: string | null;
  title: string;
  description: string;
}>;

export type FinanceConfigPatch = Partial<{
  enabled: boolean;
}>;

export type ModerationConfigPatch = Partial<{
  enabled: boolean;
}>;

/* =========================================================
   CONSTANTES
========================================================= */

const DEFAULT_CONFIG = {
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
    'Abra um atendimento privado com nossa equipe.',

  ticketWelcomeText:
    'Olá {user}, seu atendimento foi aberto. Explique abaixo o que você precisa e aguarde nossa equipe.',

  ticketOpenButtonLabel:
    'Abrir Atendimento',

  ticketOpenButtonEmoji:
    '🎫',

  ticketHowButtonLabel:
    'Como funciona',

  ticketHowButtonEmoji:
    '❓',

  ticketFinanceButtonLabel:
    'Financeiro',

  ticketFinanceButtonEmoji:
    '💰',

  rankingEnabled:
    true,

  rankingTitle:
    '🎙️ Ranking de horas em call',

  rankingDescription:
    'Acompanhe o tempo acumulado da equipe nos canais de voz.',

  financeEnabled:
    true,

  moderationEnabled:
    true,
} as const;

/* =========================================================
   NORMALIZAÇÃO
========================================================= */

function cleanText(
  value: string,
  fallback: string,
): string {
  const cleaned =
    value.trim();

  return cleaned.length > 0
    ? cleaned
    : fallback;
}

function cleanOptionalId(
  value: string | null,
): string | null {
  if (
    value === null
  ) {
    return null;
  }

  const cleaned =
    value.trim();

  return cleaned.length > 0
    ? cleaned
    : null;
}

function normalizeHexColor(
  value: string,
  fallback: string,
): string {
  const cleaned =
    value.trim();

  if (
    /^#[0-9A-Fa-f]{6}$/.test(
      cleaned,
    )
  ) {
    return cleaned.toUpperCase();
  }

  return fallback;
}

function normalizeEmoji(
  value: string,
  fallback: string,
): string {
  const cleaned =
    value.trim();

  if (
    cleaned.length === 0
  ) {
    return fallback;
  }

  /*
   * Discord aceita emojis Unicode.
   * Não vamos impor uma validação agressiva aqui,
   * porque emojis compostos também podem ser válidos.
   */

  return cleaned.slice(
    0,
    32,
  );
}

function normalizeButtonLabel(
  value: string,
  fallback: string,
): string {
  return cleanText(
    value,
    fallback,
  ).slice(
    0,
    80,
  );
}

function normalizeLongText(
  value: string,
  fallback: string,
  maxLength: number,
): string {
  return cleanText(
    value,
    fallback,
  ).slice(
    0,
    maxLength,
  );
}

/* =========================================================
   BUSCAR CONFIGURAÇÃO
========================================================= */

export async function getGuildConfig(
  guildId: string,
) {
  if (
    !guildId
  ) {
    throw new Error(
      'guildId é obrigatório.',
    );
  }

  return db.guildConfig.findUnique({
    where: {
      guildId,
    },
  });
}

/* =========================================================
   GARANTIR GUILD + CONFIG
========================================================= */

export async function getOrCreateGuildConfig(
  guildId: string,
  guildName = DEFAULT_CONFIG.brandName,
) {
  if (
    !guildId
  ) {
    throw new Error(
      'guildId é obrigatório.',
    );
  }

  /*
   * A Guild precisa existir antes da configuração
   * porque GuildConfig possui relação obrigatória
   * com Guild.
   */

  await db.guild.upsert({
    where: {
      id: guildId,
    },

    create: {
      id:
        guildId,

      name:
        cleanText(
          guildName,
          DEFAULT_CONFIG.brandName,
        ),
    },

    update: {
      name:
        cleanText(
          guildName,
          DEFAULT_CONFIG.brandName,
        ),
    },
  });

  /*
   * Cria a configuração somente se ainda não existir.
   *
   * O Prisma aplica também os defaults definidos
   * no schema.prisma.
   */

  const config =
    await db.guildConfig.upsert({
      where: {
        guildId,
      },

      create: {
        guildId,

        serverName:
          cleanText(
            guildName,
            DEFAULT_CONFIG.brandName,
          ),

        brandName:
          DEFAULT_CONFIG.brandName,

        primaryColor:
          DEFAULT_CONFIG.primaryColor,

        secondaryColor:
          DEFAULT_CONFIG.secondaryColor,

        footerText:
          DEFAULT_CONFIG.footerText,

        ticketsEnabled:
          DEFAULT_CONFIG.ticketsEnabled,

        ticketTitle:
          DEFAULT_CONFIG.ticketTitle,

        ticketDescription:
          DEFAULT_CONFIG.ticketDescription,

        ticketWelcomeText:
          DEFAULT_CONFIG.ticketWelcomeText,

        ticketOpenButtonLabel:
          DEFAULT_CONFIG.ticketOpenButtonLabel,

        ticketOpenButtonEmoji:
          DEFAULT_CONFIG.ticketOpenButtonEmoji,

        ticketHowButtonLabel:
          DEFAULT_CONFIG.ticketHowButtonLabel,

        ticketHowButtonEmoji:
          DEFAULT_CONFIG.ticketHowButtonEmoji,

        ticketFinanceButtonLabel:
          DEFAULT_CONFIG.ticketFinanceButtonLabel,

        ticketFinanceButtonEmoji:
          DEFAULT_CONFIG.ticketFinanceButtonEmoji,

        rankingEnabled:
          DEFAULT_CONFIG.rankingEnabled,

        rankingTitle:
          DEFAULT_CONFIG.rankingTitle,

        rankingDescription:
          DEFAULT_CONFIG.rankingDescription,

        financeEnabled:
          DEFAULT_CONFIG.financeEnabled,

        moderationEnabled:
          DEFAULT_CONFIG.moderationEnabled,
      },

      update: {
        /*
         * Não sobrescrevemos configurações personalizadas
         * toda vez que o bot iniciar.
         */
      },
    });

  return config;
}

/* =========================================================
   ALIAS EXPLÍCITO
========================================================= */

export async function ensureGuildConfig(
  guildId: string,
  guildName = DEFAULT_CONFIG.brandName,
) {
  return getOrCreateGuildConfig(
    guildId,
    guildName,
  );
}

/* =========================================================
   ATUALIZAÇÃO GENÉRICA
========================================================= */

export async function updateGuildConfig(
  guildId: string,
  patch: GuildConfigPatch,
  guildName = DEFAULT_CONFIG.brandName,
) {
  if (
    !patch ||
    Object.keys(
      patch,
    ).length === 0
  ) {
    return getOrCreateGuildConfig(
      guildId,
      guildName,
    );
  }

  await getOrCreateGuildConfig(
    guildId,
    guildName,
  );

  /*
   * Montamos o objeto explicitamente.
   *
   * Isso impede que campos desconhecidos enviados
   * pelo futuro painel caiam diretamente no banco.
   */

  const data: GuildConfigPatch =
    {};

  if (
    patch.serverName !== undefined
  ) {
    data.serverName =
      cleanText(
        patch.serverName,
        guildName,
      ).slice(
        0,
        100,
      );
  }

  if (
    patch.brandName !== undefined
  ) {
    data.brandName =
      cleanText(
        patch.brandName,
        DEFAULT_CONFIG.brandName,
      ).slice(
        0,
        100,
      );
  }

  if (
    patch.primaryColor !== undefined
  ) {
    data.primaryColor =
      normalizeHexColor(
        patch.primaryColor,
        DEFAULT_CONFIG.primaryColor,
      );
  }

  if (
    patch.secondaryColor !== undefined
  ) {
    data.secondaryColor =
      normalizeHexColor(
        patch.secondaryColor,
        DEFAULT_CONFIG.secondaryColor,
      );
  }

  if (
    patch.footerText !== undefined
  ) {
    data.footerText =
      normalizeLongText(
        patch.footerText,
        DEFAULT_CONFIG.footerText,
        2048,
      );
  }

  if (
    patch.ticketsEnabled !== undefined
  ) {
    data.ticketsEnabled =
      Boolean(
        patch.ticketsEnabled,
      );
  }

  if (
    patch.ticketTitle !== undefined
  ) {
    data.ticketTitle =
      normalizeLongText(
        patch.ticketTitle,
        DEFAULT_CONFIG.ticketTitle,
        256,
      );
  }

  if (
    patch.ticketDescription !== undefined
  ) {
    data.ticketDescription =
      normalizeLongText(
        patch.ticketDescription,
        DEFAULT_CONFIG.ticketDescription,
        4000,
      );
  }

  if (
    patch.ticketWelcomeText !== undefined
  ) {
    data.ticketWelcomeText =
      normalizeLongText(
        patch.ticketWelcomeText,
        DEFAULT_CONFIG.ticketWelcomeText,
        4000,
      );
  }

  if (
    patch.ticketOpenButtonLabel !== undefined
  ) {
    data.ticketOpenButtonLabel =
      normalizeButtonLabel(
        patch.ticketOpenButtonLabel,
        DEFAULT_CONFIG.ticketOpenButtonLabel,
      );
  }

  if (
    patch.ticketOpenButtonEmoji !== undefined
  ) {
    data.ticketOpenButtonEmoji =
      normalizeEmoji(
        patch.ticketOpenButtonEmoji,
        DEFAULT_CONFIG.ticketOpenButtonEmoji,
      );
  }

  if (
    patch.ticketHowButtonLabel !== undefined
  ) {
    data.ticketHowButtonLabel =
      normalizeButtonLabel(
        patch.ticketHowButtonLabel,
        DEFAULT_CONFIG.ticketHowButtonLabel,
      );
  }

  if (
    patch.ticketHowButtonEmoji !== undefined
  ) {
    data.ticketHowButtonEmoji =
      normalizeEmoji(
        patch.ticketHowButtonEmoji,
        DEFAULT_CONFIG.ticketHowButtonEmoji,
      );
  }

  if (
    patch.ticketFinanceButtonLabel !== undefined
  ) {
    data.ticketFinanceButtonLabel =
      normalizeButtonLabel(
        patch.ticketFinanceButtonLabel,
        DEFAULT_CONFIG.ticketFinanceButtonLabel,
      );
  }

  if (
    patch.ticketFinanceButtonEmoji !== undefined
  ) {
    data.ticketFinanceButtonEmoji =
      normalizeEmoji(
        patch.ticketFinanceButtonEmoji,
        DEFAULT_CONFIG.ticketFinanceButtonEmoji,
      );
  }

  if (
    patch.ticketCategoryId !== undefined
  ) {
    data.ticketCategoryId =
      cleanOptionalId(
        patch.ticketCategoryId,
      );
  }

  if (
    patch.transcriptChannelId !== undefined
  ) {
    data.transcriptChannelId =
      cleanOptionalId(
        patch.transcriptChannelId,
      );
  }

  if (
    patch.ownerRoleId !== undefined
  ) {
    data.ownerRoleId =
      cleanOptionalId(
        patch.ownerRoleId,
      );
  }

  if (
    patch.adminRoleId !== undefined
  ) {
    data.adminRoleId =
      cleanOptionalId(
        patch.adminRoleId,
      );
  }

  if (
    patch.recruitRoleId !== undefined
  ) {
    data.recruitRoleId =
      cleanOptionalId(
        patch.recruitRoleId,
      );
  }

  if (
    patch.financeRoleId !== undefined
  ) {
    data.financeRoleId =
      cleanOptionalId(
        patch.financeRoleId,
      );
  }

  if (
    patch.operationsRoleId !== undefined
  ) {
    data.operationsRoleId =
      cleanOptionalId(
        patch.operationsRoleId,
      );
  }

  if (
    patch.rankingEnabled !== undefined
  ) {
    data.rankingEnabled =
      Boolean(
        patch.rankingEnabled,
      );
  }

  if (
    patch.rankingChannelId !== undefined
  ) {
    data.rankingChannelId =
      cleanOptionalId(
        patch.rankingChannelId,
      );
  }

  if (
    patch.rankingTitle !== undefined
  ) {
    data.rankingTitle =
      normalizeLongText(
        patch.rankingTitle,
        DEFAULT_CONFIG.rankingTitle,
        256,
      );
  }

  if (
    patch.rankingDescription !== undefined
  ) {
    data.rankingDescription =
      normalizeLongText(
        patch.rankingDescription,
        DEFAULT_CONFIG.rankingDescription,
        4000,
      );
  }

  if (
    patch.financeEnabled !== undefined
  ) {
    data.financeEnabled =
      Boolean(
        patch.financeEnabled,
      );
  }

  if (
    patch.moderationEnabled !== undefined
  ) {
    data.moderationEnabled =
      Boolean(
        patch.moderationEnabled,
      );
  }

  if (
    Object.keys(
      data,
    ).length === 0
  ) {
    return getGuildConfig(
      guildId,
    );
  }

  return db.guildConfig.update({
    where: {
      guildId,
    },

    data,
  });
}

/* =========================================================
   CONFIGURAÇÃO DE TICKETS
========================================================= */

export async function updateTicketConfig(
  guildId: string,
  patch: TicketConfigPatch,
  guildName = DEFAULT_CONFIG.brandName,
) {
  const data: GuildConfigPatch =
    {};

  if (
    patch.enabled !== undefined
  ) {
    data.ticketsEnabled =
      Boolean(
        patch.enabled,
      );
  }

  if (
    patch.title !== undefined
  ) {
    data.ticketTitle =
      patch.title;
  }

  if (
    patch.description !== undefined
  ) {
    data.ticketDescription =
      patch.description;
  }

  if (
    patch.welcomeText !== undefined
  ) {
    data.ticketWelcomeText =
      patch.welcomeText;
  }

  if (
    patch.openButtonLabel !== undefined
  ) {
    data.ticketOpenButtonLabel =
      patch.openButtonLabel;
  }

  if (
    patch.openButtonEmoji !== undefined
  ) {
    data.ticketOpenButtonEmoji =
      patch.openButtonEmoji;
  }

  if (
    patch.howButtonLabel !== undefined
  ) {
    data.ticketHowButtonLabel =
      patch.howButtonLabel;
  }

  if (
    patch.howButtonEmoji !== undefined
  ) {
    data.ticketHowButtonEmoji =
      patch.howButtonEmoji;
  }

  if (
    patch.financeButtonLabel !== undefined
  ) {
    data.ticketFinanceButtonLabel =
      patch.financeButtonLabel;
  }

  if (
    patch.financeButtonEmoji !== undefined
  ) {
    data.ticketFinanceButtonEmoji =
      patch.financeButtonEmoji;
  }

  if (
    patch.categoryId !== undefined
  ) {
    data.ticketCategoryId =
      patch.categoryId;
  }

  if (
    patch.transcriptChannelId !== undefined
  ) {
    data.transcriptChannelId =
      patch.transcriptChannelId;
  }

  return updateGuildConfig(
    guildId,
    data,
    guildName,
  );
}

/* =========================================================
   CONFIGURAÇÃO DE CARGOS
========================================================= */

export async function updateRoleConfig(
  guildId: string,
  patch: RoleConfigPatch,
  guildName = DEFAULT_CONFIG.brandName,
) {
  return updateGuildConfig(
    guildId,
    {
      ownerRoleId:
        patch.ownerRoleId,

      adminRoleId:
        patch.adminRoleId,

      recruitRoleId:
        patch.recruitRoleId,

      financeRoleId:
        patch.financeRoleId,

      operationsRoleId:
        patch.operationsRoleId,
    },
    guildName,
  );
}

/* =========================================================
   CONFIGURAÇÃO VISUAL
========================================================= */

export async function updateAppearanceConfig(
  guildId: string,
  patch: AppearanceConfigPatch,
  guildName = DEFAULT_CONFIG.brandName,
) {
  return updateGuildConfig(
    guildId,
    {
      serverName:
        patch.serverName,

      brandName:
        patch.brandName,

      primaryColor:
        patch.primaryColor,

      secondaryColor:
        patch.secondaryColor,

      footerText:
        patch.footerText,
    },
    guildName,
  );
}

/* =========================================================
   CONFIGURAÇÃO DO RANKING
========================================================= */

export async function updateRankingConfig(
  guildId: string,
  patch: RankingConfigPatch,
  guildName = DEFAULT_CONFIG.brandName,
) {
  return updateGuildConfig(
    guildId,
    {
      rankingEnabled:
        patch.enabled,

      rankingChannelId:
        patch.channelId,

      rankingTitle:
        patch.title,

      rankingDescription:
        patch.description,
    },
    guildName,
  );
}

/* =========================================================
   CONFIGURAÇÃO FINANCEIRA
========================================================= */

export async function updateFinanceConfig(
  guildId: string,
  patch: FinanceConfigPatch,
  guildName = DEFAULT_CONFIG.brandName,
) {
  return updateGuildConfig(
    guildId,
    {
      financeEnabled:
        patch.enabled,
    },
    guildName,
  );
}

/* =========================================================
   CONFIGURAÇÃO DE MODERAÇÃO
========================================================= */

export async function updateModerationConfig(
  guildId: string,
  patch: ModerationConfigPatch,
  guildName = DEFAULT_CONFIG.brandName,
) {
  return updateGuildConfig(
    guildId,
    {
      moderationEnabled:
        patch.enabled,
    },
    guildName,
  );
}

/* =========================================================
   RESETAR APENAS TICKETS
========================================================= */

export async function resetTicketConfig(
  guildId: string,
  guildName = DEFAULT_CONFIG.brandName,
) {
  return updateGuildConfig(
    guildId,
    {
      ticketsEnabled:
        DEFAULT_CONFIG.ticketsEnabled,

      ticketTitle:
        DEFAULT_CONFIG.ticketTitle,

      ticketDescription:
        DEFAULT_CONFIG.ticketDescription,

      ticketWelcomeText:
        DEFAULT_CONFIG.ticketWelcomeText,

      ticketOpenButtonLabel:
        DEFAULT_CONFIG.ticketOpenButtonLabel,

      ticketOpenButtonEmoji:
        DEFAULT_CONFIG.ticketOpenButtonEmoji,

      ticketHowButtonLabel:
        DEFAULT_CONFIG.ticketHowButtonLabel,

      ticketHowButtonEmoji:
        DEFAULT_CONFIG.ticketHowButtonEmoji,

      ticketFinanceButtonLabel:
        DEFAULT_CONFIG.ticketFinanceButtonLabel,

      ticketFinanceButtonEmoji:
        DEFAULT_CONFIG.ticketFinanceButtonEmoji,
    },
    guildName,
  );
}

/* =========================================================
   RESETAR CONFIGURAÇÃO VISUAL
========================================================= */

export async function resetAppearanceConfig(
  guildId: string,
  guildName = DEFAULT_CONFIG.brandName,
) {
  return updateGuildConfig(
    guildId,
    {
      serverName:
        guildName,

      brandName:
        DEFAULT_CONFIG.brandName,

      primaryColor:
        DEFAULT_CONFIG.primaryColor,

      secondaryColor:
        DEFAULT_CONFIG.secondaryColor,

      footerText:
        DEFAULT_CONFIG.footerText,
    },
    guildName,
  );
}

/* =========================================================
   EXPORT DEFAULTS
========================================================= */

export function getDefaultGuildConfig(): typeof DEFAULT_CONFIG {
  return {
    ...DEFAULT_CONFIG,
  };
}
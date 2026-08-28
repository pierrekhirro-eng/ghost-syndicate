// apps/bot/src/commands/config.ts

import {
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
} from 'discord.js';

import {
  requireAdmin,
} from '../utils/permissions.js';

import {
  updateCashSettings,
} from '../services/finance.js';

import {
  config as appConfig,
} from '../utils/config.js';

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

export const configCommand =
  new SlashCommandBuilder()
    .setName('config')
    .setDescription(
      'Gerencia as configurações da Ghost Syndicate.',
    )

    /* -------------------------------------------------------
       SERVIDOR
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('servidor')
        .setDescription(
          'Mostra a configuração geral do servidor.',
        ),
    )

    /* -------------------------------------------------------
       CARGOS
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('cargos')
        .setDescription(
          'Mostra os cargos configurados.',
        ),
    )

    /* -------------------------------------------------------
       TICKETS
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('tickets')
        .setDescription(
          'Mostra a configuração do sistema de tickets.',
        ),
    )

    /* -------------------------------------------------------
       FINANCEIRO
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('financeiro')
        .setDescription(
          'Atualiza as configurações financeiras.',
        )
        .addIntegerOption((option) =>
          option
            .setName('meta')
            .setDescription(
              'Meta diária do caixa.',
            )
            .setRequired(false)
            .setMinValue(0),
        )
        .addIntegerOption((option) =>
          option
            .setName('reserva')
            .setDescription(
              'Reserva mínima do caixa.',
            )
            .setRequired(false)
            .setMinValue(0),
        ),
    )

    /* -------------------------------------------------------
       RANKING
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('ranking')
        .setDescription(
          'Mostra a configuração do ranking.',
        ),
    )

    /* -------------------------------------------------------
       STATUS
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('status')
        .setDescription(
          'Mostra o status geral das configurações.',
        ),
    );

/* =========================================================
   EXECUTOR PRINCIPAL
========================================================= */

export async function executeConfigCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  /*
   * Garantia de servidor.
   */

  if (!interaction.guild) {
    await interaction.reply({
      content:
        '❌ Este comando só pode ser usado dentro do servidor.',
      ephemeral: true,
    });

    return;
  }

  /*
   * Guardamos o guild em uma constante depois da
   * verificação para o TypeScript saber que ele não
   * é null nas funções abaixo.
   */

  const guild =
    interaction.guild;

  const member =
    await guild.members.fetch(
      interaction.user.id,
    );

  const subcommand =
    interaction.options.getSubcommand();

  try {
    switch (subcommand) {
      case 'servidor':
        await handleServidor(
          interaction,
          member,
        );
        break;

      case 'cargos':
        await handleCargos(
          interaction,
          member,
        );
        break;

      case 'tickets':
        await handleTickets(
          interaction,
          member,
        );
        break;

      case 'financeiro':
        await handleFinanceiro(
          interaction,
          member,
        );
        break;

      case 'ranking':
        await handleRanking(
          interaction,
          member,
        );
        break;

      case 'status':
        await handleStatus(
          interaction,
          member,
        );
        break;

      default:
        await interaction.reply({
          content:
            '❌ Subcomando de configuração inválido.',
          ephemeral: true,
        });
        break;
    }
  } catch (error) {
    console.error(
      '❌ [CONFIG COMMAND]',
      error,
    );

    await sendError(
      interaction,
      error,
    );
  }
}

/* =========================================================
   SERVIDOR
========================================================= */

async function handleServidor(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  requireAdmin(member);

  /*
   * Aqui já existe a garantia de guild.
   */

  const guild =
    interaction.guild;

  if (!guild) {
    throw new Error(
      'Servidor não encontrado.',
    );
  }

  const embed =
    new EmbedBuilder()
      .setColor(
        COLORS.brand,
      )
      .setTitle(
        '⚙️ CONFIGURAÇÃO DO SERVIDOR',
      )
      .setDescription(
        [
          `🏠 **Servidor:** ${guild.name}`,
          `🆔 **Guild ID:** \`${guild.id}\``,
          '',
          `🤖 **Client ID:** ${appConfig.discord.clientId}`,
          `🌐 **Web:** porta ${appConfig.web.port}`,
          '',
          `🗄️ **Banco:** ${appConfig.database.url}`,
        ].join('\n'),
      )
      .setThumbnail(
        guild.iconURL({
          size: 256,
        }) ?? null,
      )
      .addFields({
        name: '🛡️ ACESSO',
        value:
          `Consultado por ${member}`,
        inline: false,
      })
      .setFooter({
        text:
          'Ghost Syndicate • Configurações',
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
   CARGOS
========================================================= */

async function handleCargos(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  requireAdmin(member);

  const roles =
    appConfig.roles;

  const embed =
    new EmbedBuilder()
      .setColor(
        COLORS.info,
      )
      .setTitle(
        '🎖️ CARGOS CONFIGURADOS',
      )
      .setDescription(
        [
          '### 👥 HIERARQUIA DA GHOST SYNDICATE',
          '',
          `👑 **Dono da fac:** ${
            roles.ownerId
              ? `<@&${roles.ownerId}>`
              : '❌ Não configurado'
          }`,
          '',
          `🛡️ **ADM:** ${
            roles.leadershipId
              ? `<@&${roles.leadershipId}>`
              : '❌ Não configurado'
          }`,
          '',
          `👤 **Recrutas:** ${
            roles.recruitsId
              ? `<@&${roles.recruitsId}>`
              : '❌ Não configurado'
          }`,
          '',
          `💰 **Financeiro:** ${
            roles.financeId
              ? `<@&${roles.financeId}>`
              : '❌ Não configurado'
          }`,
          '',
          `🎯 **Operações:** ${
            roles.operationsId
              ? `<@&${roles.operationsId}>`
              : '❌ Não configurado'
          }`,
          '',
          `👻 **Cargo do Bot:** ${
            roles.botId
              ? `<@&${roles.botId}>`
              : '❌ Não configurado'
          }`,
        ].join('\n'),
      )
      .addFields(
        {
          name: '📊 STATUS',
          value:
            'Os cargos principais estão definidos na configuração da aplicação.',
          inline: false,
        },
      )
      .setFooter({
        text:
          'Ghost Syndicate • Cargos',
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
   TICKETS
========================================================= */

async function handleTickets(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  requireAdmin(member);

  const tickets =
    appConfig.tickets;

  const categoryConfigured =
    Boolean(
      tickets.categoryId,
    );

  const transcriptConfigured =
    Boolean(
      tickets.transcriptsChannelId,
    );

  const embed =
    new EmbedBuilder()
      .setColor(
        COLORS.brand,
      )
      .setTitle(
        '🎫 CONFIGURAÇÃO DOS TICKETS',
      )
      .setDescription(
        [
          '### 🎫 CENTRAL DE ATENDIMENTO',
          '',
          `📁 **Categoria:** ${
            categoryConfigured
              ? `<#${tickets.categoryId}>`
              : '❌ Não configurada'
          }`,
          '',
          `📜 **Canal de transcripts:** ${
            transcriptConfigured
              ? `<#${tickets.transcriptsChannelId}>`
              : '❌ Não configurado'
          }`,
          '',
          '🔒 Os tickets utilizam canais privados por atendimento.',
          '📜 Os transcripts serão processados pelo serviço específico.',
        ].join('\n'),
      )
      .addFields(
        {
          name: '📁 CATEGORIA',
          value:
            categoryConfigured
              ? '✅ Configurada'
              : '⚠️ Pendente',
          inline: true,
        },
        {
          name: '📜 TRANSCRIPTS',
          value:
            transcriptConfigured
              ? '✅ Configurado'
              : '⚠️ Pendente',
          inline: true,
        },
      )
      .setFooter({
        text:
          'Ghost Syndicate • Tickets',
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
   FINANCEIRO
========================================================= */

async function handleFinanceiro(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  requireAdmin(member);

  const meta =
    interaction.options.getInteger(
      'meta',
    );

  const reserva =
    interaction.options.getInteger(
      'reserva',
    );

  if (
    meta === null &&
    reserva === null
  ) {
    await interaction.reply({
      content:
        '❌ Informe pelo menos uma configuração: `meta` ou `reserva`.',
      ephemeral: true,
    });

    return;
  }

  if (!interaction.guild) {
    throw new Error(
      'Servidor não encontrado.',
    );
  }

  const updated =
    await updateCashSettings(
      interaction.guild.id,
      {
        dailyGoal:
          meta ??
          undefined,

        reserve:
          reserva ??
          undefined,
      },
    );

  const embed =
    new EmbedBuilder()
      .setColor(
        COLORS.success,
      )
      .setTitle(
        '💰 CONFIGURAÇÃO FINANCEIRA ATUALIZADA',
      )
      .setDescription(
        [
          'As configurações do caixa foram atualizadas com sucesso.',
          '',
          `🎯 **Meta diária:** ${
            updated.dailyGoal > 0
              ? formatValue(
                  updated.dailyGoal,
                )
              : 'Não definida'
          }`,
          '',
          `🛡️ **Reserva:** ${
            updated.reserve > 0
              ? formatValue(
                  updated.reserve,
                )
              : 'Não definida'
          }`,
          '',
          `🛡️ **Alterado por:** ${member}`,
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Financeiro',
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
   RANKING
========================================================= */

async function handleRanking(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  requireAdmin(member);

  const embed =
    new EmbedBuilder()
      .setColor(
        COLORS.warning,
      )
      .setTitle(
        '🏆 CONFIGURAÇÃO DO RANKING',
      )
      .setDescription(
        [
          '### 📊 SISTEMA DE RANKING',
          '',
          '🟢 **Sistema:** Preparado',
          '📅 **Período padrão:** Mensal',
          '🎙️ **Horas em call:** Preparado',
          '📦 **Missões:** Preparado',
          '🎯 **Operações:** Preparado',
          '💰 **Financeiro:** Preparado',
          '',
          'As temporadas e regras persistentes serão conectadas durante a integração final.',
        ].join('\n'),
      )
      .addFields({
        name: '🛡️ RESPONSÁVEL',
        value:
          `${member}`,
        inline: false,
      })
      .setFooter({
        text:
          'Ghost Syndicate • Ranking',
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
   STATUS
========================================================= */

async function handleStatus(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  requireAdmin(member);

  const rolesConfigured =
    [
      appConfig.roles.ownerId,
      appConfig.roles.leadershipId,
      appConfig.roles.recruitsId,
      appConfig.roles.financeId,
      appConfig.roles.operationsId,
      appConfig.roles.botId,
    ].filter(Boolean)
      .length;

  const ticketsConfigured =
    [
      appConfig.tickets.categoryId,
      appConfig.tickets
        .transcriptsChannelId,
    ].filter(Boolean)
      .length;

  const totalChecks = 8;

  const completedChecks =
    rolesConfigured +
    ticketsConfigured;

  const percentage =
    Math.round(
      (completedChecks /
        totalChecks) *
        100,
    );

  const complete =
    completedChecks ===
    totalChecks;

  const embed =
    new EmbedBuilder()
      .setColor(
        complete
          ? COLORS.success
          : COLORS.warning,
      )
      .setTitle(
        complete
          ? '🟢 SISTEMA CONFIGURADO'
          : '🟡 CONFIGURAÇÃO PENDENTE',
      )
      .setDescription(
        [
          `🏠 **Servidor:** ${interaction.guild?.name ?? 'Desconhecido'}`,
          '',
          `🎖️ **Cargos:** ${rolesConfigured}/6`,
          `🎫 **Tickets:** ${ticketsConfigured}/2`,
          '',
          `📊 **Progresso:** ${percentage}%`,
          '',
          complete
            ? '✅ A configuração principal está completa.'
            : '⚠️ Ainda existem itens que podem ser configurados.',
        ].join('\n'),
      )
      .addFields(
        {
          name: '💰 Banco',
          value: '✅ Conectado',
          inline: true,
        },
        {
          name: '🌐 Web',
          value:
            `✅ Porta ${appConfig.web.port}`,
          inline: true,
        },
        {
          name: '🤖 Bot',
          value: '✅ Configurado',
          inline: true,
        },
      )
      .setFooter({
        text:
          'Ghost Syndicate • Status',
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
   FORMATAÇÃO
========================================================= */

function formatValue(
  value: number,
): string {
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
      : 'Não foi possível executar a configuração.';

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
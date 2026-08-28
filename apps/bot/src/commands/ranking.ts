// apps/bot/src/commands/ranking.ts

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

export type RankingPeriod =
  | 'WEEKLY'
  | 'MONTHLY'
  | 'ALL_TIME';

export type RankingCategory =
  | 'VOICE'
  | 'MISSIONS'
  | 'OPERATIONS'
  | 'FINANCE'
  | 'GENERAL';

/* =========================================================
   COMANDO
========================================================= */

export const rankingCommand =
  new SlashCommandBuilder()
    .setName('ranking')
    .setDescription(
      'Gerencia e consulta os rankings da Ghost Syndicate.',
    )

    /* -------------------------------------------------------
       GERAL
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('geral')
        .setDescription(
          'Mostra o ranking geral.',
        )
        .addStringOption((option) =>
          option
            .setName('periodo')
            .setDescription(
              'Período do ranking.',
            )
            .setRequired(false)
            .addChoices(
              {
                name: 'Esta semana',
                value: 'WEEKLY',
              },
              {
                name: 'Este mês',
                value: 'MONTHLY',
              },
              {
                name: 'Todos os tempos',
                value: 'ALL_TIME',
              },
            ),
        ),
    )

    /* -------------------------------------------------------
       CATEGORIA
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('categoria')
        .setDescription(
          'Mostra um ranking por categoria.',
        )
        .addStringOption((option) =>
          option
            .setName('tipo')
            .setDescription(
              'Categoria do ranking.',
            )
            .setRequired(true)
            .addChoices(
              {
                name: '🎙️ Horas em call',
                value: 'VOICE',
              },
              {
                name: '📦 Missões',
                value: 'MISSIONS',
              },
              {
                name: '🎯 Operações',
                value: 'OPERATIONS',
              },
              {
                name: '💰 Financeiro',
                value: 'FINANCE',
              },
              {
                name: '🏆 Geral',
                value: 'GENERAL',
              },
            ),
        ),
    )

    /* -------------------------------------------------------
       MEMBRO
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('membro')
        .setDescription(
          'Consulta a posição de um membro.',
        )
        .addUserOption((option) =>
          option
            .setName('membro')
            .setDescription(
              'Membro consultado.',
            )
            .setRequired(true),
        ),
    )

    /* -------------------------------------------------------
       FECHAR MÊS
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('fechar')
        .setDescription(
          'Fecha o ranking do período atual.',
        )
        .addStringOption((option) =>
          option
            .setName('periodo')
            .setDescription(
              'Período a ser fechado.',
            )
            .setRequired(true)
            .addChoices(
              {
                name: 'Semana',
                value: 'WEEKLY',
              },
              {
                name: 'Mês',
                value: 'MONTHLY',
              },
            ),
        ),
    )

    /* -------------------------------------------------------
       RESET
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('resetar')
        .setDescription(
          'Solicita o reset de um ranking.',
        )
        .addStringOption((option) =>
          option
            .setName('categoria')
            .setDescription(
              'Categoria a ser resetada.',
            )
            .setRequired(true)
            .addChoices(
              {
                name: '🎙️ Horas em call',
                value: 'VOICE',
              },
              {
                name: '📦 Missões',
                value: 'MISSIONS',
              },
              {
                name: '🎯 Operações',
                value: 'OPERATIONS',
              },
              {
                name: '💰 Financeiro',
                value: 'FINANCE',
              },
              {
                name: '🏆 Geral',
                value: 'GENERAL',
              },
            ),
        ),
    );

/* =========================================================
   EXECUTOR
========================================================= */

export async function executeRankingCommand(
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

  const subcommand =
    interaction.options.getSubcommand();

  /*
   * CONSULTAS PODEM SER FEITAS POR QUALQUER MEMBRO.
   * ALTERAÇÕES EXIGEM ADMIN.
   */

  if (
    subcommand === 'geral' ||
    subcommand === 'categoria' ||
    subcommand === 'membro'
  ) {
    await handlePublicRanking(
      interaction,
      subcommand,
    );

    return;
  }

  try {
    requireAdmin(member);
  } catch (error) {
    await interaction.reply({
      content:
        error instanceof Error
          ? `❌ ${error.message}`
          : '❌ Você não possui permissão para administrar rankings.',
      ephemeral: true,
    });

    return;
  }

  switch (subcommand) {
    case 'fechar':
      await handleClose(
        interaction,
        member,
      );
      break;

    case 'resetar':
      await handleReset(
        interaction,
        member,
      );
      break;

    default:
      await interaction.reply({
        content:
          '❌ Subcomando de ranking inválido.',
        ephemeral: true,
      });
      break;
  }
}

/* =========================================================
   RANKING PÚBLICO
========================================================= */

async function handlePublicRanking(
  interaction: ChatInputCommandInteraction,
  subcommand: string,
): Promise<void> {
  if (
    subcommand === 'membro'
  ) {
    const target =
      interaction.options.getUser(
        'membro',
        true,
      );

    const embed =
      new EmbedBuilder()
        .setColor(0x7c5cff)
        .setTitle(
          '👤 RANKING DO MEMBRO',
        )
        .setDescription(
          [
            `👤 **Membro:** ${target}`,
            '',
            '🏆 **Posição geral:** aguardando dados persistidos',
            '📊 **Pontuação:** aguardando dados persistidos',
            '',
            'O cálculo será conectado ao banco de dados durante a integração final.',
          ].join('\n'),
        )
        .setFooter({
          text:
            'Ghost Syndicate • Ranking',
        })
        .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });

    return;
  }

  if (
    subcommand === 'categoria'
  ) {
    const category =
      interaction.options.getString(
        'tipo',
        true,
      ) as RankingCategory;

    const embed =
      new EmbedBuilder()
        .setColor(0x7c5cff)
        .setTitle(
          '🏆 RANKING POR CATEGORIA',
        )
        .setDescription(
          [
            `📊 **Categoria:** ${getCategoryLabel(category)}`,
            '',
            'O ranking desta categoria será carregado a partir dos dados persistidos.',
          ].join('\n'),
        )
        .setFooter({
          text:
            'Ghost Syndicate • Ranking',
        })
        .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });

    return;
  }

  const period =
    interaction.options.getString(
      'periodo',
    ) as RankingPeriod | null;

  const embed =
    new EmbedBuilder()
      .setColor(0xffc857)
      .setTitle(
        '🏆 RANKING GERAL',
      )
      .setDescription(
        [
          '> Ranking oficial da Ghost Syndicate.',
          '',
          `📅 **Período:** ${getPeriodLabel(period)}`,
          '',
          '🥇 **1º** — aguardando dados',
          '🥈 **2º** — aguardando dados',
          '🥉 **3º** — aguardando dados',
          '4️⃣ **4º** — aguardando dados',
          '5️⃣ **5º** — aguardando dados',
          '',
          '📊 Os resultados completos serão ligados ao banco na integração final.',
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Ranking',
      })
      .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: false,
  });
}

/* =========================================================
   FECHAR
========================================================= */

async function handleClose(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  const period =
    interaction.options.getString(
      'periodo',
      true,
    ) as RankingPeriod;

  const embed =
    new EmbedBuilder()
      .setColor(0xffc857)
      .setTitle(
        '🔒 RANKING FECHADO',
      )
      .setDescription(
        [
          `📅 **Período:** ${getPeriodLabel(period)}`,
          '',
          '✅ O período foi marcado para fechamento.',
          '',
          `🛡️ **Responsável:** ${member}`,
          '',
          'A persistência do fechamento e a distribuição de premiações serão conectadas na integração final.',
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Ranking',
      })
      .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* =========================================================
   RESETAR
========================================================= */

async function handleReset(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  const category =
    interaction.options.getString(
      'categoria',
      true,
    ) as RankingCategory;

  const embed =
    new EmbedBuilder()
      .setColor(0xf15b6b)
      .setTitle(
        '⚠️ RESET DE RANKING',
      )
      .setDescription(
        [
          `📊 **Categoria:** ${getCategoryLabel(category)}`,
          '',
          '⚠️ A solicitação de reset foi registrada.',
          '',
          `🛡️ **Solicitado por:** ${member}`,
          '',
          'A operação definitiva será conectada ao banco na integração final.',
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Administração',
      })
      .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* =========================================================
   LABELS
========================================================= */

function getPeriodLabel(
  period:
    | RankingPeriod
    | null,
): string {
  switch (period) {
    case 'WEEKLY':
      return 'Esta semana';

    case 'MONTHLY':
      return 'Este mês';

    case 'ALL_TIME':
      return 'Todos os tempos';

    default:
      return 'Este mês';
  }
}

function getCategoryLabel(
  category: RankingCategory,
): string {
  switch (category) {
    case 'VOICE':
      return '🎙️ Horas em call';

    case 'MISSIONS':
      return '📦 Missões';

    case 'OPERATIONS':
      return '🎯 Operações';

    case 'FINANCE':
      return '💰 Financeiro';

    case 'GENERAL':
      return '🏆 Geral';

    default:
      return '🏆 Geral';
  }
}
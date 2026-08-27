// apps/bot/src/commands/admin.ts

import {
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
} from 'discord.js';

import {
  getPermissionSummary,
  requireAdmin,
  requireOwner,
} from '../utils/permissions.js';

/* =========================================================
   DEFINIÇÃO DO COMANDO
========================================================= */

export const adminCommand =
  new SlashCommandBuilder()
    .setName('admin')
    .setDescription(
      'Comandos administrativos da Ghost Syndicate.',
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('info')
        .setDescription(
          'Mostra seu nível de acesso administrativo.',
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('permissoes')
        .setDescription(
          'Mostra as permissões de um membro.',
        )
        .addUserOption((option) =>
          option
            .setName('membro')
            .setDescription(
              'Membro que será consultado.',
            )
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('painel')
        .setDescription(
          'Abre o painel administrativo.',
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('teste')
        .setDescription(
          'Testa o sistema de permissões.',
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName('dono')
        .setDescription(
          'Testa uma permissão exclusiva dos donos da fac.',
        ),
    );

/* =========================================================
   EXECUTOR
========================================================= */

export async function executeAdminCommand(
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

  switch (subcommand) {
    case 'info':
      await handleInfo(
        interaction,
        member,
      );
      break;

    case 'permissoes':
      await handlePermissions(
        interaction,
        member,
      );
      break;

    case 'painel':
      await handlePanel(
        interaction,
        member,
      );
      break;

    case 'teste':
      await handleTest(
        interaction,
        member,
      );
      break;

    case 'dono':
      await handleOwnerTest(
        interaction,
        member,
      );
      break;

    default:
      await interaction.reply({
        content:
          '❌ Subcomando administrativo inválido.',
        ephemeral: true,
      });

      break;
  }
}

/* =========================================================
   INFO
========================================================= */

async function handleInfo(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  const summary =
    getPermissionSummary(member);

  const embed =
    new EmbedBuilder()
      .setColor(
        summary.owner
          ? 0xffc857
          : summary.admin
            ? 0x7c5cff
            : 0x5865f2,
      )
      .setTitle(
        '🛡️ SEU ACESSO ADMINISTRATIVO',
      )
      .setDescription(
        [
          `👤 **Membro:** ${member}`,
          '',
          `🏷️ **Nível:** ${summary.label}`,
          `🔢 **Level:** ${summary.level}`,
          '',
          `🛡️ **Administrador:** ${
            summary.admin
              ? '✅'
              : '❌'
          }`,
          `👑 **Dono:** ${
            summary.owner
              ? '✅'
              : '❌'
          }`,
          `⚙️ **Administrador Discord:** ${
            summary.discordAdministrator
              ? '✅'
              : '❌'
          }`,
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Sistema Administrativo',
      })
      .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* =========================================================
   PERMISSÕES
========================================================= */

async function handlePermissions(
  interaction: ChatInputCommandInteraction,
  executor: GuildMember,
): Promise<void> {
  try {
    requireAdmin(executor);

    const target =
      interaction.options.getMember(
        'membro',
      );

    if (!target) {
      await interaction.reply({
        content:
          '❌ Não foi possível encontrar esse membro.',
        ephemeral: true,
      });

      return;
    }

    const summary =
      getPermissionSummary(
        target as GuildMember,
      );

    const embed =
      new EmbedBuilder()
        .setColor(
          summary.owner
            ? 0xffc857
            : summary.admin
              ? 0x7c5cff
              : 0x5865f2,
        )
        .setTitle(
          '🔐 PERMISSÕES DO MEMBRO',
        )
        .setDescription(
          [
            `👤 **Membro:** ${target}`,
            '',
            `🏷️ **Nível:** ${summary.label}`,
            `🔢 **Level:** ${summary.level}`,
            '',
            `🛡️ **Administrador:** ${
              summary.admin
                ? '✅'
                : '❌'
            }`,
            `👑 **Dono:** ${
              summary.owner
                ? '✅'
                : '❌'
            }`,
            `⚙️ **Administrador Discord:** ${
              summary.discordAdministrator
                ? '✅'
                : '❌'
            }`,
          ].join('\n'),
        )
        .setFooter({
          text:
            `Consultado por ${interaction.user.tag}`,
        })
        .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  } catch (error) {
    await interaction.reply({
      content:
        error instanceof Error
          ? `❌ ${error.message}`
          : '❌ Você não possui permissão para isso.',
      ephemeral: true,
    });
  }
}

/* =========================================================
   PAINEL ADMINISTRATIVO
========================================================= */

async function handlePanel(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  try {
    requireAdmin(member);

    const summary =
      getPermissionSummary(member);

    const embed =
      new EmbedBuilder()
        .setColor(0x7c5cff)
        .setTitle(
          '👑 PAINEL ADMINISTRATIVO',
        )
        .setDescription(
          [
            '> Central de administração da Ghost Syndicate.',
            '',
            '🏦 **Financeiro**',
            '🎯 **Operações**',
            '📦 **Missões**',
            '🎫 **Tickets**',
            '📊 **Ranking**',
            '🎙️ **Horas em Call**',
            '👥 **Membros**',
            '',
            `👤 Acesso atual: **${summary.label}**`,
          ].join('\n'),
        )
        .addFields(
          {
            name: '🏦 Financeiro',
            value:
              'Gerenciar caixa, entradas, saídas e empréstimos.',
            inline: false,
          },
          {
            name: '🎯 Operações',
            value:
              'Gerenciar operações e missões da facção.',
            inline: false,
          },
          {
            name: '🎫 Atendimento',
            value:
              'Gerenciar tickets e transcripts.',
            inline: false,
          },
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
  } catch (error) {
    await interaction.reply({
      content:
        error instanceof Error
          ? `❌ ${error.message}`
          : '❌ Acesso negado.',
      ephemeral: true,
    });
  }
}

/* =========================================================
   TESTE DE PERMISSÕES
========================================================= */

async function handleTest(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  const summary =
    getPermissionSummary(member);

  const result =
    summary.admin
      ? '✅ Você pode acessar os sistemas administrativos.'
      : '❌ Você não possui acesso administrativo.';

  const embed =
    new EmbedBuilder()
      .setColor(
        summary.admin
          ? 0x35d39a
          : 0xf15b6b,
      )
      .setTitle(
        '🧪 TESTE DE PERMISSÕES',
      )
      .setDescription(
        [
          `👤 ${member}`,
          '',
          result,
          '',
          `🏷️ Cargo detectado: **${summary.label}**`,
        ].join('\n'),
      )
      .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* =========================================================
   TESTE DE DONO
========================================================= */

async function handleOwnerTest(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  try {
    requireOwner(member);

    const embed =
      new EmbedBuilder()
        .setColor(0xffc857)
        .setTitle(
          '👑 ACESSO DE DONO CONFIRMADO',
        )
        .setDescription(
          [
            `✅ ${member}`,
            '',
            'Você possui acesso às funções exclusivas dos **Donos da fac**.',
          ].join('\n'),
        )
        .setFooter({
          text:
            'Ghost Syndicate • Área Restrita',
        })
        .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  } catch (error) {
    await interaction.reply({
      content:
        error instanceof Error
          ? `❌ ${error.message}`
          : '❌ Acesso restrito aos donos da fac.',
      ephemeral: true,
    });
  }
}
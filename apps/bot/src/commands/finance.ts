// apps/bot/src/commands/finance.ts

import {
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
} from 'discord.js';

import {
  getFinancialSummary,
  getMovements,
  updateCashSettings,
  setInitialBalance,
} from '../services/finance.js';

import {
  requireAdmin,
  requireOwner,
} from '../utils/permissions.js';

import {
  money,
} from '../utils/format.js';

/* =========================================================
   DEFINIÇÃO DO COMANDO
========================================================= */

export const financeCommand =
  new SlashCommandBuilder()
    .setName('financeiro')
    .setDescription(
      'Administração financeira da Ghost Syndicate.',
    )

    /* -------------------------------------------------------
       SALDO
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('saldo')
        .setDescription(
          'Mostra o saldo atual do caixa.',
        ),
    )

    /* -------------------------------------------------------
       RESUMO
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('resumo')
        .setDescription(
          'Mostra o resumo financeiro completo.',
        ),
    )

    /* -------------------------------------------------------
       HISTÓRICO
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('historico')
        .setDescription(
          'Mostra as últimas movimentações do caixa.',
        )
        .addIntegerOption((option) =>
          option
            .setName('limite')
            .setDescription(
              'Quantidade de movimentações exibidas.',
            )
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(20),
        ),
    )

    /* -------------------------------------------------------
       CONFIGURAR
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('configurar')
        .setDescription(
          'Configura meta diária e reserva do caixa.',
        )
        .addIntegerOption((option) =>
          option
            .setName('meta')
            .setDescription(
              'Nova meta diária.',
            )
            .setRequired(false)
            .setMinValue(0),
        )
        .addIntegerOption((option) =>
          option
            .setName('reserva')
            .setDescription(
              'Nova reserva mínima.',
            )
            .setRequired(false)
            .setMinValue(0),
        ),
    )

    /* -------------------------------------------------------
       SALDO INICIAL
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('saldo-inicial')
        .setDescription(
          'Define o saldo inicial do caixa.',
        )
        .addIntegerOption((option) =>
          option
            .setName('valor')
            .setDescription(
              'Novo saldo inicial.',
            )
            .setRequired(true)
            .setMinValue(0),
        ),
    );

/* =========================================================
   EXECUTOR
========================================================= */

export async function executeFinanceCommand(
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
    case 'saldo':
      await handleSaldo(
        interaction,
        member,
      );
      break;

    case 'resumo':
      await handleResumo(
        interaction,
        member,
      );
      break;

    case 'historico':
      await handleHistorico(
        interaction,
        member,
      );
      break;

    case 'configurar':
      await handleConfigurar(
        interaction,
        member,
      );
      break;

    case 'saldo-inicial':
      await handleSaldoInicial(
        interaction,
        member,
      );
      break;

    default:
      await interaction.reply({
        content:
          '❌ Subcomando financeiro inválido.',
        ephemeral: true,
      });
      break;
  }
}

/* =========================================================
   SALDO
========================================================= */

async function handleSaldo(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  try {
    requireAdmin(member);

    if (!interaction.guild) {
      return;
    }

    const summary =
      await getFinancialSummary(
        interaction.guild.id,
      );

    const embed =
      new EmbedBuilder()
        .setColor(0x35d39a)
        .setTitle(
          '🏦 SALDO • GHOST SYNDICATE',
        )
        .setDescription(
          [
            '> Situação atual do caixa.',
            '',
            `💰 **Saldo:** ${money(summary.cashBalance)}`,
            `🎯 **Meta diária:** ${
              summary.dailyGoal > 0
                ? money(summary.dailyGoal)
                : 'Não definida'
            }`,
            `🛡️ **Reserva:** ${
              summary.reserve > 0
                ? money(summary.reserve)
                : 'Não definida'
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
    await replyError(
      interaction,
      error,
    );
  }
}

/* =========================================================
   RESUMO
========================================================= */

async function handleResumo(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  try {
    requireAdmin(member);

    if (!interaction.guild) {
      return;
    }

    const summary =
      await getFinancialSummary(
        interaction.guild.id,
      );

    const resultPositive =
      summary.netResult >= 0;

    const embed =
      new EmbedBuilder()
        .setColor(
          resultPositive
            ? 0x35d39a
            : 0xf15b6b,
        )
        .setTitle(
          '📊 RESUMO FINANCEIRO',
        )
        .setDescription(
          '> Visão geral do caixa da Ghost Syndicate.',
        )
        .addFields(
          {
            name: '💰 SALDO ATUAL',
            value:
              `**${money(summary.cashBalance)}**`,
            inline: true,
          },
          {
            name: '📥 TOTAL DE ENTRADAS',
            value:
              `**${money(summary.totalEntries)}**`,
            inline: true,
          },
          {
            name: '📤 TOTAL DE SAÍDAS',
            value:
              `**${money(summary.totalExits)}**`,
            inline: true,
          },
          {
            name: '📈 RESULTADO LÍQUIDO',
            value:
              `**${money(summary.netResult)}**`,
            inline: true,
          },
          {
            name: '🎯 META DIÁRIA',
            value:
              summary.dailyGoal > 0
                ? `**${money(summary.dailyGoal)}**`
                : '**Não definida**',
            inline: true,
          },
          {
            name: '🛡️ RESERVA',
            value:
              summary.reserve > 0
                ? `**${money(summary.reserve)}**`
                : '**Não definida**',
            inline: true,
          },
        )
        .setFooter({
          text:
            'Ghost Syndicate • Financeiro',
        })
        .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  } catch (error) {
    await replyError(
      interaction,
      error,
    );
  }
}

/* =========================================================
   HISTÓRICO
========================================================= */

async function handleHistorico(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  try {
    requireAdmin(member);

    if (!interaction.guild) {
      return;
    }

    const limit =
      interaction.options.getInteger(
        'limite',
      ) ?? 10;

    const movements =
      await getMovements(
        interaction.guild.id,
        limit,
      );

    const embed =
      new EmbedBuilder()
        .setColor(0x7c5cff)
        .setTitle(
          '📜 HISTÓRICO DO CAIXA',
        )
        .setFooter({
          text:
            'Ghost Syndicate • Registro Financeiro',
        })
        .setTimestamp();

    if (
      movements.length === 0
    ) {
      embed.setDescription(
        '> Nenhuma movimentação registrada ainda.',
      );

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });

      return;
    }

    const description =
      movements
        .map(
          (movement) => {
            const icon =
              movement.type === 'IN'
                ? '📥'
                : '📤';

            const label =
              movement.type === 'IN'
                ? 'Entrada'
                : 'Saída';

            const sign =
              movement.type === 'IN'
                ? '+'
                : '-';

            return [
              `${icon} **${label}**`,
              `${sign}${money(movement.amount)}`,
              `• ${movement.reason}`,
              `• ${movement.responsible}`,
            ].join(' ');
          },
        )
        .join('\n');

    embed.setDescription(
      description,
    );

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  } catch (error) {
    await replyError(
      interaction,
      error,
    );
  }
}

/* =========================================================
   CONFIGURAR
========================================================= */

async function handleConfigurar(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  try {
    requireAdmin(member);

    if (!interaction.guild) {
      return;
    }

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

    const updated =
      await updateCashSettings(
        interaction.guild.id,
        {
          dailyGoal:
            meta ?? undefined,

          reserve:
            reserva ?? undefined,
        },
      );

    const embed =
      new EmbedBuilder()
        .setColor(0x35d39a)
        .setTitle(
          '⚙️ CAIXA CONFIGURADO',
        )
        .setDescription(
          [
            '> As configurações financeiras foram atualizadas.',
            '',
            `🎯 **Meta diária:** ${
              updated.dailyGoal > 0
                ? money(updated.dailyGoal)
                : 'Não definida'
            }`,
            `🛡️ **Reserva:** ${
              updated.reserve > 0
                ? money(updated.reserve)
                : 'Não definida'
            }`,
          ].join('\n'),
        )
        .setFooter({
          text:
            `Alterado por ${interaction.user.tag}`,
        })
        .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  } catch (error) {
    await replyError(
      interaction,
      error,
    );
  }
}

/* =========================================================
   SALDO INICIAL
========================================================= */

async function handleSaldoInicial(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  try {
    requireOwner(member);

    if (!interaction.guild) {
      return;
    }

    const value =
      interaction.options.getInteger(
        'valor',
        true,
      );

    const updated =
      await setInitialBalance(
        interaction.guild.id,
        value,
      );

    const embed =
      new EmbedBuilder()
        .setColor(0xffc857)
        .setTitle(
          '🏦 SALDO INICIAL DEFINIDO',
        )
        .setDescription(
          [
            '> O saldo inicial do caixa foi atualizado.',
            '',
            `💰 **Novo saldo:** ${money(updated.cashBalance)}`,
          ].join('\n'),
        )
        .setFooter({
          text:
            `Alterado por ${interaction.user.tag}`,
        })
        .setTimestamp();

    await interaction.reply({
      embeds: [embed],
      ephemeral: true,
    });
  } catch (error) {
    await replyError(
      interaction,
      error,
    );
  }
}

/* =========================================================
   ERRO
========================================================= */

async function replyError(
  interaction: ChatInputCommandInteraction,
  error: unknown,
): Promise<void> {
  const message =
    error instanceof Error
      ? error.message
      : 'Não foi possível executar a operação financeira.';

  await interaction.reply({
    content:
      `❌ ${message}`,
    ephemeral: true,
  });
}
// apps/bot/src/commands/loans.ts

import {
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
} from 'discord.js';

import {
  requireAdmin,
  requireOwner,
} from '../utils/permissions.js';

/* =========================================================
   TIPOS
========================================================= */

export type LoanType =
  | 'MONEY'
  | 'VEHICLE';

export type LoanStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'ACTIVE'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

/* =========================================================
   COMANDO
========================================================= */

export const loansCommand =
  new SlashCommandBuilder()
    .setName('emprestimo')
    .setDescription(
      'Gerencia os empréstimos da Ghost Syndicate.',
    )

    /* -------------------------------------------------------
       CRIAR
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('criar')
        .setDescription(
          'Cria uma solicitação de empréstimo.',
        )
        .addUserOption((option) =>
          option
            .setName('membro')
            .setDescription(
              'Membro que receberá o empréstimo.',
            )
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('tipo')
            .setDescription(
              'Tipo do empréstimo.',
            )
            .setRequired(true)
            .addChoices(
              {
                name: '💰 Dinheiro',
                value: 'MONEY',
              },
              {
                name: '🚗 Veículo',
                value: 'VEHICLE',
              },
            ),
        )
        .addIntegerOption((option) =>
          option
            .setName('valor')
            .setDescription(
              'Valor do empréstimo.',
            )
            .setRequired(true)
            .setMinValue(1),
        )
        .addIntegerOption((option) =>
          option
            .setName('prazo')
            .setDescription(
              'Prazo em dias.',
            )
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(3650),
        )
        .addNumberOption((option) =>
          option
            .setName('juros')
            .setDescription(
              'Juros em porcentagem.',
            )
            .setRequired(false)
            .setMinValue(0)
            .setMaxValue(1000),
        )
        .addStringOption((option) =>
          option
            .setName('observacao')
            .setDescription(
              'Observação do empréstimo.',
            )
            .setRequired(false)
            .setMaxLength(500),
        ),
    )

    /* -------------------------------------------------------
       LISTAR
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('listar')
        .setDescription(
          'Lista os empréstimos.',
        )
        .addStringOption((option) =>
          option
            .setName('status')
            .setDescription(
              'Filtra pelo status.',
            )
            .setRequired(false)
            .addChoices(
              {
                name: 'Pendentes',
                value: 'PENDING',
              },
              {
                name: 'Aprovados',
                value: 'APPROVED',
              },
              {
                name: 'Ativos',
                value: 'ACTIVE',
              },
              {
                name: 'Pagos',
                value: 'PAID',
              },
              {
                name: 'Atrasados',
                value: 'OVERDUE',
              },
              {
                name: 'Cancelados',
                value: 'CANCELLED',
              },
            ),
        )
        .addUserOption((option) =>
          option
            .setName('membro')
            .setDescription(
              'Filtra por membro.',
            )
            .setRequired(false),
        ),
    )

    /* -------------------------------------------------------
       VER
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('ver')
        .setDescription(
          'Mostra detalhes de um empréstimo.',
        )
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription(
              'ID do empréstimo.',
            )
            .setRequired(true)
            .setMaxLength(50),
        ),
    )

    /* -------------------------------------------------------
       APROVAR
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('aprovar')
        .setDescription(
          'Aprova um empréstimo pendente.',
        )
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription(
              'ID do empréstimo.',
            )
            .setRequired(true)
            .setMaxLength(50),
        ),
    )

    /* -------------------------------------------------------
       PAGAR
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('pagar')
        .setDescription(
          'Registra o pagamento de um empréstimo.',
        )
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription(
              'ID do empréstimo.',
            )
            .setRequired(true)
            .setMaxLength(50),
        )
        .addIntegerOption((option) =>
          option
            .setName('valor')
            .setDescription(
              'Valor pago.',
            )
            .setRequired(true)
            .setMinValue(1),
        )
        .addStringOption((option) =>
          option
            .setName('observacao')
            .setDescription(
              'Observação do pagamento.',
            )
            .setRequired(false)
            .setMaxLength(500),
        ),
    )

    /* -------------------------------------------------------
       CANCELAR
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('cancelar')
        .setDescription(
          'Cancela um empréstimo.',
        )
        .addStringOption((option) =>
          option
            .setName('id')
            .setDescription(
              'ID do empréstimo.',
            )
            .setRequired(true)
            .setMaxLength(50),
        )
        .addStringOption((option) =>
          option
            .setName('motivo')
            .setDescription(
              'Motivo do cancelamento.',
            )
            .setRequired(true)
            .setMaxLength(500),
        ),
    )

    /* -------------------------------------------------------
       ATRASADOS
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('atrasados')
        .setDescription(
          'Lista empréstimos atrasados.',
        ),
    )

    /* -------------------------------------------------------
       HISTÓRICO
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('historico')
        .setDescription(
          'Mostra o histórico de um membro.',
        )
        .addUserOption((option) =>
          option
            .setName('membro')
            .setDescription(
              'Membro consultado.',
            )
            .setRequired(true),
        ),
    );

/* =========================================================
   EXECUTOR
========================================================= */

export async function executeLoansCommand(
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

  try {
    requireAdmin(member);
  } catch (error) {
    await interaction.reply({
      content:
        error instanceof Error
          ? `❌ ${error.message}`
          : '❌ Você não possui permissão para gerenciar empréstimos.',
      ephemeral: true,
    });

    return;
  }

  const subcommand =
    interaction.options.getSubcommand();

  switch (subcommand) {
    case 'criar':
      await handleCreate(
        interaction,
        member,
      );
      break;

    case 'listar':
      await handleList(
        interaction,
      );
      break;

    case 'ver':
      await handleView(
        interaction,
      );
      break;

    case 'aprovar':
      await handleApprove(
        interaction,
        member,
      );
      break;

    case 'pagar':
      await handlePay(
        interaction,
      );
      break;

    case 'cancelar':
      await handleCancel(
        interaction,
      );
      break;

    case 'atrasados':
      await handleOverdue(
        interaction,
      );
      break;

    case 'historico':
      await handleHistory(
        interaction,
      );
      break;

    default:
      await interaction.reply({
        content:
          '❌ Subcomando de empréstimo inválido.',
        ephemeral: true,
      });
      break;
  }
}

/* =========================================================
   CRIAR
========================================================= */

async function handleCreate(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  const target =
    interaction.options.getUser(
      'membro',
      true,
    );

  const type =
    interaction.options.getString(
      'tipo',
      true,
    ) as LoanType;

  const value =
    interaction.options.getInteger(
      'valor',
      true,
    );

  const term =
    interaction.options.getInteger(
      'prazo',
      true,
    );

  const interest =
    interaction.options.getNumber(
      'juros',
    ) ?? 0;

  const observation =
    interaction.options.getString(
      'observacao',
    ) ?? 'Nenhuma';

  const id =
    `EMP-${Date.now()
      .toString(36)
      .toUpperCase()}`;

  const total =
    Math.round(
      value +
        (value * interest) / 100,
    );

  const embed =
    new EmbedBuilder()
      .setColor(0x7c5cff)
      .setTitle(
        '💳 EMPRÉSTIMO CRIADO',
      )
      .setDescription(
        [
          `🆔 **ID:** \`${id}\``,
          `👤 **Beneficiário:** ${target}`,
          `🏷️ **Tipo:** ${getLoanTypeLabel(type)}`,
          `💰 **Valor:** ${formatValue(value)}`,
          `📈 **Juros:** ${interest.toFixed(2)}%`,
          `💵 **Total previsto:** ${formatValue(total)}`,
          `📅 **Prazo:** ${term} dias`,
          `📊 **Status:** 🟡 PENDENTE`,
          '',
          `📝 **Observação:** ${observation}`,
          '',
          `🛡️ **Solicitado por:** ${member}`,
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Empréstimos',
      })
      .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* =========================================================
   LISTAR
========================================================= */

async function handleList(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const status =
    interaction.options.getString(
      'status',
    ) as LoanStatus | null;

  const target =
    interaction.options.getUser(
      'membro',
    );

  const embed =
    new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(
        '📋 EMPRÉSTIMOS',
      )
      .setDescription(
        [
          '> Central de empréstimos da Ghost Syndicate.',
          '',
          `🔎 **Status:** ${
            getStatusLabel(status)
          }`,
          `👤 **Membro:** ${
            target
              ? `${target}`
              : 'Todos'
          }`,
          '',
          'Nenhum empréstimo persistido foi carregado nesta etapa.',
          '',
          'A integração definitiva com o banco será feita depois que todos os módulos forem criados.',
        ].join('\n'),
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
}

/* =========================================================
   VER
========================================================= */

async function handleView(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const id =
    interaction.options.getString(
      'id',
      true,
    );

  const embed =
    new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(
        '💳 DETALHES DO EMPRÉSTIMO',
      )
      .setDescription(
        [
          `🆔 **ID:** \`${id}\``,
          '',
          'A consulta completa será conectada ao banco durante a integração do módulo.',
        ].join('\n'),
      )
      .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* =========================================================
   APROVAR
========================================================= */

async function handleApprove(
  interaction: ChatInputCommandInteraction,
  member: GuildMember,
): Promise<void> {
  const id =
    interaction.options.getString(
      'id',
      true,
    );

  const embed =
    new EmbedBuilder()
      .setColor(0x35d39a)
      .setTitle(
        '✅ EMPRÉSTIMO APROVADO',
      )
      .setDescription(
        [
          `🆔 **ID:** \`${id}\``,
          '📊 **Status:** 🟢 APROVADO',
          '',
          `👑 **Aprovado por:** ${member}`,
          '',
          'A alteração persistente será conectada ao banco na integração.',
        ].join('\n'),
      )
      .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* =========================================================
   PAGAMENTO
========================================================= */

async function handlePay(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const id =
    interaction.options.getString(
      'id',
      true,
    );

  const value =
    interaction.options.getInteger(
      'valor',
      true,
    );

  const observation =
    interaction.options.getString(
      'observacao',
    ) ?? 'Nenhuma';

  const embed =
    new EmbedBuilder()
      .setColor(0x35d39a)
      .setTitle(
        '💰 PAGAMENTO REGISTRADO',
      )
      .setDescription(
        [
          `🆔 **Empréstimo:** \`${id}\``,
          `💵 **Valor pago:** ${formatValue(value)}`,
          `📝 **Observação:** ${observation}`,
          '',
          '✅ O pagamento foi preparado para persistência.',
        ].join('\n'),
      )
      .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* =========================================================
   CANCELAR
========================================================= */

async function handleCancel(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const id =
    interaction.options.getString(
      'id',
      true,
    );

  const reason =
    interaction.options
      .getString(
        'motivo',
        true,
      )
      .trim();

  const embed =
    new EmbedBuilder()
      .setColor(0xf15b6b)
      .setTitle(
        '❌ EMPRÉSTIMO CANCELADO',
      )
      .setDescription(
        [
          `🆔 **ID:** \`${id}\``,
          `📝 **Motivo:** ${reason}`,
          '',
          '📊 **Status:** CANCELADO',
        ].join('\n'),
      )
      .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* =========================================================
   ATRASADOS
========================================================= */

async function handleOverdue(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const embed =
    new EmbedBuilder()
      .setColor(0xf15b6b)
      .setTitle(
        '⚠️ EMPRÉSTIMOS ATRASADOS',
      )
      .setDescription(
        [
          '> Controle de inadimplência.',
          '',
          'Nenhum empréstimo persistido foi consultado ainda.',
          '',
          'A rotina automática de detecção de atraso será ligada na integração do módulo.',
        ].join('\n'),
      )
      .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* =========================================================
   HISTÓRICO
========================================================= */

async function handleHistory(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const target =
    interaction.options.getUser(
      'membro',
      true,
    );

  const embed =
    new EmbedBuilder()
      .setColor(0x7c5cff)
      .setTitle(
        '📜 HISTÓRICO DE EMPRÉSTIMOS',
      )
      .setDescription(
        [
          `👤 **Membro:** ${target}`,
          '',
          'O histórico financeiro individual será carregado do banco após a integração deste módulo.',
        ].join('\n'),
      )
      .setTimestamp();

  await interaction.reply({
    embeds: [embed],
    ephemeral: true,
  });
}

/* =========================================================
   LABELS
========================================================= */

function getLoanTypeLabel(
  type: LoanType,
): string {
  switch (type) {
    case 'MONEY':
      return '💰 Dinheiro';

    case 'VEHICLE':
      return '🚗 Veículo';

    default:
      return '❓ Desconhecido';
  }
}

function getStatusLabel(
  status:
    | LoanStatus
    | null,
): string {
  switch (status) {
    case 'PENDING':
      return '🟡 Pendentes';

    case 'APPROVED':
      return '✅ Aprovados';

    case 'ACTIVE':
      return '🟢 Ativos';

    case 'PAID':
      return '💰 Pagos';

    case 'OVERDUE':
      return '⚠️ Atrasados';

    case 'CANCELLED':
      return '❌ Cancelados';

    default:
      return '📋 Todos';
  }
}

function formatValue(
  value: number,
): string {
  return `${value.toLocaleString(
    'pt-BR',
  )} K`;
}
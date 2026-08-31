// apps/bot/src/commands/emprestimo.ts

import {
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
} from 'discord.js';

import {
  createLoan,
  type LoanType,
} from '../services/loans.js';

import {
  ensureMember,
} from '../services/finance.js';

import {
  requireAdmin,
} from '../utils/permissions.js';

import {
  money,
} from '../utils/format.js';

/* =========================================================
   HELPERS
========================================================= */

function parseDueDate(
  value: string,
): Date {
  const raw =
    value
      .trim()
      .toLowerCase();

  if (
    !raw
  ) {
    throw new Error(
      'Informe o prazo do empréstimo.',
    );
  }

  /*
   * Aceita:
   *
   * 30
   * 30d
   * 30 dias
   */
  const daysMatch =
    raw.match(
      /^(\d+)\s*(?:d|dia|dias)?$/,
    );

  if (
    daysMatch
  ) {
    const days =
      Number(
        daysMatch[1],
      );

    if (
      !Number.isInteger(
        days,
      ) ||
      days <= 0
    ) {
      throw new Error(
        'O prazo precisa ser maior que zero.',
      );
    }

    const date =
      new Date();

    date.setDate(
      date.getDate() +
        days,
    );

    return date;
  }

  /*
   * DD/MM/YYYY
   */
  const brMatch =
    raw.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    );

  if (
    brMatch
  ) {
    const day =
      Number(
        brMatch[1],
      );

    const month =
      Number(
        brMatch[2],
      );

    const year =
      Number(
        brMatch[3],
      );

    const date =
      new Date(
        year,
        month - 1,
        day,
        23,
        59,
        59,
        999,
      );

    if (
      date.getFullYear() !==
        year ||
      date.getMonth() !==
        month - 1 ||
      date.getDate() !==
        day
    ) {
      throw new Error(
        'A data informada não é válida.',
      );
    }

    if (
      date.getTime() <=
      Date.now()
    ) {
      throw new Error(
        'O vencimento precisa estar no futuro.',
      );
    }

    return date;
  }

  /*
   * YYYY-MM-DD
   */
  const isoMatch =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})$/,
    );

  if (
    isoMatch
  ) {
    const year =
      Number(
        isoMatch[1],
      );

    const month =
      Number(
        isoMatch[2],
      );

    const day =
      Number(
        isoMatch[3],
      );

    const date =
      new Date(
        year,
        month - 1,
        day,
        23,
        59,
        59,
        999,
      );

    if (
      date.getFullYear() !==
        year ||
      date.getMonth() !==
        month - 1 ||
      date.getDate() !==
        day
    ) {
      throw new Error(
        'A data informada não é válida.',
      );
    }

    if (
      date.getTime() <=
      Date.now()
    ) {
      throw new Error(
        'O vencimento precisa estar no futuro.',
      );
    }

    return date;
  }

  throw new Error(
    'Prazo inválido. Use, por exemplo: `30`, `30d`, `30 dias`, `31/12/2026` ou `2026-12-31`.',
  );
}

/* =========================================================
   FORMATAÇÃO DO PRAZO
========================================================= */

function formatDueDate(
  date: Date,
): string {
  return `<t:${Math.floor(
    date.getTime() /
      1000,
  )}:F>`;
}

/* =========================================================
   FORMATAÇÃO DO EMPRÉSTIMO
========================================================= */

function formatLoanValue(
  type: LoanType,
  value: string,
): string {
  if (
    type ===
    'DINHEIRO'
  ) {
    const numeric =
      Number(
        value
          .trim()
          .replace(
            /\s/g,
            '',
          )
          .replace(
            /^R\$/i,
            '',
          )
          .replace(
            /[Kk]$/,
            '',
          )
          .replace(
            /\./g,
            '',
          )
          .replace(
            ',',
            '.',
          ),
      );

    if (
      Number.isFinite(
        numeric,
      )
    ) {
      return money(
        Math.round(
          numeric,
        ),
      );
    }
  }

  return value;
}

/* =========================================================
   RESPONSÁVEL
========================================================= */

function extractResponsible(
  member: GuildMember,
): string {
  return member.user.tag.slice(
    0,
    120,
  );
}

/* =========================================================
   EXECUTOR
========================================================= */

export async function executeEmprestimoCommand(
  interaction:
    ChatInputCommandInteraction,
): Promise<void> {
  /* -------------------------------------------------------
     SERVIDOR
  ------------------------------------------------------- */

  if (
    !interaction.guild
  ) {
    await interaction.reply({
      content:
        '❌ Este comando só pode ser usado dentro de um servidor.',

      ephemeral:
        true,
    });

    return;
  }

  /* -------------------------------------------------------
     EXECUTOR
  ------------------------------------------------------- */

  let executor:
    | GuildMember;

  try {
    executor =
      await interaction.guild.members.fetch(
        interaction.user.id,
      );
  } catch (
    error
  ) {
    console.error(
      '❌ [EMPRESTIMO] Falha ao localizar executor:',
      error,
    );

    await interaction.reply({
      content:
        '❌ Não foi possível validar suas permissões.',

      ephemeral:
        true,
    });

    return;
  }

  /* -------------------------------------------------------
     PERMISSÃO
  ------------------------------------------------------- */

  try {
    requireAdmin(
      executor,
    );
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : 'Você não possui permissão para registrar empréstimos.';

    await interaction.reply({
      content:
        `⛔ ${message}`,

      ephemeral:
        true,
    });

    return;
  }

  /* -------------------------------------------------------
     MEMBRO DESTINATÁRIO
  ------------------------------------------------------- */

  const targetUser =
    interaction.options.getUser(
      'membro',
      true,
    );

  const targetMember =
    await interaction.guild.members
      .fetch(
        targetUser.id,
      )
      .catch(
        () => null,
      );

  if (
    !targetMember
  ) {
    await interaction.reply({
      content:
        '❌ Não foi possível localizar esse membro no servidor.',

      ephemeral:
        true,
    });

    return;
  }

  if (
    targetMember.user.bot
  ) {
    await interaction.reply({
      content:
        '❌ Empréstimos não podem ser registrados para bots.',

      ephemeral:
        true,
    });

    return;
  }

  /* -------------------------------------------------------
     TIPO
  ------------------------------------------------------- */

  const type =
    interaction.options.getString(
      'tipo',
      true,
    ) as LoanType;

  if (
    type !==
      'DINHEIRO' &&
    type !==
      'VEICULO'
  ) {
    await interaction.reply({
      content:
        '❌ Tipo de empréstimo inválido.',

      ephemeral:
        true,
    });

    return;
  }

  /* -------------------------------------------------------
     VALOR / ITEM
  ------------------------------------------------------- */

  const value =
    interaction.options.getString(
      'valor',
      true,
    ).trim();

  if (
    !value
  ) {
    await interaction.reply({
      content:
        '❌ Informe o valor ou item do empréstimo.',

      ephemeral:
        true,
    });

    return;
  }

  /* -------------------------------------------------------
     PRAZO
  ------------------------------------------------------- */

  const prazo =
    interaction.options.getString(
      'prazo',
      true,
    );

  let dueAt:
    Date;

  try {
    dueAt =
      parseDueDate(
        prazo,
      );
  } catch (
    error
  ) {
    const message =
      error instanceof Error
        ? error.message
        : 'Prazo inválido.';

    await interaction.reply({
      content:
        `❌ ${message}`,

      ephemeral:
        true,
    });

    return;
  }

  /* -------------------------------------------------------
     JUROS
  ------------------------------------------------------- */

  const interest =
    (
      interaction.options.getString(
        'juros',
      ) ??
      'Sem juros'
    ).trim() ||
    'Sem juros';

  /* -------------------------------------------------------
     MEMBRO NO BANCO
  ------------------------------------------------------- */

  try {
    await ensureMember(
      interaction.guild.id,

      {
        id:
          targetMember.id,

        username:
          targetMember.user.username,

        displayName:
          targetMember.displayName ??
          targetMember.user.username,
      },
    );
  } catch (
    error
  ) {
    console.error(
      '❌ [EMPRESTIMO] Falha ao sincronizar membro:',
      error,
    );

    await interaction.reply({
      content:
        '❌ Não foi possível preparar o membro para o registro do empréstimo.',

      ephemeral:
        true,
    });

    return;
  }

  /* -------------------------------------------------------
     REGISTRAR
  ------------------------------------------------------- */

  try {
    const result =
      await createLoan({
        guildId:
          interaction.guild.id,

        memberId:
          targetMember.id,

        type,

        value,

        dueAt,

        interest,

        responsible:
          extractResponsible(
            executor,
          ),
      });

    /* -----------------------------------------------------
       VALOR FORMATADO
    ----------------------------------------------------- */

    const valueFormatted =
      formatLoanValue(
        type,
        result.loan.value,
      );

    /* -----------------------------------------------------
       EMBED
    ----------------------------------------------------- */

    const embed =
      new EmbedBuilder()
        .setColor(
          type ===
            'DINHEIRO'
            ? 0x35d39a
            : 0x7c5cff,
        )
        .setTitle(
          '✅ EMPRÉSTIMO REGISTRADO',
        )
        .setDescription(
          [
            `O empréstimo de ${targetMember} foi registrado com sucesso.`,

            '',

            `👤 **Membro:** ${targetMember}`,

            `📦 **Tipo:** ${
              type ===
              'DINHEIRO'
                ? '💵 Dinheiro'
                : '🚗 Veículo'
            }`,

            `💰 **Valor / Item:** ${valueFormatted}`,

            `📅 **Vencimento:** ${formatDueDate(
              result.loan.dueAt,
            )}`,

            `💵 **Juros:** ${result.loan.interest}`,

            `🟢 **Status:** ATIVO`,
          ].join(
            '\n',
          ),
        )
        .setFooter({
          text:
            `Registrado por ${executor.user.tag}`,
        })
        .setTimestamp();

    /* -----------------------------------------------------
       NOVO SALDO
    ----------------------------------------------------- */

    if (
      type ===
      'DINHEIRO'
    ) {
      embed.addFields({
        name:
          '🏦 NOVO SALDO DO CAIXA',

        value:
          `**${money(
            result.cashBalance,
          )}**`,

        inline:
          false,
      });
    }

    await interaction.reply({
      embeds: [
        embed,
      ],
    });

  } catch (
    error
  ) {
    console.error(
      '❌ [EMPRESTIMO]',
      error,
    );

    const message =
      error instanceof Error
        ? error.message
        : 'Não foi possível registrar o empréstimo.';

    /*
     * Erro de negócio:
     * mostramos uma mensagem amigável.
     */
    await interaction.reply({
      content:
        `❌ ${message}`,

      ephemeral:
        true,
    });
  }
}
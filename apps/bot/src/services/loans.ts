// apps/bot/src/services/loans.ts

import { db } from './db.js';

/* =========================================================
   TIPOS
========================================================= */

export type LoanType =
  | 'DINHEIRO'
  | 'VEICULO';

export type CreateLoanInput = {
  guildId: string;
  memberId: string;
  type: LoanType;
  value: string;
  dueAt: Date;
  interest?: string;
  responsible: string;
};

export type CreatedLoanResult = {
  loan: {
    id: string;
    guildId: string;
    memberId: string;
    type: string;
    value: string;
    dueAt: Date;
    interest: string;
    status: string;
    createdAt: Date;
  };
  cashBalance: number;
};

/* =========================================================
   LIMITES
========================================================= */

const MAX_VALUE_LENGTH = 150;

const MAX_INTEREST_LENGTH = 50;

const MAX_RESPONSIBLE_LENGTH = 120;

/* =========================================================
   HELPERS
========================================================= */

function cleanText(
  value: string,
  fallback: string,
  maxLength: number,
): string {
  const cleaned =
    value.trim();

  if (
    !cleaned
  ) {
    return fallback;
  }

  return cleaned.slice(
    0,
    maxLength,
  );
}

function normalizeMoneyInput(
  value: string,
): number {
  const raw =
    value
      .trim()
      .replace(
        /\s/g,
        '',
      )
      .replace(
        /[R$Kk]/g,
        '',
      );

  if (
    !raw
  ) {
    return NaN;
  }

  /*
   * Aceita:
   *
   * 100000
   * 100.000
   * 100,000
   * 100.000,00
   * 100000,50
   */
  const normalized =
    raw.includes(',') &&
    raw.includes('.')
      ? raw
          .replace(
            /\./g,
            '',
          )
          .replace(
            ',',
            '.',
          )
      : raw.replace(
          ',',
          '.',
        );

  const number =
    Number(
      normalized,
    );

  if (
    !Number.isFinite(
      number,
    )
  ) {
    return NaN;
  }

  return Math.round(
    number,
  );
}

function validateDueAt(
  dueAt: Date,
): void {
  if (
    !(
      dueAt instanceof
      Date
    ) ||
    Number.isNaN(
      dueAt.getTime(),
    )
  ) {
    throw new Error(
      'O prazo informado não gerou uma data válida.',
    );
  }

  if (
    dueAt.getTime() <=
    Date.now()
  ) {
    throw new Error(
      'O prazo do empréstimo precisa estar no futuro.',
    );
  }
}

/* =========================================================
   CRIAR EMPRÉSTIMO
========================================================= */

export async function createLoan(
  input: CreateLoanInput,
): Promise<CreatedLoanResult> {
  const value =
    cleanText(
      input.value,
      '',
      MAX_VALUE_LENGTH,
    );

  const interest =
    cleanText(
      input.interest ??
        '',
      'Sem juros',
      MAX_INTEREST_LENGTH,
    );

  const responsible =
    cleanText(
      input.responsible,
      '',
      MAX_RESPONSIBLE_LENGTH,
    );

  /* -------------------------------------------------------
     VALIDAÇÕES BÁSICAS
  ------------------------------------------------------- */

  if (
    !input.guildId.trim()
  ) {
    throw new Error(
      'Servidor não informado.',
    );
  }

  if (
    !input.memberId.trim()
  ) {
    throw new Error(
      'Membro não informado.',
    );
  }

  if (
    !responsible
  ) {
    throw new Error(
      'Responsável pelo empréstimo não informado.',
    );
  }

  if (
    input.type !==
      'DINHEIRO' &&
    input.type !==
      'VEICULO'
  ) {
    throw new Error(
      'Tipo de empréstimo inválido.',
    );
  }

  validateDueAt(
    input.dueAt,
  );

  if (
    !value
  ) {
    throw new Error(
      'O valor ou item do empréstimo é obrigatório.',
    );
  }

  /* -------------------------------------------------------
     VALIDAÇÃO DE DINHEIRO
  ------------------------------------------------------- */

  if (
    input.type ===
    'DINHEIRO'
  ) {
    const amount =
      normalizeMoneyInput(
        value,
      );

    if (
      !Number.isFinite(
        amount,
      )
    ) {
      throw new Error(
        'Para empréstimos em dinheiro, informe um valor numérico válido. Ex.: 100000.',
      );
    }

    if (
      amount <= 0
    ) {
      throw new Error(
        'O valor do empréstimo precisa ser maior que zero.',
      );
    }
  }

  /* -------------------------------------------------------
     TRANSAÇÃO
  ------------------------------------------------------- */

  return db.$transaction(
    async (
      tx,
    ) => {
      const guild =
        await tx.guild.findUnique({
          where: {
            id:
              input.guildId,
          },
        });

      if (
        !guild
      ) {
        throw new Error(
          'Guild não configurada.',
        );
      }

      const member =
        await tx.member.findUnique({
          where: {
            id:
              input.memberId,
          },
        });

      if (
        !member ||
        member.guildId !==
          input.guildId
      ) {
        throw new Error(
          'O membro selecionado não pertence a este servidor ou ainda não está registrado.',
        );
      }

      let newCashBalance =
        guild.cashBalance;

      /* -----------------------------------------------------
         EMPRÉSTIMO EM DINHEIRO
      ----------------------------------------------------- */

      if (
        input.type ===
        'DINHEIRO'
      ) {
        const amount =
          normalizeMoneyInput(
            value,
          );

        if (
          guild.cashBalance <
          amount
        ) {
          throw new Error(
            'Saldo insuficiente no caixa para liberar este empréstimo.',
          );
        }

        newCashBalance =
          guild.cashBalance -
          amount;

        /*
         * O dinheiro entregue vira uma saída
         * oficial do caixa.
         */
        await tx.cashMovement.create({
          data: {
            guildId:
              input.guildId,

            memberId:
              input.memberId,

            type:
              'OUT',

            amount,

            reason:
              `Empréstimo concedido para ${member.displayName}`,

            responsible,
          },
        });

        await tx.guild.update({
          where: {
            id:
              input.guildId,
          },

          data: {
            cashBalance: {
              decrement:
                amount,
            },
          },
        });
      }

      /* -----------------------------------------------------
         REGISTRO DO EMPRÉSTIMO
      ----------------------------------------------------- */

      const loan =
        await tx.loan.create({
          data: {
            guildId:
              input.guildId,

            memberId:
              input.memberId,

            type:
              input.type,

            value,

            dueAt:
              input.dueAt,

            interest,

            status:
              'ATIVO',
          },
        });

      return {
        loan,

        cashBalance:
          newCashBalance,
      };
    },
  );
}
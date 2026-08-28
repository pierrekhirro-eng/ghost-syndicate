// apps/bot/src/services/finance.ts

import { db } from './db.js';

/* =========================================================
   TIPOS
========================================================= */

export type MovementType =
  | 'IN'
  | 'OUT';

export interface MemberData {
  id: string;
  username: string;
  displayName: string;
}

export interface FinancialSummary {
  guildId: string;
  cashBalance: number;
  dailyGoal: number;
  reserve: number;
  totalEntries: number;
  totalExits: number;
  netResult: number;
}

/* =========================================================
   GARANTIR GUILD
========================================================= */

export async function ensureGuild(
  guildId: string,
  name: string,
) {
  return db.guild.upsert({
    where: {
      id: guildId,
    },

    create: {
      id: guildId,
      name,
    },

    update: {
      name,
    },
  });
}

/* =========================================================
   GARANTIR MEMBRO
========================================================= */

export async function ensureMember(
  guildId: string,
  member: MemberData,
) {
  return db.member.upsert({
    where: {
      id: member.id,
    },

    create: {
      id: member.id,
      guildId,
      username: member.username,
      displayName: member.displayName,
    },

    update: {
      username: member.username,
      displayName: member.displayName,
    },
  });
}

/* =========================================================
   REGISTRAR ENTRADA / SAÍDA
========================================================= */

export async function addMovement(
  guildId: string,
  memberId: string | undefined,
  type: MovementType,
  amount: number,
  reason: string,
  responsible: string,
) {
  const value =
    Math.round(amount);

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    throw new Error(
      'O valor da movimentação precisa ser maior que zero.',
    );
  }

  const cleanReason =
    reason.trim();

  if (
    cleanReason.length < 2
  ) {
    throw new Error(
      'O motivo da movimentação é obrigatório.',
    );
  }

  const cleanResponsible =
    responsible.trim();

  if (
    cleanResponsible.length < 1
  ) {
    throw new Error(
      'O responsável pela movimentação é obrigatório.',
    );
  }

  return db.$transaction(
    async (tx) => {
      const guild =
        await tx.guild.findUnique({
          where: {
            id: guildId,
          },
        });

      if (!guild) {
        throw new Error(
          'Guild não configurada.',
        );
      }

      if (
        type === 'OUT' &&
        guild.cashBalance < value
      ) {
        throw new Error(
          'Saldo insuficiente no caixa.',
        );
      }

      await tx.cashMovement.create({
        data: {
          guildId,
          memberId,
          type,
          amount: value,
          reason: cleanReason,
          responsible:
            cleanResponsible,
        },
      });

      return tx.guild.update({
        where: {
          id: guildId,
        },

        data: {
          cashBalance: {
            increment:
              type === 'IN'
                ? value
                : -value,
          },
        },
      });
    },
  );
}

/* =========================================================
   CONFIGURAR CAIXA
========================================================= */

export async function updateCashSettings(
  guildId: string,
  settings: {
    dailyGoal?: number;
    reserve?: number;
  },
) {
  const data: {
    dailyGoal?: number;
    reserve?: number;
  } = {};

  if (
    settings.dailyGoal !==
    undefined
  ) {
    const dailyGoal =
      Math.round(
        settings.dailyGoal,
      );

    if (
      !Number.isFinite(
        dailyGoal,
      ) ||
      dailyGoal < 0
    ) {
      throw new Error(
        'A meta diária precisa ser um valor válido.',
      );
    }

    data.dailyGoal =
      dailyGoal;
  }

  if (
    settings.reserve !==
    undefined
  ) {
    const reserve =
      Math.round(
        settings.reserve,
      );

    if (
      !Number.isFinite(
        reserve,
      ) ||
      reserve < 0
    ) {
      throw new Error(
        'A reserva precisa ser um valor válido.',
      );
    }

    data.reserve =
      reserve;
  }

  if (
    Object.keys(data)
      .length === 0
  ) {
    throw new Error(
      'Nenhuma configuração financeira foi informada.',
    );
  }

  const guild =
    await db.guild.findUnique({
      where: {
        id: guildId,
      },
    });

  if (!guild) {
    throw new Error(
      'Guild não configurada.',
    );
  }

  return db.guild.update({
    where: {
      id: guildId,
    },

    data,
  });
}

/* =========================================================
   ALTERAR SALDO INICIAL
========================================================= */

export async function setInitialBalance(
  guildId: string,
  balance: number,
) {
  const value =
    Math.round(balance);

  if (
    !Number.isFinite(value) ||
    value < 0
  ) {
    throw new Error(
      'O saldo inicial precisa ser um valor válido.',
    );
  }

  const guild =
    await db.guild.findUnique({
      where: {
        id: guildId,
      },
    });

  if (!guild) {
    throw new Error(
      'Guild não configurada.',
    );
  }

  return db.guild.update({
    where: {
      id: guildId,
    },

    data: {
      cashBalance: value,
    },
  });
}

/* =========================================================
   BUSCAR MOVIMENTAÇÕES
========================================================= */

export async function getMovements(
  guildId: string,
  limit = 20,
) {
  const safeLimit =
    Math.min(
      Math.max(
        Math.round(limit),
        1,
      ),
      100,
    );

  return db.cashMovement.findMany({
    where: {
      guildId,
    },

    take: safeLimit,

    orderBy: {
      id: 'desc',
    },
  });
}

/* =========================================================
   RESUMO FINANCEIRO
========================================================= */

export async function getFinancialSummary(
  guildId: string,
): Promise<FinancialSummary> {
  const guild =
    await db.guild.findUnique({
      where: {
        id: guildId,
      },
    });

  if (!guild) {
    throw new Error(
      'Guild não configurada.',
    );
  }

  const movements =
    await db.cashMovement.findMany({
      where: {
        guildId,
      },
    });

  let totalEntries = 0;
  let totalExits = 0;

  for (
    const movement of movements
  ) {
    if (
      movement.type === 'IN'
    ) {
      totalEntries +=
        movement.amount;

      continue;
    }

    if (
      movement.type === 'OUT'
    ) {
      totalExits +=
        movement.amount;
    }
  }

  return {
    guildId,

    cashBalance:
      guild.cashBalance,

    dailyGoal:
      guild.dailyGoal,

    reserve:
      guild.reserve,

    totalEntries,

    totalExits,

    netResult:
      totalEntries -
      totalExits,
  };
}

/* =========================================================
   SALDO DISPONÍVEL
========================================================= */

export async function getCashBalance(
  guildId: string,
): Promise<number> {
  const guild =
    await db.guild.findUnique({
      where: {
        id: guildId,
      },

      select: {
        cashBalance: true,
      },
    });

  if (!guild) {
    throw new Error(
      'Guild não configurada.',
    );
  }

  return guild.cashBalance;
}

/* =========================================================
   META DIÁRIA
========================================================= */

export async function getDailyGoal(
  guildId: string,
): Promise<number> {
  const guild =
    await db.guild.findUnique({
      where: {
        id: guildId,
      },

      select: {
        dailyGoal: true,
      },
    });

  if (!guild) {
    throw new Error(
      'Guild não configurada.',
    );
  }

  return guild.dailyGoal;
}

/* =========================================================
   RESERVA
========================================================= */

export async function getReserve(
  guildId: string,
): Promise<number> {
  const guild =
    await db.guild.findUnique({
      where: {
        id: guildId,
      },

      select: {
        reserve: true,
      },
    });

  if (!guild) {
    throw new Error(
      'Guild não configurada.',
    );
  }

  return guild.reserve;
}

/* =========================================================
   META ATINGIDA
========================================================= */

export async function isDailyGoalReached(
  guildId: string,
): Promise<boolean> {
  const guild =
    await db.guild.findUnique({
      where: {
        id: guildId,
      },

      select: {
        cashBalance: true,
        dailyGoal: true,
      },
    });

  if (!guild) {
    throw new Error(
      'Guild não configurada.',
    );
  }

  if (
    guild.dailyGoal <= 0
  ) {
    return false;
  }

  return (
    guild.cashBalance >=
    guild.dailyGoal
  );
}

/* =========================================================
   TOTAL DE ENTRADAS
========================================================= */

export async function getTotalEntries(
  guildId: string,
): Promise<number> {
  const movements =
    await db.cashMovement.findMany({
      where: {
        guildId,
        type: 'IN',
      },

      select: {
        amount: true,
      },
    });

  return movements.reduce(
    (total, movement) =>
      total + movement.amount,
    0,
  );
}

/* =========================================================
   TOTAL DE SAÍDAS
========================================================= */

export async function getTotalExits(
  guildId: string,
): Promise<number> {
  const movements =
    await db.cashMovement.findMany({
      where: {
        guildId,
        type: 'OUT',
      },

      select: {
        amount: true,
      },
    });

  return movements.reduce(
    (total, movement) =>
      total + movement.amount,
    0,
  );
}

/* =========================================================
   LUCRO LÍQUIDO
========================================================= */

export async function getNetResult(
  guildId: string,
): Promise<number> {
  const summary =
    await getFinancialSummary(
      guildId,
    );

  return summary.netResult;
}
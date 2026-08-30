import { db } from './db.js';

/* =========================================================
   TIPOS
========================================================= */

export type VoiceRankingEntry = {
  memberId: string;
  name: string;
  seconds: number;
  active: boolean;
  channelId: string | null;
  startedAt: Date | null;
};

/* =========================================================
   HELPERS
========================================================= */

function secondsBetween(
  startedAt: Date,
  endedAt: Date,
): number {
  return Math.max(
    0,
    Math.floor(
      (
        endedAt.getTime() -
        startedAt.getTime()
      ) / 1000,
    ),
  );
}

function liveSeconds(
  startedAt: Date,
): number {
  return secondsBetween(
    startedAt,
    new Date(),
  );
}

/* =========================================================
   MEMBRO
========================================================= */

async function ensureMember(
  guildId: string,
  userId: string,
  displayName: string,
  username: string,
): Promise<void> {
  await db.member.upsert({
    where: {
      id: userId,
    },

    create: {
      id: userId,
      guildId,
      displayName,
      username,
    },

    update: {
      guildId,
      displayName,
      username,
    },
  });
}

/* =========================================================
   SESSÃO ATIVA
========================================================= */

export async function getActiveVoiceSession(
  guildId: string,
  userId: string,
) {
  return db.voiceSession.findFirst({
    where: {
      guildId,
      memberId: userId,
      endedAt: null,
    },

    orderBy: {
      startedAt: 'desc',
    },
  });
}

/* =========================================================
   INICIAR SESSÃO
========================================================= */

export async function startVoice(
  guildId: string,
  userId: string,
  channelId: string,
  displayName: string,
  username: string,
): Promise<void> {
  await ensureMember(
    guildId,
    userId,
    displayName,
    username,
  );

  const active =
    await getActiveVoiceSession(
      guildId,
      userId,
    );

  /*
   * Se já existe uma sessão no mesmo canal,
   * não cria outra.
   */

  if (
    active &&
    active.channelId ===
      channelId
  ) {
    return;
  }

  /*
   * Se existe uma sessão em outro canal,
   * encerra a anterior.
   */

  if (
    active
  ) {
    const endedAt =
      new Date();

    const seconds =
      secondsBetween(
        active.startedAt,
        endedAt,
      );

    await db.voiceSession.update({
      where: {
        id: active.id,
      },

      data: {
        endedAt,
        seconds,
      },
    });

    console.log(
      `🔄 [VOICE] Sessão anterior encerrada: ${displayName} | ${seconds}s`,
    );
  }

  /*
   * Cria nova sessão.
   */

  await db.voiceSession.create({
    data: {
      guildId,
      memberId: userId,
      channelId,
      startedAt: new Date(),
      seconds: 0,
    },
  });

  console.log(
    `🟢 [VOICE] ${displayName} entrou na call ${channelId}.`,
  );
}

/* =========================================================
   ENCERRAR SESSÃO
========================================================= */

export async function stopVoice(
  guildId: string,
  userId: string,
): Promise<void> {
  const active =
    await getActiveVoiceSession(
      guildId,
      userId,
    );

  if (
    !active
  ) {
    return;
  }

  const endedAt =
    new Date();

  const seconds =
    secondsBetween(
      active.startedAt,
      endedAt,
    );

  await db.voiceSession.update({
    where: {
      id: active.id,
    },

    data: {
      endedAt,
      seconds,
    },
  });

  console.log(
    `🔴 [VOICE] Sessão encerrada: ${userId} | ${seconds}s.`,
  );
}

/* =========================================================
   ENCERRAR SESSÃO STALE
========================================================= */

export async function forceStopVoiceSession(
  sessionId: string,
  reason = 'reconciliação',
): Promise<void> {
  /*
   * IMPORTANTE:
   * VoiceSession.id é STRING no Prisma.
   */

  const session =
    await db.voiceSession.findUnique({
      where: {
        id: sessionId,
      },
    });

  if (
    !session ||
    session.endedAt
  ) {
    return;
  }

  const endedAt =
    new Date();

  const seconds =
    secondsBetween(
      session.startedAt,
      endedAt,
    );

  await db.voiceSession.update({
    where: {
      id: session.id,
    },

    data: {
      endedAt,
      seconds,
    },
  });

  console.log(
    `🧹 [VOICE] Sessão stale encerrada: ${session.memberId} | ${seconds}s | motivo: ${reason}`,
  );
}

/* =========================================================
   RECONCILIAR SESSÕES
========================================================= */

export async function reconcileVoiceSessions(
  guildId: string,
  currentMembers: Array<{
    userId: string;
    channelId: string;
    displayName: string;
    username: string;
  }>,
): Promise<void> {
  /*
   * Estado real atual do Discord.
   */

  const currentMap =
    new Map(
      currentMembers.map(
        (
          member,
        ) => [
          member.userId,
          member,
        ],
      ),
    );

  /*
   * Sessões abertas no banco.
   */

  const activeSessions =
    await db.voiceSession.findMany({
      where: {
        guildId,
        endedAt: null,
      },

      orderBy: {
        startedAt: 'asc',
      },
    });

  /*
   * =======================================================
   * 1. SESSÕES STALE
   * =======================================================
   */

  for (
    const session of activeSessions
  ) {
    const current =
      currentMap.get(
        session.memberId,
      );

    /*
     * Não está em nenhuma call.
     */

    if (
      !current
    ) {
      await forceStopVoiceSession(
        session.id,
        'membro não está em canal de voz',
      );

      continue;
    }

    /*
     * Está em outro canal.
     */

    if (
      current.channelId !==
      session.channelId
    ) {
      await forceStopVoiceSession(
        session.id,
        'canal de voz alterado',
      );

      await startVoice(
        guildId,
        current.userId,
        current.channelId,
        current.displayName,
        current.username,
      );
    }
  }

  /*
   * =======================================================
   * 2. MEMBROS EM CALL SEM SESSÃO
   * =======================================================
   */

  for (
    const member of currentMembers
  ) {
    const active =
      await getActiveVoiceSession(
        guildId,
        member.userId,
      );

    if (
      !active
    ) {
      await startVoice(
        guildId,
        member.userId,
        member.channelId,
        member.displayName,
        member.username,
      );
    }
  }
}

/* =========================================================
   TEMPO TOTAL DO MEMBRO
========================================================= */

export async function memberVoiceSeconds(
  guildId: string,
  userId: string,
): Promise<number> {
  /*
   * Sessões encerradas.
   */

  const finished =
    await db.voiceSession.findMany({
      where: {
        guildId,
        memberId: userId,
        endedAt: {
          not: null,
        },
      },

      select: {
        seconds: true,
      },
    });

  const finishedSeconds =
    finished.reduce(
      (
        total,
        session,
      ) =>
        total +
        Math.max(
          0,
          Number(
            session.seconds ??
              0,
          ),
        ),
      0,
    );

  /*
   * Sessão atual.
   */

  const active =
    await getActiveVoiceSession(
      guildId,
      userId,
    );

  const activeSeconds =
    active
      ? liveSeconds(
          active.startedAt,
        )
      : 0;

  return (
    finishedSeconds +
    activeSeconds
  );
}

/* =========================================================
   RANKING
========================================================= */

export async function topVoice(
  guildId: string,
  limit = 10,
): Promise<VoiceRankingEntry[]> {
  /*
   * Sessões encerradas.
   */

  const finished =
    await db.voiceSession.findMany({
      where: {
        guildId,
        endedAt: {
          not: null,
        },
      },

      select: {
        memberId: true,
        seconds: true,
      },
    });

  /*
   * Sessões atuais.
   */

  const active =
    await db.voiceSession.findMany({
      where: {
        guildId,
        endedAt: null,
      },

      select: {
        memberId: true,
        channelId: true,
        startedAt: true,
      },
    });

  /*
   * Acumulador.
   */

  const totals =
    new Map<
      string,
      {
        seconds: number;
        active: boolean;
        channelId:
          string | null;
        startedAt:
          Date | null;
      }
    >();

  /*
   * =======================================================
   * SESSÕES ENCERRADAS
   * =======================================================
   */

  for (
    const session of finished
  ) {
    const current =
      totals.get(
        session.memberId,
      );

    const seconds =
      Math.max(
        0,
        Number(
          session.seconds ??
            0,
        ),
      );

    if (
      current
    ) {
      current.seconds +=
        seconds;

      continue;
    }

    totals.set(
      session.memberId,
      {
        seconds,
        active:
          false,
        channelId:
          null,
        startedAt:
          null,
      },
    );
  }

  /*
   * =======================================================
   * SESSÕES ATIVAS
   * =======================================================
   */

  for (
    const session of active
  ) {
    const seconds =
      liveSeconds(
        session.startedAt,
      );

    const current =
      totals.get(
        session.memberId,
      );

    if (
      current
    ) {
      current.seconds +=
        seconds;

      current.active =
        true;

      current.channelId =
        session.channelId;

      current.startedAt =
        session.startedAt;

      continue;
    }

    totals.set(
      session.memberId,
      {
        seconds,
        active:
          true,
        channelId:
          session.channelId,
        startedAt:
          session.startedAt,
      },
    );
  }

  /*
   * =======================================================
   * MEMBROS
   * =======================================================
   */

  const members =
    await db.member.findMany({
      where: {
        guildId,
      },

      select: {
        id: true,
        username: true,
        displayName: true,
      },
    });

  const memberMap =
    new Map(
      members.map(
        (
          member,
        ) => [
          member.id,
          member,
        ],
      ),
    );

  /*
   * =======================================================
   * RESULTADO FINAL
   * =======================================================
   */

  return [...totals.entries()]
    .map(
      (
        [
          memberId,
          data,
        ],
      ) => {
        const member =
          memberMap.get(
            memberId,
          );

        return {
          memberId,

          name:
            member?.displayName ||
            member?.username ||
            memberId,

          seconds:
            Math.max(
              0,
              Math.floor(
                data.seconds,
              ),
            ),

          active:
            data.active,

          channelId:
            data.channelId,

          startedAt:
            data.startedAt,
        };
      },
    )
    .sort(
      (
        a,
        b,
      ) => {
        /*
         * Mais tempo primeiro.
         */

        if (
          b.seconds !==
          a.seconds
        ) {
          return (
            b.seconds -
            a.seconds
          );
        }

        /*
         * Em caso de empate,
         * quem está em call aparece primeiro.
         */

        if (
          a.active !==
          b.active
        ) {
          return a.active
            ? -1
            : 1;
        }

        /*
         * Desempate estável pelo ID.
         */

        return a.memberId.localeCompare(
          b.memberId,
        );
      },
    )
    .slice(
      0,
      Math.min(
        Math.max(
          1,
          Math.floor(
            Number(
              limit,
            ),
          ),
        ),
        100,
      ),
    );
}
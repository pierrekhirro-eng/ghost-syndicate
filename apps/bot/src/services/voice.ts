// apps/bot/src/services/voice.ts

import { db } from './db.js';

export type VoiceRankingEntry = {
  memberId: string;
  name: string;
  seconds: number;
  active: boolean;
  channelId: string | null;
  startedAt: Date | null;
};

function calculateSeconds(
  startedAt: Date,
  endedAt: Date,
): number {
  return Math.max(
    0,
    Math.floor(
      (endedAt.getTime() -
        startedAt.getTime()) /
        1000,
    ),
  );
}

function calculateLiveSeconds(
  startedAt: Date,
): number {
  return calculateSeconds(
    startedAt,
    new Date(),
  );
}

async function ensureMember(
  guildId: string,
  userId: string,
  displayName: string,
  username: string,
): Promise<void> {
  await db.member.upsert({
    where: {
      id:
        userId,
    },

    create: {
      id:
        userId,
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
    await db.voiceSession.findFirst({
      where: {
        guildId,
        memberId:
          userId,
        endedAt:
          null,
      },

      orderBy: {
        startedAt:
          'desc',
      },
    });

  if (
    active &&
    active.channelId ===
      channelId
  ) {
    return;
  }

  if (active) {
    const endedAt =
      new Date();

    const seconds =
      calculateSeconds(
        active.startedAt,
        endedAt,
      );

    await db.voiceSession.update({
      where: {
        id:
          active.id,
      },

      data: {
        endedAt,
        seconds,
      },
    });

    console.log(
      `🔄 [VOICE] ${displayName} trocou de canal. Sessão anterior: ${seconds}s.`,
    );
  }

  await db.voiceSession.create({
    data: {
      guildId,
      memberId:
        userId,
      channelId,
      startedAt:
        new Date(),
      seconds:
        0,
    },
  });

  console.log(
    `🟢 [VOICE] ${displayName} entrou na call ${channelId}.`,
  );
}

export async function stopVoice(
  guildId: string,
  userId: string,
): Promise<void> {
  const active =
    await db.voiceSession.findFirst({
      where: {
        guildId,
        memberId:
          userId,
        endedAt:
          null,
      },

      orderBy: {
        startedAt:
          'desc',
      },
    });

  if (!active) {
    console.log(
      `⚠️ [VOICE] Nenhuma sessão ativa encontrada para ${userId}.`,
    );

    return;
  }

  const endedAt =
    new Date();

  const seconds =
    calculateSeconds(
      active.startedAt,
      endedAt,
    );

  await db.voiceSession.update({
    where: {
      id:
        active.id,
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

export async function getActiveVoiceSession(
  guildId: string,
  userId: string,
) {
  return db.voiceSession.findFirst({
    where: {
      guildId,
      memberId:
        userId,
      endedAt:
        null,
    },

    orderBy: {
      startedAt:
        'desc',
    },
  });
}

export async function activeVoiceSeconds(
  guildId: string,
  userId: string,
): Promise<number> {
  const active =
    await getActiveVoiceSession(
      guildId,
      userId,
    );

  if (!active) {
    return 0;
  }

  return calculateLiveSeconds(
    active.startedAt,
  );
}

export async function memberVoiceSeconds(
  guildId: string,
  userId: string,
): Promise<number> {
  const finished =
    await db.voiceSession.findMany({
      where: {
        guildId,
        memberId:
          userId,
        endedAt: {
          not:
            null,
        },
      },

      select: {
        seconds:
          true,
      },
    });

  const finishedSeconds =
    finished.reduce(
      (total, session) =>
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

  return (
    finishedSeconds +
    (await activeVoiceSeconds(
      guildId,
      userId,
    ))
  );
}

export async function topVoice(
  guildId: string,
  limit = 10,
): Promise<VoiceRankingEntry[]> {
  const safeLimit =
    Math.min(
      100,
      Math.max(
        1,
        Math.floor(
          Number(limit),
        ),
      ),
    );

  const finished =
    await db.voiceSession.findMany({
      where: {
        guildId,
        endedAt: {
          not:
            null,
        },
      },

      select: {
        memberId:
          true,
        seconds:
          true,
      },
    });

  const active =
    await db.voiceSession.findMany({
      where: {
        guildId,
        endedAt:
          null,
      },

      select: {
        memberId:
          true,
        channelId:
          true,
        startedAt:
          true,
      },
    });

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

  for (const session of finished) {
    const seconds =
      Math.max(
        0,
        Number(
          session.seconds ??
            0,
        ),
      );

    const current =
      totals.get(
        session.memberId,
      );

    if (current) {
      current.seconds +=
        seconds;
    } else {
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
  }

  for (const session of active) {
    const seconds =
      calculateLiveSeconds(
        session.startedAt,
      );

    const current =
      totals.get(
        session.memberId,
      );

    if (current) {
      current.seconds +=
        seconds;
      current.active =
        true;
      current.channelId =
        session.channelId;
      current.startedAt =
        session.startedAt;
    } else {
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
  }

  const members =
    await db.member.findMany({
      where: {
        guildId,
      },

      select: {
        id:
          true,
        username:
          true,
        displayName:
          true,
      },
    });

  const memberMap =
    new Map(
      members.map(
        (member) => [
          member.id,
          member,
        ],
      ),
    );

  return [...totals.entries()]
    .map(
      (entry) => {
        const memberId =
          entry[0];

        const data =
          entry[1];

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
      (a, b) => {
        if (
          b.seconds !==
          a.seconds
        ) {
          return (
            b.seconds -
            a.seconds
          );
        }

        if (
          a.active !==
          b.active
        ) {
          return a.active
            ? -1
            : 1;
        }

        return a.memberId.localeCompare(
          b.memberId,
        );
      },
    )
    .slice(
      0,
      safeLimit,
    );
}

export async function voiceRankingSize(
  guildId: string,
): Promise<number> {
  const ranking =
    await topVoice(
      guildId,
      100,
    );

  return ranking.length;
}

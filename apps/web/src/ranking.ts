// apps/web/src/ranking.ts

import type {
  Express,
  Request,
  Response,
} from 'express';

import {
  PrismaClient,
} from '@prisma/client';

/* =========================================================
   TIPOS
========================================================= */

type RankingMember = {
  memberId: string;
  name: string;
  seconds: number;
  active: boolean;
  channelId: string | null;
  startedAt: string | null;
};

/* =========================================================
   HELPERS
========================================================= */

function formatDuration(
  seconds: number,
): string {
  const safe =
    Math.max(
      0,
      Math.floor(
        Number(
          seconds ?? 0,
        ),
      ),
    );

  const hours =
    Math.floor(
      safe / 3600,
    );

  const minutes =
    Math.floor(
      (safe % 3600) /
        60,
    );

  const secs =
    safe % 60;

  return [
    hours > 0
      ? `${hours}h`
      : '',
    minutes > 0
      ? `${minutes}m`
      : '',
    `${secs}s`,
  ]
    .filter(Boolean)
    .join(' ');
}

function escapeHtml(
  value: string,
): string {
  return value
    .replaceAll(
      '&',
      '&amp;',
    )
    .replaceAll(
      '<',
      '&lt;',
    )
    .replaceAll(
      '>',
      '&gt;',
    )
    .replaceAll(
      '"',
      '&quot;',
    )
    .replaceAll(
      "'",
      '&#039;',
    );
}

/* =========================================================
   GET GUILD
========================================================= */

function getGuildId(): string {
  const guildId =
    process.env.DISCORD_GUILD_ID;

  if (
    !guildId
  ) {
    throw new Error(
      'DISCORD_GUILD_ID não configurado.',
    );
  }

  return guildId;
}

/* =========================================================
   CALCULAR RANKING
========================================================= */

async function getLiveRanking(
  db: PrismaClient,
  guildId: string,
): Promise<RankingMember[]> {
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

  /*
   * Sessões encerradas.
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
   * Sessões ativas.
   */

  const now =
    Date.now();

  for (
    const session of active
  ) {
    const liveSeconds =
      Math.max(
        0,
        Math.floor(
          (
            now -
            session.startedAt.getTime()
          ) / 1000,
        ),
      );

    const current =
      totals.get(
        session.memberId,
      );

    if (
      current
    ) {
      current.seconds +=
        liveSeconds;

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
        seconds:
          liveSeconds,

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
   * Membros.
   */

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

  const membersMap =
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
   * Montar ranking.
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
          membersMap.get(
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
            data.startedAt
              ? data.startedAt.toISOString()
              : null,
        };
      },
    )
    .sort(
      (
        a,
        b,
      ) => {
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
    );
}

/* =========================================================
   API
========================================================= */

export function registerRankingRoutes(
  app: Express,
  db: PrismaClient,
): void {

  /*
   * GET /api/ranking/live
   */

  app.get(
    '/api/ranking/live',
    async (
      _req: Request,
      res: Response,
    ) => {
      try {

        const guildId =
          getGuildId();

        const ranking =
          await getLiveRanking(
            db,
            guildId,
          );

        res.json({
          updatedAt:
            new Date().toISOString(),

          ranking:
            ranking.map(
              (
                member,
                index,
              ) => ({
                position:
                  index + 1,

                memberId:
                  member.memberId,

                name:
                  member.name,

                seconds:
                  member.seconds,

                duration:
                  formatDuration(
                    member.seconds,
                  ),

                active:
                  member.active,

                channelId:
                  member.channelId,

                startedAt:
                  member.startedAt,
              }),
            ),
        });

      } catch (
        error
      ) {

        console.error(
          '[RANKING API]',
          error,
        );

        res
          .status(500)
          .json({
            error:
              'Não foi possível carregar o ranking.',
          });

      }
    },
  );

  /*
   * GET /ranking
   */

  app.get(
    '/ranking',
    (
      _req: Request,
      res: Response,
    ) => {

      res
        .type('html')
        .send(
          createRankingPage(),
        );

    },
  );
}

/* =========================================================
   PÁGINA
========================================================= */

function createRankingPage(): string {
  return `
<!doctype html>

<html lang="pt-BR">

<head>

  <meta charset="utf-8">

  <meta
    name="viewport"
    content="width=device-width, initial-scale=1"
  >

  <meta
    name="theme-color"
    content="#030806"
  >

  <meta
    name="color-scheme"
    content="dark"
  >

  <title>
    Ranking de Voz • Ghost Syndicate
  </title>

  <style>

    :root {

      color-scheme:
        dark;

      --bg:
        #030806;

      --panel:
        #07100a;

      --panel-2:
        #0a160e;

      --panel-3:
        #0d1b12;

      --border:
        rgba(
          67,
          255,
          152,
          .14
        );

      --border-strong:
        rgba(
          67,
          255,
          152,
          .30
        );

      --green:
        #43ff98;

      --green-soft:
        #aaffc9;

      --text:
        #effff5;

      --muted:
        #769281;

      --muted-2:
        #526c5d;

      --danger:
        #ff6969;

    }

    * {
      box-sizing:
        border-box;
    }

    html,
    body {
      margin:
        0;

      min-height:
        100%;

      background:
        var(--bg);
    }

    body {

      min-height:
        100vh;

      color:
        var(--text);

      font-family:
        Inter,
        ui-sans-serif,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;

      background:

        radial-gradient(
          circle at 10% 0%,
          rgba(
            67,
            255,
            152,
            .09
          ),
          transparent 30%
        ),

        radial-gradient(
          circle at 90% 15%,
          rgba(
            67,
            255,
            152,
            .04
          ),
          transparent 22%
        ),

        #030806;

      overflow-x:
        hidden;

    }

    /*
     * OLED
     */

    body::before {

      content:
        "";

      position:
        fixed;

      inset:
        0;

      z-index:
        100;

      pointer-events:
        none;

      opacity:
        .018;

      background:
        repeating-linear-gradient(
          180deg,
          rgba(
            255,
            255,
            255,
            .25
          ) 0,
          rgba(
            255,
            255,
            255,
            .25
          ) 1px,
          transparent 1px,
          transparent 6px
        );

    }

    body::after {

      content:
        "";

      position:
        fixed;

      width:
        460px;

      height:
        460px;

      top:
        -300px;

      left:
        -200px;

      border-radius:
        50%;

      background:
        radial-gradient(
          circle,
          rgba(
            67,
            255,
            152,
            .10
          ),
          transparent 68%
        );

      filter:
        blur(
          28px
        );

      pointer-events:
        none;

      animation:
        ambient
        12s
        ease-in-out
        infinite;

    }

    @keyframes ambient {

      0%,
      100% {
        transform:
          translate(
            0,
            0
          );
      }

      50% {
        transform:
          translate(
            90px,
            50px
          );
      }

    }

    @keyframes enter {

      from {

        opacity:
          0;

        transform:
          translateY(
            12px
          );

      }

      to {

        opacity:
          1;

        transform:
          translateY(
            0
          );

      }

    }

    @keyframes pulse {

      0%,
      100% {

        transform:
          scale(
            .9
          );

        opacity:
          .65;

      }

      50% {

        transform:
          scale(
            1.08
          );

        opacity:
          1;

      }

    }

    @keyframes shimmer {

      from {
        transform:
          translateX(
            -130%
          );
      }

      to {
        transform:
          translateX(
            130%
          );
      }

    }

    .page {

      width:
        min(
          1180px,
          calc(
            100% - 28px
          )
        );

      margin:
        0 auto;

      padding:
        16px 0 32px;

      position:
        relative;

      z-index:
        1;

    }

    /*
     * HEADER
     */

    .header {

      position:
        sticky;

      top:
        10px;

      z-index:
        20;

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        16px;

      padding:
        11px 13px;

      margin-bottom:
        16px;

      border:
        1px solid
        var(--border);

      border-radius:
        17px;

      background:
        rgba(
          5,
          13,
          8,
          .92
        );

      backdrop-filter:
        blur(
          17px
        );

      box-shadow:
        0 20px 60px
        rgba(
          0,
          0,
          0,
          .28
        );

      overflow:
        hidden;

      animation:
        enter
        .45s
        ease
        both;

    }

    .header::after {

      content:
        "";

      position:
        absolute;

      left:
        0;

      bottom:
        0;

      width:
        32%;

      height:
        1px;

      background:
        var(--green);

      box-shadow:
        0 0 18px
        rgba(
          67,
          255,
          152,
          .75
        );

      animation:
        shimmer
        5s
        linear
        infinite;

    }

    .brand {

      display:
        flex;

      align-items:
        center;

      gap:
        11px;

    }

    .logo {

      width:
        43px;

      height:
        43px;

      display:
        grid;

      place-items:
        center;

      border:
        1px solid
        var(--border-strong);

      border-radius:
        13px;

      background:
        linear-gradient(
          145deg,
          #112b1b,
          #07110a
        );

      font-size:
        22px;

      box-shadow:
        inset
        0
        0
        24px
        rgba(
          67,
          255,
          152,
          .035
        );

    }

    .eyebrow {

      margin:
        0 0 2px;

      color:
        var(--green);

      font-size:
        8px;

      font-weight:
        950;

      letter-spacing:
        .20em;

      text-transform:
        uppercase;

    }

    .brand h1 {

      margin:
        0;

      font-size:
        15px;

      font-weight:
        900;

    }

    .header-right {

      display:
        flex;

      align-items:
        center;

      gap:
        7px;

      flex-wrap:
        wrap;

      justify-content:
        flex-end;

    }

    .live-pill {

      display:
        inline-flex;

      align-items:
        center;

      gap:
        7px;

      min-height:
        32px;

      padding:
        7px 11px;

      border:
        1px solid
        var(--border);

      border-radius:
        999px;

      background:
        #07120b;

      color:
        #84a38f;

      font-size:
        9px;

      font-weight:
        850;

    }

    .live-dot {

      width:
        7px;

      height:
        7px;

      border-radius:
        50%;

      background:
        var(--green);

      box-shadow:
        0 0 12px
        rgba(
          67,
          255,
          152,
          .85
        );

      animation:
        pulse
        1.8s
        ease-in-out
        infinite;

    }

    .refresh {

      min-height:
        32px;

      padding:
        7px 11px;

      border:
        1px solid
        var(--border);

      border-radius:
        9px;

      background:
        #07120b;

      color:
        var(--green-soft);

      font:
        800 9px/1
        inherit;

    }

    /*
     * HERO
     */

    .hero {

      display:
        grid;

      grid-template-columns:
        minmax(
          0,
          1fr
        )
        260px;

      gap:
        12px;

      margin-bottom:
        12px;

    }

    .hero-main,
    .hero-side {

      border:
        1px solid
        var(--border);

      border-radius:
        19px;

      background:
        linear-gradient(
          135deg,
          rgba(
            11,
            27,
            17,
            .96
          ),
          rgba(
            5,
            13,
            8,
            .98
          )
        );

      animation:
        enter
        .5s
        .05s
        ease
        both;

    }

    .hero-main {

      position:
        relative;

      overflow:
        hidden;

      padding:
        25px;

    }

    .hero-main::after {

      content:
        "";

      position:
        absolute;

      width:
        190px;

      height:
        190px;

      right:
        -120px;

      bottom:
        -120px;

      border-radius:
        50%;

      background:
        rgba(
          67,
          255,
          152,
          .055
        );

      filter:
        blur(
          14px
        );

    }

    .hero-kicker {

      margin:
        0 0 8px;

      color:
        var(--green);

      font-size:
        9px;

      font-weight:
        950;

      letter-spacing:
        .18em;

      text-transform:
        uppercase;

    }

    .hero-main h2 {

      margin:
        0;

      font-size:
        clamp(
          33px,
          5vw,
          55px
        );

      line-height:
        .98;

      letter-spacing:
        -.06em;

    }

    .hero-main p {

      max-width:
        690px;

      margin:
        13px 0 0;

      color:
        var(--muted);

      font-size:
        12px;

      line-height:
        1.65;

    }

    .hero-side {

      display:
        flex;

      flex-direction:
        column;

      justify-content:
        space-between;

      padding:
        18px;

      animation-delay:
        .09s;

    }

    .side-label {

      margin:
        0 0 8px;

      color:
        var(--muted-2);

      font-size:
        8px;

      font-weight:
        950;

      letter-spacing:
        .15em;

      text-transform:
        uppercase;

    }

    .leader-number {

      color:
        var(--green-soft);

      font:
        900 26px/1
        ui-monospace,
        monospace;

    }

    .leader-name {

      margin-top:
        7px;

      font-size:
        13px;

      font-weight:
        850;

    }

    .side-meta {

      margin-top:
        18px;

      padding:
        10px;

      border:
        1px solid
        var(--border);

      border-radius:
        11px;

      background:
        rgba(
          67,
          255,
          152,
          .025
        );

      color:
        #80a08c;

      font-size:
        9px;

      line-height:
        1.55;

    }

    /*
     * PODIUM
     */

    .podium {

      display:
        grid;

      grid-template-columns:
        repeat(
          3,
          minmax(
            0,
            1fr
          )
        );

      align-items:
        end;

      gap:
        12px;

      margin-bottom:
        12px;

    }

    .podium-card {

      position:
        relative;

      min-height:
        195px;

      padding:
        18px;

      border:
        1px solid
        var(--border);

      border-radius:
        18px;

      background:
        linear-gradient(
          180deg,
          rgba(
            9,
            22,
            14,
            .95
          ),
          rgba(
            5,
            12,
            8,
            .98
          )
        );

      box-shadow:
        0 24px 70px
        rgba(
          0,
          0,
          0,
          .19
        );

      animation:
        enter
        .5s
        ease
        both;

      transition:
        transform
        .2s
        ease,
        border-color
        .2s
        ease;

    }

    .podium-card:hover {

      transform:
        translateY(
          -3px
        );

      border-color:
        var(--border-strong);

    }

    .podium-card.first {

      min-height:
        225px;

      border-color:
        rgba(
          67,
          255,
          152,
          .28
        );

      box-shadow:
        0 0 50px
        rgba(
          67,
          255,
          152,
          .04
        ),
        0 28px 80px
        rgba(
          0,
          0,
          0,
          .22
        );

    }

    .podium-position {

      font-size:
        24px;

    }

    .podium-rank {

      margin-top:
        10px;

      color:
        var(--muted-2);

      font-size:
        8px;

      font-weight:
        950;

      letter-spacing:
        .14em;

      text-transform:
        uppercase;

    }

    .podium-name {

      margin-top:
        8px;

      font-size:
        15px;

      font-weight:
        900;

      overflow:
        hidden;

      text-overflow:
        ellipsis;

      white-space:
        nowrap;

    }

    .podium-time {

      margin-top:
        8px;

      color:
        var(--green-soft);

      font:
        900 18px/1.2
        ui-monospace,
        monospace;

    }

    .podium-live {

      display:
        inline-flex;

      align-items:
        center;

      gap:
        6px;

      margin-top:
        12px;

      padding:
        6px 8px;

      border:
        1px solid
        rgba(
          67,
          255,
          152,
          .13
        );

      border-radius:
        999px;

      background:
        rgba(
          67,
          255,
          152,
          .025
        );

      color:
        #8fbca0;

      font-size:
        8px;

      font-weight:
        850;

    }

    /*
     * RANKING
     */

    .ranking-panel {

      overflow:
        hidden;

      border:
        1px solid
        var(--border);

      border-radius:
        19px;

      background:
        var(--panel);

      box-shadow:
        0 26px 90px
        rgba(
          0,
          0,
          0,
          .25
        );

      animation:
        enter
        .55s
        .12s
        ease
        both;

    }

    .ranking-head {

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        12px;

      padding:
        13px 16px;

      border-bottom:
        1px solid
        var(--border);

      background:
        var(--panel-2);

    }

    .ranking-title {

      display:
        flex;

      align-items:
        center;

      gap:
        8px;

      margin:
        0;

      font-size:
        11px;

      font-weight:
        900;

    }

    .ranking-title span {

      color:
        var(--green);

    }

    .updated {

      color:
        var(--muted-2);

      font-size:
        8px;

    }

    .list {

      display:
        grid;

      gap:
        1px;

      background:
        rgba(
          67,
          255,
          152,
          .04
        );

    }

    .row {

      position:
        relative;

      display:
        grid;

      grid-template-columns:
        54px
        minmax(
          0,
          1fr
        )
        minmax(
          170px,
          .9fr
        )
        auto;

      align-items:
        center;

      gap:
        14px;

      min-height:
        78px;

      padding:
        12px 15px;

      background:
        #09100c;

      transition:
        background
        .2s
        ease,
        transform
        .2s
        ease;

    }

    .row:hover {

      background:
        #0c1610;

    }

    .row.active {

      background:
        linear-gradient(
          90deg,
          rgba(
            67,
            255,
            152,
            .035
          ),
          #09100c
        );

    }

    .position {

      width:
        38px;

      height:
        38px;

      display:
        grid;

      place-items:
        center;

      border:
        1px solid
        var(--border);

      border-radius:
        11px;

      background:
        #0b1710;

      color:
        #a1b9aa;

      font-size:
        11px;

      font-weight:
        950;

    }

    .position.top {

      color:
        var(--green);

      border-color:
        rgba(
          67,
          255,
          152,
          .24
        );

    }

    .member {

      min-width:
        0;

    }

    .member-name {

      overflow:
        hidden;

      text-overflow:
        ellipsis;

      white-space:
        nowrap;

      color:
        var(--text);

      font-size:
        12px;

      font-weight:
        850;

    }

    .member-id {

      margin-top:
        3px;

      overflow:
        hidden;

      text-overflow:
        ellipsis;

      white-space:
        nowrap;

      color:
        var(--muted-2);

      font:
        8px
        ui-monospace,
        monospace;

    }

    .bar-wrap {

      min-width:
        0;

    }

    .bar-top {

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        8px;

      margin-bottom:
        6px;

    }

    .bar-label {

      color:
        #61796b;

      font-size:
        8px;

    }

    .bar-percent {

      color:
        #87a08f;

      font:
        800 8px
        ui-monospace,
        monospace;

    }

    .bar {

      width:
        100%;

      height:
        6px;

      overflow:
        hidden;

      border-radius:
        999px;

      background:
        #111c15;

      border:
        1px solid
        rgba(
          67,
          255,
          152,
          .06
        );

    }

    .bar-fill {

      height:
        100%;

      min-width:
        2px;

      border-radius:
        inherit;

      background:
        linear-gradient(
          90deg,
          #1f9f60,
          #43ff98
        );

      box-shadow:
        0 0 13px
        rgba(
          67,
          255,
          152,
          .22
        );

      transition:
        width
        .45s
        cubic-bezier(
          .2,
          .8,
          .2,
          1
        );

    }

    .time {

      text-align:
        right;

      min-width:
        115px;

      color:
        var(--green-soft);

      font:
        900 12px/1.3
        ui-monospace,
        monospace;

      white-space:
        nowrap;

    }

    .live {

      display:
        inline-flex;

      align-items:
        center;

      justify-content:
        flex-end;

      gap:
        5px;

      margin-top:
        4px;

      color:
        #76a689;

      font:
        800 8px
        inherit;

    }

    .live .dot {

      width:
        6px;

      height:
        6px;

      border-radius:
        50%;

      background:
        var(--green);

      box-shadow:
        0 0 10px
        rgba(
          67,
          255,
          152,
          .8
        );

      animation:
        pulse
        1.5s
        ease-in-out
        infinite;

    }

    .empty,
    .error {

      padding:
        35px;

      text-align:
        center;

      color:
        var(--muted);

      font-size:
        11px;

      line-height:
        1.65;

    }

    .error {

      color:
        #cd8585;

    }

    /*
     * FOOTER
     */

    .footer {

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        10px;

      margin-top:
        9px;

      color:
        #4f6859;

      font-size:
        8px;

      flex-wrap:
        wrap;

    }

    .footer strong {

      color:
        #78a48a;

    }

    /*
     * RESPONSIVO
     */

    @media (
      max-width: 900px
    ) {

      .hero {

        grid-template-columns:
          1fr;

      }

      .podium {

        grid-template-columns:
          1fr;

      }

      .podium-card,
      .podium-card.first {

        min-height:
          170px;

      }

      .row {

        grid-template-columns:
          45px
          minmax(
            0,
            1fr
          )
          auto;

      }

      .bar-wrap {

        display:
          none;

      }

      .time {

        min-width:
          100px;

      }

    }

    @media (
      max-width: 620px
    ) {

      .page {

        width:
          calc(
            100% - 12px
          );

        padding-top:
          6px;

      }

      .header {

        position:
          relative;

        top:
          auto;

        align-items:
          flex-start;

        flex-direction:
          column;

      }

      .header-right {

        justify-content:
          flex-start;

      }

      .hero-main {

        padding:
          20px;

      }

      .hero-main h2 {

        font-size:
          36px;

      }

      .ranking-head {

        align-items:
          flex-start;

        flex-direction:
          column;

      }

      .row {

        grid-template-columns:
          38px
          minmax(
            0,
            1fr
          )
          auto;

        gap:
          9px;

        padding:
          10px;

      }

      .position {

        width:
          32px;

        height:
          32px;

      }

      .member-name {

        font-size:
          11px;

      }

      .time {

        min-width:
          auto;

        font-size:
          10px;

      }

      .footer {

        flex-direction:
          column;

        align-items:
          flex-start;

      }

    }

  </style>

</head>

<body>

  <main class="page">

    <!-- ==================================================
         HEADER
    ================================================== -->

    <header class="header">

      <div class="brand">

        <div class="logo">
          👻
        </div>

        <div>

          <p class="eyebrow">
            GHOST SYNDICATE
          </p>

          <h1>
            Ranking de Voz
          </h1>

        </div>

      </div>

      <div class="header-right">

        <div class="live-pill">

          <span class="live-dot"></span>

          Atualização em tempo real

        </div>

        <div
          id="refresh"
          class="refresh"
        >
          Atualizando...
        </div>

      </div>

    </header>

    <!-- ==================================================
         HERO
    ================================================== -->

    <section class="hero">

      <div class="hero-main">

        <p class="hero-kicker">
          Atividade da equipe
        </p>

        <h2>
          Quem mais está na voz?
        </h2>

        <p>
          Acompanhe o tempo acumulado em
          canais de voz. Sessões ativas entram
          no cálculo em tempo real e são
          consolidadas automaticamente quando
          o membro deixa a call.
        </p>

      </div>

      <aside class="hero-side">

        <div>

          <p class="side-label">
            Líder atual
          </p>

          <div
            id="leaderTime"
            class="leader-number"
          >
            —
          </div>

          <div
            id="leaderName"
            class="leader-name"
          >
            Carregando...
          </div>

        </div>

        <div
          id="memberCount"
          class="side-meta"
        >
          Carregando ranking...
        </div>

      </aside>

    </section>

    <!-- ==================================================
         PODIUM
    ================================================== -->

    <section
      id="podium"
      class="podium"
    >

      <article class="podium-card">
        <div class="empty">
          Carregando...
        </div>
      </article>

      <article class="podium-card first">
        <div class="empty">
          Carregando...
        </div>
      </article>

      <article class="podium-card">
        <div class="empty">
          Carregando...
        </div>
      </article>

    </section>

    <!-- ==================================================
         RANKING
    ================================================== -->

    <section class="ranking-panel">

      <header class="ranking-head">

        <h3 class="ranking-title">

          <span>
            🎙️
          </span>

          Ranking completo

        </h3>

        <span
          id="updated"
          class="updated"
        >
          Aguardando dados...
        </span>

      </header>

      <div
        id="list"
        class="list"
      >

        <div class="empty">

          Carregando ranking...

        </div>

      </div>

    </section>

    <footer class="footer">

      <span>

        Ghost Syndicate
        •
        <strong>Organização</strong>
        •
        <strong>Lealdade</strong>
        •
        <strong>Resultado</strong>

      </span>

      <span>
        Voice Tracker
      </span>

    </footer>

  </main>

  <script>

    let lastRanking = [];

    function escapeHtml(
      value,
    ) {

      return String(
        value ?? '',
      )
        .replaceAll(
          '&',
          '&amp;',
        )
        .replaceAll(
          '<',
          '&lt;',
        )
        .replaceAll(
          '>',
          '&gt;',
        )
        .replaceAll(
          '"',
          '&quot;',
        )
        .replaceAll(
          "'",
          '&#039;',
        );

    }

    function formatDuration(
      seconds,
    ) {

      const safe =
        Math.max(
          0,
          Math.floor(
            Number(
              seconds || 0,
            ),
          ),
        );

      const hours =
        Math.floor(
          safe / 3600,
        );

      const minutes =
        Math.floor(
          (safe % 3600) /
            60,
        );

      const secs =
        safe % 60;

      const parts = [];

      if (
        hours > 0
      ) {
        parts.push(
          hours + 'h',
        );
      }

      if (
        minutes > 0 ||
        hours > 0
      ) {
        parts.push(
          minutes + 'm',
        );
      }

      parts.push(
        secs + 's',
      );

      return parts.join(
        ' ',
      );

    }

    function formatClock(
      seconds,
    ) {

      const safe =
        Math.max(
          0,
          Math.floor(
            Number(
              seconds || 0,
            ),
          ),
        );

      const hours =
        Math.floor(
          safe / 3600,
        )
          .toString()
          .padStart(
            2,
            '0',
          );

      const minutes =
        Math.floor(
          (safe % 3600) /
            60,
        )
          .toString()
          .padStart(
            2,
            '0',
          );

      const secs =
        (
          safe % 60
        )
          .toString()
          .padStart(
            2,
            '0',
          );

      return (
        hours +
        ':' +
        minutes +
        ':' +
        secs
      );

    }

    function formatTimeAgo(
      iso,
    ) {

      if (
        !iso
      ) {
        return '';
      }

      const diff =
        Math.max(
          0,
          Date.now() -
          new Date(
            iso,
          ).getTime(),
        );

      const minutes =
        Math.floor(
          diff / 60000,
        );

      if (
        minutes <= 0
      ) {
        return 'agora';
      }

      if (
        minutes === 1
      ) {
        return 'há 1 min';
      }

      return (
        'há ' +
        minutes +
        ' min'
      );

    }

    function renderPodium(
      ranking,
    ) {

      const podium =
        document.getElementById(
          'podium',
        );

      if (
        ranking.length ===
        0
      ) {

        podium.innerHTML =
          [
            '<article class="podium-card">',
            '<div class="empty">',
            'Nenhum membro no ranking.',
            '</div>',
            '</article>',

            '<article class="podium-card first">',
            '<div class="empty">',
            'Aguardando registros.',
            '</div>',
            '</article>',

            '<article class="podium-card">',
            '<div class="empty">',
            'Nenhum membro no ranking.',
            '</div>',
            '</article>',
          ].join('');

        return;

      }

      const first =
        ranking[0];

      const second =
        ranking[1] ??
        null;

      const third =
        ranking[2] ??
        null;

      const cards = [
        {
          member:
            second,

          emoji:
            '🥈',

          className:
            '',
        },

        {
          member:
            first,

          emoji:
            '🥇',

          className:
            'first',
        },

        {
          member:
            third,

          emoji:
            '🥉',

          className:
            '',
        },
      ];

      podium.innerHTML =
        cards
          .map(
            (
              item,
            ) => {

              if (
                !item.member
              ) {

                return (
                  '<article class="podium-card ' +
                  item.className +
                  '">' +
                  '<div class="empty">' +
                  'Sem registro' +
                  '</div>' +
                  '</article>'
                );

              }

              const member =
                item.member;

              return (
                '<article class="podium-card ' +
                item.className +
                '">' +

                '<div class="podium-position">' +
                item.emoji +
                '</div>' +

                '<div class="podium-rank">' +
                'POSIÇÃO ' +
                member.position +
                '</div>' +

                '<div class="podium-name">' +
                escapeHtml(
                  member.name,
                ) +
                '</div>' +

                '<div class="podium-time">' +
                formatDuration(
                  member.seconds,
                ) +
                '</div>' +

                (
                  member.active
                    ? (
                      '<div class="podium-live">' +
                      '<span class="live-dot"></span>' +
                      ' AO VIVO NA CALL' +
                      '</div>'
                    )
                    : ''
                ) +

                '</article>'
              );

            },
          )
          .join('');

    }

    function renderRanking(
      ranking,
    ) {

      const list =
        document.getElementById(
          'list',
        );

      if (
        ranking.length ===
        0
      ) {

        list.innerHTML =
          [
            '<div class="empty">',
            'Ainda não existem registros de voz.',
            '</div>',
          ].join('');

        return;

      }

      const leaderSeconds =
        Math.max(
          1,
          Number(
            ranking[0]?.seconds ||
            0,
          ),
        );

      list.innerHTML =
        ranking
          .map(
            (
              member,
              index,
            ) => {

              const percent =
                Math.min(
                  100,
                  (
                    (
                      member.seconds /
                      leaderSeconds
                    ) *
                    100
                  ),
                );

              return (
                '<article class="row ' +
                (
                  member.active
                    ? 'active'
                    : ''
                ) +
                '">' +

                '<div class="position ' +
                (
                  index < 3
                    ? 'top'
                    : ''
                ) +
                '">' +
                (
                  index + 1
                ) +
                '</div>' +

                '<div class="member">' +

                '<div class="member-name">' +
                escapeHtml(
                  member.name,
                ) +
                '</div>' +

                '<div class="member-id">' +
                member.memberId +
                '</div>' +

                '</div>' +

                '<div class="bar-wrap">' +

                '<div class="bar-top">' +

                '<span class="bar-label">' +
                'TEMPO ACUMULADO' +
                '</span>' +

                '<span class="bar-percent">' +
                percent.toFixed(0) +
                '%' +
                '</span>' +

                '</div>' +

                '<div class="bar">' +

                '<div ' +
                'class="bar-fill" ' +
                'style="width:' +
                percent.toFixed(2) +
                '%">' +
                '</div>' +

                '</div>' +

                '</div>' +

                '<div class="time">' +

                formatDuration(
                  member.seconds,
                ) +

                (
                  member.active
                    ? (
                      '<div class="live">' +
                      '<span class="dot"></span>' +
                      ' AO VIVO' +
                      '</div>'
                    )
                    : ''
                ) +

                '</div>' +

                '</article>'
              );

            },
          )
          .join('');

    }

    function renderSummary(
      ranking,
    ) {

      const leader =
        ranking[0];

      const leaderName =
        document.getElementById(
          'leaderName',
        );

      const leaderTime =
        document.getElementById(
          'leaderTime',
        );

      const count =
        document.getElementById(
          'memberCount',
        );

      if (
        !leader
      ) {

        leaderName.textContent =
          'Ainda não há líder';

        leaderTime.textContent =
          '00:00:00';

        count.textContent =
          'Nenhum registro disponível.';

        return;

      }

      leaderName.textContent =
        leader.name;

      leaderTime.textContent =
        formatClock(
          leader.seconds,
        );

      const active =
        ranking.filter(
          (
            member,
          ) =>
            member.active,
        ).length;

      count.textContent =
        ranking.length +
        ' membros registrados • ' +
        active +
        ' em call agora';

    }

    function updateClockForActiveMembers() {

      if (
        lastRanking.length ===
        0
      ) {
        return;
      }

      /*
       * O backend já calcula o tempo atual.
       * Fazemos nova consulta a cada segundo
       * para manter a página realmente viva.
       */

    }

    async function loadRanking() {

      try {

        const response =
          await fetch(
            '/api/ranking/live',
            {
              cache:
                'no-store',
            },
          );

        if (
          !response.ok
        ) {
          throw new Error(
            'Falha na API.',
          );
        }

        const data =
          await response.json();

        const ranking =
          Array.isArray(
            data.ranking,
          )
            ? data.ranking
            : [];

        lastRanking =
          ranking;

        renderSummary(
          ranking,
        );

        renderPodium(
          ranking,
        );

        renderRanking(
          ranking,
        );

        const updated =
          document.getElementById(
            'updated',
          );

        updated.textContent =
          'Atualizado ' +
          formatTimeAgo(
            data.updatedAt,
          );

        const refresh =
          document.getElementById(
            'refresh',
          );

        refresh.textContent =
          '✓ Atualizado';

        setTimeout(
          () => {

            refresh.textContent =
              '↻ Monitorando';

          },
          900,
        );

      } catch (
        error
      ) {

        console.error(
          '[RANKING PAGE]',
          error,
        );

        document.getElementById(
          'list',
        ).innerHTML =
          [
            '<div class="error">',
            'Não foi possível atualizar o ranking.',
            '<br>',
            'Verifique se o servidor web está ativo.',
            '</div>',
          ].join('');

        document.getElementById(
          'refresh',
        ).textContent =
          '⚠ Erro';

      }

    }

    loadRanking();

    /*
     * Atualização rápida.
     *
     * 1 segundo deixa a experiência parecida
     * com um contador de presença ao vivo.
     */

    setInterval(
      loadRanking,
      1000,
    );

    setInterval(
      updateClockForActiveMembers,
      1000,
    );

  </script>

</body>

</html>
`;
}
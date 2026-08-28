// apps/web/src/server.ts

import 'dotenv/config';

import cors from 'cors';
import express, {
  type NextFunction,
  type Request,
  type Response,
} from 'express';
import helmet from 'helmet';
import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const app = express();
const db = new PrismaClient();

app.use(helmet());
app.use(cors());
app.use(express.json());

const guildId = process.env.DISCORD_GUILD_ID;

if (!guildId) {
  console.warn(
    '⚠️ DISCORD_GUILD_ID não foi definido no arquivo .env.',
  );
}

/* =========================================================
   HELPERS
========================================================= */

function getGuildId(): string {
  if (!guildId) {
    throw new Error(
      'DISCORD_GUILD_ID não configurado no .env.',
    );
  }

  return guildId;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(
    0,
    Math.floor(seconds),
  );

  const hours = Math.floor(
    safeSeconds / 3600,
  );

  const minutes = Math.floor(
    (safeSeconds % 3600) / 60,
  );

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }

  return `${minutes}min`;
}

function getParamString(
  value: string | string[] | undefined,
): string {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function escapeHtml(
  value: string,
): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

/* =========================================================
   VOICE
========================================================= */

async function getTopVoice(
  serverGuildId: string,
  limit = 10,
) {
  const sessions =
    await db.voiceSession.findMany({
      where: {
        guildId: serverGuildId,
        endedAt: {
          not: null,
        },
      },
      include: {
        member: true,
      },
    });

  const totals = new Map<
    string,
    {
      memberId: string;
      name: string;
      seconds: number;
    }
  >();

  for (const session of sessions) {
    const current =
      totals.get(
        session.memberId,
      ) ?? {
        memberId:
          session.memberId,

        name:
          session.member.displayName ||
          session.member.username ||
          session.memberId,

        seconds:
          0,
      };

    current.seconds += Math.max(
      0,
      session.seconds,
    );

    totals.set(
      session.memberId,
      current,
    );
  }

  return [...totals.values()]
    .sort(
      (a, b) =>
        b.seconds -
        a.seconds,
    )
    .slice(
      0,
      limit,
    );
}

async function getMemberVoiceSeconds(
  serverGuildId: string,
  userId: string,
): Promise<number> {
  const sessions =
    await db.voiceSession.findMany({
      where: {
        guildId: serverGuildId,
        memberId: userId,
        endedAt: {
          not: null,
        },
      },
      select: {
        seconds: true,
      },
    });

  return sessions.reduce(
    (
      total,
      session,
    ) =>
      total +
      Math.max(
        0,
        session.seconds,
      ),
    0,
  );
}

/* =========================================================
   HEALTH
========================================================= */

app.get(
  '/api/health',
  async (
    _req: Request,
    res: Response,
  ) => {
    try {
      await db.$queryRaw`SELECT 1`;

      res.json({
        status: 'online',
        database: 'online',
        service:
          'Ghost Syndicate Web',
        timestamp:
          new Date().toISOString(),
      });
    } catch (error) {
      console.error(
        '[WEB] Database health error:',
        error,
      );

      res.status(503).json({
        status: 'online',
        database: 'offline',
        service:
          'Ghost Syndicate Web',
        timestamp:
          new Date().toISOString(),
      });
    }
  },
);

/* =========================================================
   OVERVIEW
========================================================= */

app.get(
  '/api/overview',
  async (
    _req: Request,
    res: Response,
  ) => {
    try {
      const id =
        getGuildId();

      const guild =
        await db.guild.findUnique({
          where: {
            id,
          },
        });

      const topVoice =
        await getTopVoice(
          id,
          10,
        );

      res.json({
        guild,
        topVoice,
      });
    } catch (error) {
      console.error(
        '[WEB API] /api/overview:',
        error,
      );

      res.status(500).json({
        error:
          'Não foi possível carregar o painel.',
      });
    }
  },
);

/* =========================================================
   VOICE MEMBER
========================================================= */

app.get(
  '/api/voice/:userId',
  async (
    req: Request,
    res: Response,
  ) => {
    try {
      const id =
        getGuildId();

      const userId =
        getParamString(
          req.params.userId,
        );

      if (!userId) {
        res.status(400).json({
          error:
            'ID do usuário inválido.',
        });

        return;
      }

      const seconds =
        await getMemberVoiceSeconds(
          id,
          userId,
        );

      res.json({
        userId,
        seconds,
        duration:
          formatDuration(
            seconds,
          ),
      });
    } catch (error) {
      console.error(
        '[WEB API] /api/voice/:userId:',
        error,
      );

      res.status(500).json({
        error:
          'Não foi possível carregar as horas em call.',
      });
    }
  },
);

/* =========================================================
   VOICE RANKING
========================================================= */

app.get(
  '/api/ranking/voice',
  async (
    _req: Request,
    res: Response,
  ) => {
    try {
      const id =
        getGuildId();

      const ranking =
        await getTopVoice(
          id,
          25,
        );

      res.json({
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
            }),
          ),
      });
    } catch (error) {
      console.error(
        '[WEB API] /api/ranking/voice:',
        error,
      );

      res.status(500).json({
        error:
          'Não foi possível carregar o ranking.',
      });
    }
  },
);

/* =========================================================
   FINANCE
========================================================= */

app.get(
  '/api/finance',
  async (
    _req: Request,
    res: Response,
  ) => {
    try {
      const id =
        getGuildId();

      const guild =
        await db.guild.findUnique({
          where: {
            id,
          },
        });

      if (!guild) {
        res.status(404).json({
          error:
            'Servidor não encontrado no banco de dados.',
        });

        return;
      }

      const movements =
        await db.cashMovement.findMany({
          where: {
            guildId: id,
          },

          orderBy: {
            createdAt:
              'desc',
          },

          take: 25,

          include: {
            member: true,
          },
        });

      res.json({
        balance:
          guild.cashBalance,

        balanceFormatted:
          formatMoney(
            guild.cashBalance,
          ),

        dailyGoal:
          guild.dailyGoal,

        reserve:
          guild.reserve,

        movements:
          movements.map(
            (
              movement,
            ) => ({
              id:
                movement.id,

              type:
                movement.type,

              amount:
                movement.amount,

              amountFormatted:
                formatMoney(
                  movement.amount,
                ),

              reason:
                movement.reason,

              responsible:
                movement.responsible,

              member:
                movement.member
                  ?.displayName ??
                null,

              createdAt:
                movement.createdAt,
            }),
          ),
      });
    } catch (error) {
      console.error(
        '[WEB API] /api/finance:',
        error,
      );

      res.status(500).json({
        error:
          'Não foi possível carregar os dados financeiros.',
      });
    }
  },
);

/* =========================================================
   OPERATIONS
========================================================= */

app.get(
  '/api/operations',
  async (
    _req: Request,
    res: Response,
  ) => {
    try {
      const id =
        getGuildId();

      const operations =
        await db.operation.findMany({
          where: {
            guildId:
              id,
          },

          orderBy: {
            createdAt:
              'desc',
          },

          take: 50,
        });

      res.json({
        operations,
      });
    } catch (error) {
      console.error(
        '[WEB API] /api/operations:',
        error,
      );

      res.status(500).json({
        error:
          'Não foi possível carregar as operações.',
      });
    }
  },
);

/* =========================================================
   MISSIONS
========================================================= */

app.get(
  '/api/missions',
  async (
    _req: Request,
    res: Response,
  ) => {
    try {
      const id =
        getGuildId();

      const missions =
        await db.mission.findMany({
          where: {
            guildId:
              id,
          },

          orderBy: {
            createdAt:
              'desc',
          },
        });

      res.json({
        missions,
      });
    } catch (error) {
      console.error(
        '[WEB API] /api/missions:',
        error,
      );

      res.status(500).json({
        error:
          'Não foi possível carregar as missões.',
      });
    }
  },
);

/* =========================================================
   TRANSCRIPTS
========================================================= */

function getTranscriptFilePath(
  transcriptId: string,
): string | null {
  /*
   * Aceita somente IDs numéricos do Discord.
   * Isso também evita path traversal.
   */

  if (
    !/^\d{15,25}$/.test(
      transcriptId,
    )
  ) {
    return null;
  }

  return path.join(
    process.cwd(),
    'storage',
    'transcripts',
    `transcript-${transcriptId}.html`,
  );
}

/* ---------------------------------------------------------
   Página principal
--------------------------------------------------------- */

app.get(
  '/transcripts/:id',
  async (
    req: Request,
    res: Response,
  ) => {
    const transcriptId =
      getParamString(
        req.params.id,
      ).trim();

    const filePath =
      getTranscriptFilePath(
        transcriptId,
      );

    if (!filePath) {
      res
        .status(400)
        .type('html')
        .send(
          createTranscriptErrorPage(
            'Transcript inválido',
            'O identificador informado não é válido.',
          ),
        );

      return;
    }

    try {
      await readFile(
        filePath,
        'utf8',
      );

      res
        .type('html')
        .send(
          createTranscriptPage(
            transcriptId,
          ),
        );
    } catch (error) {
      const code =
        error &&
        typeof error ===
          'object' &&
        'code' in error
          ? String(
              (
                error as {
                  code?: unknown;
                }
              ).code ?? '',
            )
          : '';

      if (
        code === 'ENOENT'
      ) {
        res
          .status(404)
          .type('html')
          .send(
            createTranscriptErrorPage(
              'Transcript não encontrado',
              'Esse histórico ainda não foi arquivado ou não está mais disponível.',
            ),
          );

        return;
      }

      console.error(
        '[WEB] /transcripts/:id:',
        error,
      );

      res
        .status(500)
        .type('html')
        .send(
          createTranscriptErrorPage(
            'Erro ao carregar transcript',
            'O servidor não conseguiu abrir esse histórico.',
          ),
        );
    }
  },
);

/* ---------------------------------------------------------
   Transcript original
--------------------------------------------------------- */

app.get(
  '/transcripts/raw/:id',
  async (
    req: Request,
    res: Response,
  ) => {
    const transcriptId =
      getParamString(
        req.params.id,
      ).trim();

    const filePath =
      getTranscriptFilePath(
        transcriptId,
      );

    if (!filePath) {
      res
        .status(400)
        .type('text')
        .send(
          'Transcript inválido.',
        );

      return;
    }

    try {
      const html =
        await readFile(
          filePath,
          'utf8',
        );

      res
        .type('html')
        .set(
          'Cache-Control',
          'private, no-store, max-age=0',
        )
        .send(
          html,
        );
    } catch (error) {
      console.error(
        '[WEB] /transcripts/raw/:id:',
        error,
      );

      res
        .status(404)
        .type('text')
        .send(
          'Transcript não encontrado.',
        );
    }
  },
);

/* =========================================================
   TRANSCRIPT PAGE
========================================================= */

function createTranscriptPage(
  transcriptId: string,
): string {
  const safeId =
    escapeHtml(
      transcriptId,
    );

  const rawUrl =
    `/transcripts/raw/${safeId}`;

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
    content="#04100a"
  >

  <meta
    name="color-scheme"
    content="dark"
  >

  <title>
    Transcript #${safeId}
    • Ghost Syndicate
  </title>

  <style>

    :root {
      color-scheme: dark;

      --bg:
        #020604;

      --bg-2:
        #06100a;

      --panel:
        rgba(7, 20, 12, .90);

      --line:
        rgba(67, 255, 152, .16);

      --line-strong:
        rgba(67, 255, 152, .32);

      --green:
        #43ff98;

      --green-2:
        #21d978;

      --green-soft:
        #a4ffc9;

      --text:
        #ebfff3;

      --muted:
        #7ba28c;
    }

    * {
      box-sizing:
        border-box;
    }

    html,
    body {
      width:
        100%;

      min-height:
        100%;

      margin:
        0;
    }

    body {
      min-height:
        100vh;

      overflow-x:
        hidden;

      color:
        var(--text);

      background:
        radial-gradient(
          circle at 12% 0%,
          rgba(
            67,
            255,
            152,
            .13
          ),
          transparent 30%
        ),
        radial-gradient(
          circle at 100% 25%,
          rgba(
            33,
            217,
            120,
            .08
          ),
          transparent 29%
        ),
        linear-gradient(
          180deg,
          #010403 0%,
          #041008 45%,
          #020604 100%
        );

      font-family:
        Inter,
        ui-sans-serif,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
    }

    body::before {
      content:
        "";

      position:
        fixed;

      inset:
        0;

      pointer-events:
        none;

      z-index:
        50;

      opacity:
        .045;

      background:
        repeating-linear-gradient(
          180deg,
          rgba(
            255,
            255,
            255,
            .8
          ) 0px,
          rgba(
            255,
            255,
            255,
            .8
          ) 1px,
          transparent 1px,
          transparent 4px
        );
    }

    body::after {
      content:
        "";

      position:
        fixed;

      inset:
        0;

      pointer-events:
        none;

      z-index:
        49;

      background:
        linear-gradient(
          90deg,
          transparent 0%,
          rgba(
            67,
            255,
            152,
            .025
          ) 50%,
          transparent 100%
        );

      transform:
        translateX(-100%);

      animation:
        sweep 8s linear infinite;
    }

    @keyframes sweep {
      to {
        transform:
          translateX(100%);
      }
    }

    .page {
      width:
        min(
          1500px,
          calc(100% - 28px)
        );

      margin:
        0 auto;

      padding:
        18px 0 30px;
    }

    .topbar {
      position:
        sticky;

      top:
        10px;

      z-index:
        40;

      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        15px;

      padding:
        12px 14px;

      margin-bottom:
        16px;

      border:
        1px solid
        var(--line);

      border-radius:
        18px;

      background:
        rgba(
          3,
          12,
          7,
          .84
        );

      backdrop-filter:
        blur(18px);

      box-shadow:
        0 20px 70px
        rgba(
          0,
          0,
          0,
          .30
        );
    }

    .brand {
      display:
        flex;

      align-items:
        center;

      gap:
        11px;

      min-width:
        0;
    }

    .logo {
      width:
        42px;

      height:
        42px;

      display:
        grid;

      place-items:
        center;

      flex:
        0 0 auto;

      border:
        1px solid
        var(--line-strong);

      border-radius:
        13px;

      background:
        radial-gradient(
          circle at 35% 25%,
          rgba(
            67,
            255,
            152,
            .16
          ),
          transparent 48%
        ),
        linear-gradient(
          145deg,
          #0b2516,
          #06120b
        );

      color:
        var(--green);

      box-shadow:
        0 0 28px
        rgba(
          67,
          255,
          152,
          .08
        );
    }

    .eyebrow {
      margin:
        0 0 2px;

      color:
        var(--green);

      font-size:
        10px;

      font-weight:
        900;

      letter-spacing:
        .17em;

      text-transform:
        uppercase;

      text-shadow:
        0 0 15px
        rgba(
          67,
          255,
          152,
          .28
        );
    }

    .brand-title {
      margin:
        0;

      font-size:
        14px;

      font-weight:
        850;
    }

    .right {
      display:
        flex;

      gap:
        8px;

      align-items:
        center;

      flex-wrap:
        wrap;

      justify-content:
        flex-end;
    }

    .pill {
      display:
        inline-flex;

      align-items:
        center;

      gap:
        7px;

      min-height:
        34px;

      padding:
        7px 11px;

      border:
        1px solid
        var(--line);

      border-radius:
        999px;

      background:
        rgba(
          6,
          20,
          11,
          .72
        );

      color:
        var(--muted);

      font-size:
        10px;

      font-weight:
        800;
    }

    .dot {
      width:
        7px;

      height:
        7px;

      border-radius:
        50%;

      background:
        var(--green);

      box-shadow:
        0 0 16px
        rgba(
          67,
          255,
          152,
          .9
        );
    }

    .button {
      appearance:
        none;

      display:
        inline-flex;

      align-items:
        center;

      justify-content:
        center;

      min-height:
        34px;

      padding:
        8px 11px;

      border:
        1px solid
        var(--line-strong);

      border-radius:
        10px;

      color:
        var(--green-soft);

      background:
        linear-gradient(
          180deg,
          rgba(
            14,
            38,
            23,
            .96
          ),
          rgba(
            5,
            17,
            10,
            .96
          )
        );

      font:
        800 10px/1
        inherit;

      text-decoration:
        none;

      cursor:
        pointer;

      transition:
        transform .18s ease,
        border-color .18s ease,
        box-shadow .18s ease;
    }

    .button:hover {
      transform:
        translateY(-1px);

      border-color:
        rgba(
          67,
          255,
          152,
          .52
        );

      box-shadow:
        0 0 24px
        rgba(
          67,
          255,
          152,
          .10
        );
    }

    .hero {
      display:
        grid;

      grid-template-columns:
        minmax(0, 1fr)
        minmax(220px, 280px);

      gap:
        14px;

      margin-bottom:
        12px;
    }

    .hero-main,
    .hero-id {
      border:
        1px solid
        var(--line);

      border-radius:
        19px;

      background:
        linear-gradient(
          180deg,
          rgba(
            7,
            22,
            13,
            .95
          ),
          rgba(
            4,
            12,
            8,
            .96
          )
        );

      box-shadow:
        0 28px 90px
        rgba(
          0,
          0,
          0,
          .22
        );
    }

    .hero-main {
      padding:
        24px;
    }

    .hero-id {
      display:
        flex;

      flex-direction:
        column;

      justify-content:
        space-between;

      padding:
        18px;
    }

    .kicker {
      margin:
        0 0 8px;

      color:
        var(--green);

      font-size:
        10px;

      font-weight:
        900;

      letter-spacing:
        .16em;

      text-transform:
        uppercase;
    }

    h1 {
      margin:
        0;

      font-size:
        clamp(
          30px,
          4vw,
          54px
        );

      line-height:
        .98;

      letter-spacing:
        -.055em;
    }

    .lead {
      max-width:
        720px;

      margin:
        13px 0 0;

      color:
        var(--muted);

      font-size:
        13px;

      line-height:
        1.65;
    }

    .id-label {
      margin:
        0 0 8px;

      color:
        #5f8a70;

      font-size:
        9px;

      font-weight:
        900;

      letter-spacing:
        .15em;

      text-transform:
        uppercase;
    }

    .id {
      margin:
        0;

      color:
        var(--green-soft);

      font:
        800 12px/1.45
        ui-monospace,
        SFMono-Regular,
        Menlo,
        Consolas,
        monospace;

      overflow-wrap:
        anywhere;
    }

    .status {
      margin-top:
        16px;

      padding:
        11px 12px;

      border:
        1px solid
        var(--line);

      border-radius:
        13px;

      background:
        rgba(
          67,
          255,
          152,
          .025
        );

      color:
        #89b59a;

      font-size:
        10px;

      line-height:
        1.55;
    }

    .stats {
      display:
        grid;

      grid-template-columns:
        repeat(
          3,
          minmax(0, 1fr)
        );

      gap:
        10px;

      margin-bottom:
        12px;
    }

    .stat {
      padding:
        13px 14px;

      border:
        1px solid
        var(--line);

      border-radius:
        15px;

      background:
        rgba(
          5,
          17,
          10,
          .76
        );
    }

    .stat-label {
      margin:
        0 0 4px;

      color:
        #628a71;

      font-size:
        9px;

      font-weight:
        900;

      letter-spacing:
        .12em;

      text-transform:
        uppercase;
    }

    .stat-value {
      margin:
        0;

      font-size:
        13px;

      font-weight:
        850;
    }

    .viewer {
      overflow:
        hidden;

      border:
        1px solid
        var(--line-strong);

      border-radius:
        21px;

      background:
        rgba(
          2,
          9,
          5,
          .72
        );

      box-shadow:
        0 35px 120px
        rgba(
          0,
          0,
          0,
          .26
        );
    }

    .viewer-head {
      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        12px;

      padding:
        11px 13px;

      border-bottom:
        1px solid
        var(--line);

      background:
        linear-gradient(
          180deg,
          rgba(
            10,
            31,
            18,
            .92
          ),
          rgba(
            5,
            17,
            10,
            .88
          )
        );
    }

    .viewer-name {
      display:
        flex;

      align-items:
        center;

      gap:
        8px;

      color:
        var(--green-soft);

      font-size:
        11px;

      font-weight:
        900;
    }

    .viewer-actions {
      display:
        flex;

      gap:
        7px;

      flex-wrap:
        wrap;

      justify-content:
        flex-end;
    }

    iframe {
      display:
        block;

      width:
        100%;

      height:
        74vh;

      min-height:
        620px;

      border:
        0;

      background:
        #202225;
    }

    .footer {
      display:
        flex;

      justify-content:
        space-between;

      gap:
        12px;

      margin-top:
        12px;

      color:
        #4e715c;

      font-size:
        10px;

      flex-wrap:
        wrap;
    }

    .footer strong {
      color:
        #78ae8b;
    }

    @media (max-width: 850px) {
      .hero {
        grid-template-columns:
          1fr;
      }

      .stats {
        grid-template-columns:
          1fr;
      }

      iframe {
        height:
          76vh;

        min-height:
          520px;
      }
    }

    @media (max-width: 650px) {
      .page {
        width:
          calc(
            100% - 14px
          );

        padding-top:
          7px;
      }

      .topbar {
        top:
          6px;

        align-items:
          flex-start;

        flex-direction:
          column;
      }

      .right {
        justify-content:
          flex-start;
      }

      .hero-main {
        padding:
          19px;
      }

      .viewer-head {
        align-items:
          flex-start;

        flex-direction:
          column;
      }

      .viewer-actions {
        justify-content:
          flex-start;
      }
    }

  </style>
</head>

<body>

  <main class="page">

    <header class="topbar">

      <div class="brand">

        <div class="logo">
          👻
        </div>

        <div>
          <p class="eyebrow">
            GHOST SYNDICATE
          </p>

          <p class="brand-title">
            Central de Transcripts
          </p>
        </div>

      </div>

      <div class="right">

        <div class="pill">
          <span class="dot"></span>
          Histórico arquivado
        </div>

        <button
          id="copy"
          class="button"
          type="button"
        >
          ⧉ Copiar ID
        </button>

      </div>

    </header>

    <section class="hero">

      <div class="hero-main">

        <p class="kicker">
          Transcript oficial
        </p>

        <h1>
          Registro do atendimento.
        </h1>

        <p class="lead">
          Histórico preservado de uma conversa
          realizada pela Central de Atendimento
          da Ghost Syndicate.
        </p>

      </div>

      <aside class="hero-id">

        <div>
          <p class="id-label">
            Identificador do transcript
          </p>

          <p class="id">
            #${safeId}
          </p>
        </div>

        <div class="status">
          <strong>
            🟢 ARQUIVADO
          </strong>

          <br>

          Histórico disponível para consulta.
        </div>

      </aside>

    </section>

    <section class="stats">

      <article class="stat">

        <p class="stat-label">
          Sistema
        </p>

        <p class="stat-value">
          👻 Ghost Syndicate
        </p>

      </article>

      <article class="stat">

        <p class="stat-label">
          Origem
        </p>

        <p class="stat-value">
          🎫 Central de Atendimento
        </p>

      </article>

      <article class="stat">

        <p class="stat-label">
          Estado
        </p>

        <p class="stat-value">
          ✅ Histórico arquivado
        </p>

      </article>

    </section>

    <section
      id="viewer"
      class="viewer"
    >

      <header class="viewer-head">

        <div class="viewer-name">
          <span>📜</span>
          Transcript
        </div>

        <div class="viewer-actions">

          <a
            class="button"
            href="${rawUrl}"
            target="_blank"
            rel="noopener noreferrer"
          >
            ↗ Abrir original
          </a>

          <button
            id="fullscreen"
            class="button"
            type="button"
          >
            ⛶ Tela cheia
          </button>

        </div>

      </header>

      <iframe
        id="frame"
        src="${rawUrl}"
        title="Transcript do atendimento"
        loading="eager"
        referrerpolicy="no-referrer"
      ></iframe>

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
        Transcript oficial
      </span>

    </footer>

  </main>

  <script>

    const transcriptId =
      ${JSON.stringify(
        transcriptId,
      )};

    const copyButton =
      document.getElementById(
        'copy',
      );

    const fullscreenButton =
      document.getElementById(
        'fullscreen',
      );

    const viewer =
      document.getElementById(
        'viewer',
      );

    copyButton.addEventListener(
      'click',
      async () => {
        try {
          await navigator.clipboard.writeText(
            transcriptId,
          );

          const oldText =
            copyButton.textContent;

          copyButton.textContent =
            '✓ ID copiado';

          setTimeout(
            () => {
              copyButton.textContent =
                oldText;
            },
            1800,
          );
        } catch {
          copyButton.textContent =
            '✕ Não foi possível copiar';

          setTimeout(
            () => {
              copyButton.textContent =
                '⧉ Copiar ID';
            },
            1800,
          );
        }
      },
    );

    fullscreenButton.addEventListener(
      'click',
      async () => {
        try {
          if (
            document.fullscreenElement
          ) {
            await document.exitFullscreen();

            return;
          }

          await viewer.requestFullscreen();
        } catch {
          fullscreenButton.textContent =
            '✕ Indisponível';

          setTimeout(
            () => {
              fullscreenButton.textContent =
                '⛶ Tela cheia';
            },
            1800,
          );
        }
      },
    );

  </script>

</body>
</html>
`;
}

/* =========================================================
   TRANSCRIPT ERROR PAGE
========================================================= */

function createTranscriptErrorPage(
  title: string,
  message: string,
): string {
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
    content="#04100a"
  >

  <title>
    ${escapeHtml(title)}
    • Ghost Syndicate
  </title>

  <style>

    :root {
      color-scheme:
        dark;
    }

    * {
      box-sizing:
        border-box;
    }

    body {
      margin:
        0;

      min-height:
        100vh;

      display:
        grid;

      place-items:
        center;

      padding:
        20px;

      color:
        #eafff2;

      background:
        radial-gradient(
          circle at 50% 0%,
          rgba(
            67,
            255,
            152,
            .10
          ),
          transparent 38%
        ),
        #020604;

      font-family:
        Inter,
        system-ui,
        sans-serif;
    }

    .card {
      width:
        min(
          620px,
          100%
        );

      padding:
        34px;

      border:
        1px solid
        rgba(
          67,
          255,
          152,
          .18
        );

      border-radius:
        23px;

      background:
        linear-gradient(
          180deg,
          rgba(
            7,
            23,
            14,
            .97
          ),
          rgba(
            3,
            11,
            7,
            .97
          )
        );

      box-shadow:
        0 30px 110px
        rgba(
          0,
          0,
          0,
          .35
        );
    }

    .logo {
      width:
        54px;

      height:
        54px;

      display:
        grid;

      place-items:
        center;

      margin-bottom:
        20px;

      border:
        1px solid
        rgba(
          67,
          255,
          152,
          .22
        );

      border-radius:
        16px;

      background:
        rgba(
          67,
          255,
          152,
          .05
        );

      font-size:
        25px;
    }

    .eyebrow {
      margin:
        0 0 7px;

      color:
        #43ff98;

      font-size:
        10px;

      font-weight:
        900;

      letter-spacing:
        .17em;

      text-transform:
        uppercase;
    }

    h1 {
      margin:
        0;

      font-size:
        30px;

      letter-spacing:
        -.045em;
    }

    p {
      color:
        #7da38c;

      line-height:
        1.7;
    }

    .info {
      margin-top:
        20px;

      padding:
        13px;

      border:
        1px solid
        rgba(
          67,
          255,
          152,
          .14
        );

      border-radius:
        13px;

      background:
        rgba(
          67,
          255,
          152,
          .025
        );

      color:
        #93bda0;
    }

  </style>

</head>

<body>

  <main class="card">

    <div class="logo">
      👻
    </div>

    <p class="eyebrow">
      Ghost Syndicate
    </p>

    <h1>
      ${escapeHtml(title)}
    </h1>

    <p>
      ${escapeHtml(message)}
    </p>

    <div class="info">
      📜 Central de Transcripts
    </div>

  </main>

</body>
</html>
`;
}

/* =========================================================
   DASHBOARD
========================================================= */

app.get(
  '/',
  (
    _req: Request,
    res: Response,
  ) => {
    res.type('html').send(`
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
    content="#06130d"
  >

  <meta
    name="color-scheme"
    content="dark"
  >

  <title>
    Ghost Syndicate
  </title>

  <style>

    :root {
      color-scheme:
        dark;
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
    }

    body {
      min-height:
        100vh;

      background:
        radial-gradient(
          circle at 15% 0%,
          rgba(
            53,
            211,
            154,
            .12
          ),
          transparent 30%
        ),
        radial-gradient(
          circle at 90% 20%,
          rgba(
            31,
            180,
            108,
            .06
          ),
          transparent 28%
        ),
        #050a07;

      color:
        #f5fff8;

      font-family:
        Inter,
        ui-sans-serif,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        "Segoe UI",
        sans-serif;
    }

    body::before {
      content:
        "";

      position:
        fixed;

      inset:
        0;

      pointer-events:
        none;

      background:
        linear-gradient(
          125deg,
          transparent 30%,
          rgba(
            53,
            211,
            154,
            .025
          ) 50%,
          transparent 70%
        );
    }

    main {
      width:
        min(
          1180px,
          calc(100% - 40px)
        );

      margin:
        0 auto;

      padding:
        42px 0 70px;
    }

    .topbar {
      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        20px;

      margin-bottom:
        42px;
    }

    .brand {
      display:
        flex;

      align-items:
        center;

      gap:
        14px;
    }

    .logo {
      width:
        54px;

      height:
        54px;

      display:
        grid;

      place-items:
        center;

      border-radius:
        17px;

      border:
        1px solid
        rgba(
          53,
          211,
          154,
          .22
        );

      background:
        linear-gradient(
          135deg,
          #123c28,
          #092117
        );

      box-shadow:
        0 18px 50px
        rgba(
          53,
          211,
          154,
          .16
        );

      font-size:
        25px;
    }

    .eyebrow {
      margin:
        0 0 5px;

      color:
        #73a98b;

      font-size:
        11px;

      font-weight:
        800;

      letter-spacing:
        .17em;

      text-transform:
        uppercase;
    }

    .brand h1 {
      margin:
        0;

      font-size:
        23px;

      letter-spacing:
        -.035em;
    }

    .status {
      display:
        flex;

      align-items:
        center;

      gap:
        8px;

      padding:
        9px 14px;

      border:
        1px solid
        #1d3528;

      border-radius:
        999px;

      background:
        rgba(
          6,
          17,
          11,
          .72
        );

      color:
        #829d8c;

      font-size:
        12px;
    }

    .status-dot {
      width:
        8px;

      height:
        8px;

      border-radius:
        50%;

      background:
        #35d39a;

      box-shadow:
        0 0 16px
        rgba(
          53,
          211,
          154,
          .7
        );
    }

    .hero {
      margin-bottom:
        26px;
    }

    .hero h2 {
      max-width:
        760px;

      margin:
        0;

      font-size:
        clamp(
          36px,
          5vw,
          58px
        );

      line-height:
        .98;

      letter-spacing:
        -.06em;
    }

    .hero p {
      max-width:
        680px;

      margin:
        17px 0 0;

      color:
        #7c9585;

      font-size:
        16px;

      line-height:
        1.65;
    }

    .grid {
      display:
        grid;

      grid-template-columns:
        repeat(
          3,
          minmax(0, 1fr)
        );

      gap:
        15px;
    }

    .card {
      border:
        1px solid
        #1b3025;

      border-radius:
        22px;

      padding:
        23px;

      background:
        linear-gradient(
          180deg,
          rgba(
            10,
            24,
            16,
            .94
          ),
          rgba(
            5,
            13,
            9,
            .98
          )
        );

      box-shadow:
        0 24px 80px
        rgba(
          0,
          0,
          0,
          .20
        );

      backdrop-filter:
        blur(16px);
    }

    .card-head {
      display:
        flex;

      align-items:
        center;

      justify-content:
        space-between;

      gap:
        12px;

      margin-bottom:
        18px;
    }

    .label {
      margin:
        0;

      color:
        #73917f;

      font-size:
        11px;

      font-weight:
        800;

      letter-spacing:
        .13em;

      text-transform:
        uppercase;
    }

    .icon {
      font-size:
        21px;
    }

    .value {
      font-size:
        29px;

      font-weight:
        850;

      letter-spacing:
        -.045em;
    }

    .section {
      margin-top:
        16px;
    }

    .section-title {
      margin:
        0 0 15px;

      font-size:
        19px;

      letter-spacing:
        -.025em;
    }

    .ranking {
      display:
        grid;

      gap:
        9px;
    }

    .rank-row {
      display:
        grid;

      grid-template-columns:
        42px 1fr auto;

      align-items:
        center;

      gap:
        13px;

      min-height:
        60px;

      padding:
        12px 14px;

      border:
        1px solid
        #173024;

      border-radius:
        16px;

      background:
        rgba(
          255,
          255,
          255,
          .015
        );
    }

    .rank-position {
      width:
        32px;

      height:
        32px;

      display:
        grid;

      place-items:
        center;

      border-radius:
        10px;

      background:
        #0c1b13;

      color:
        #a4cbb2;

      font-size:
        12px;

      font-weight:
        850;
    }

    .rank-name {
      font-weight:
        750;
    }

    .rank-subtitle {
      margin-top:
        3px;

      color:
        #5f7d6b;

      font-size:
        12px;
    }

    .rank-time {
      color:
        #a1bbaa;

      font-size:
        13px;

      font-weight:
        700;

      white-space:
        nowrap;
    }

    .empty {
      color:
        #607a69;

      line-height:
        1.6;
    }

    .error {
      padding:
        17px;

      border:
        1px solid
        #422730;

      border-radius:
        15px;

      background:
        rgba(
          241,
          91,
          107,
          .07
        );

      color:
        #e9a3ad;

      line-height:
        1.5;
    }

    .footer {
      margin-top:
        34px;

      text-align:
        center;

      color:
        #506b5b;

      font-size:
        11px;
    }

    @media (max-width: 850px) {

      main {
        width:
          min(
            calc(100% - 24px),
            700px
          );

        padding-top:
          28px;
      }

      .topbar {
        align-items:
          flex-start;

        flex-direction:
          column;
      }

      .grid {
        grid-template-columns:
          1fr;
      }

      .hero h2 {
        font-size:
          42px;
      }

    }

  </style>

</head>

<body>

  <main>

    <header class="topbar">

      <div class="brand">

        <div class="logo">
          👻
        </div>

        <div>

          <p class="eyebrow">
            Ghost Syndicate
          </p>

          <h1>
            Painel Operacional
          </h1>

        </div>

      </div>

      <div class="status">

        <span
          class="status-dot"
        ></span>

        Sistema online

      </div>

    </header>

    <section class="hero">

      <h2>
        Controle da operação.
      </h2>

      <p>
        Caixa, metas, atividade
        e horas em call em um único
        painel da Ghost Syndicate.
      </p>

    </section>

    <section
      id="dashboard"
      class="grid"
    >

      <article class="card">

        <div class="card-head">

          <p class="label">
            Saldo atual
          </p>

          <span class="icon">
            🏦
          </span>

        </div>

        <div
          id="cash"
          class="value"
        >
          —
        </div>

      </article>

      <article class="card">

        <div class="card-head">

          <p class="label">
            Meta diária
          </p>

          <span class="icon">
            🎯
          </span>

        </div>

        <div
          id="goal"
          class="value"
        >
          —
        </div>

      </article>

      <article class="card">

        <div class="card-head">

          <p class="label">
            Reserva
          </p>

          <span class="icon">
            🛡️
          </span>

        </div>

        <div
          id="reserve"
          class="value"
        >
          —
        </div>

      </article>

    </section>

    <section
      class="card section"
    >

      <div class="card-head">

        <p class="label">
          Atividade
        </p>

        <span class="icon">
          🎙️
        </span>

      </div>

      <h3 class="section-title">
        Ranking de horas em call
      </h3>

      <div
        id="ranking"
        class="ranking"
      >

        <div class="empty">
          Carregando ranking...
        </div>

      </div>

    </section>

    <footer class="footer">
      Ghost Syndicate
      • Organização
      • Lealdade
      • Resultado
    </footer>

  </main>

  <script>

    const money = (
      value,
    ) =>
      Number(value || 0)
        .toLocaleString(
          'pt-BR',
          {
            style:
              'currency',

            currency:
              'BRL',

            maximumFractionDigits:
              0,
          },
        );

    const escapeHtml = (
      value,
    ) =>
      String(
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

    const formatDuration = (
      seconds,
    ) => {
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

      return (
        hours > 0
          ? hours +
            'h ' +
            minutes +
            'min'
          : minutes +
            'min'
      );
    };

    async function loadDashboard() {
      const rankingElement =
        document.getElementById(
          'ranking',
        );

      try {

        const response =
          await fetch(
            '/api/overview',
          );

        if (!response.ok) {
          throw new Error(
            'Falha na API',
          );
        }

        const data =
          await response.json();

        const guild =
          data.guild;

        document.getElementById(
          'cash',
        ).textContent =
          money(
            guild?.cashBalance,
          );

        document.getElementById(
          'goal',
        ).textContent =
          guild?.dailyGoal > 0
            ? money(
                guild.dailyGoal,
              )
            : 'Não definida';

        document.getElementById(
          'reserve',
        ).textContent =
          guild?.reserve > 0
            ? money(
                guild.reserve,
              )
            : 'Não definida';

        const ranking =
          Array.isArray(
            data.topVoice,
          )
            ? data.topVoice
            : [];

        if (
          ranking.length ===
          0
        ) {

          rankingElement.innerHTML =
            '<div class="empty">' +
            'Nenhum registro de voz ainda.' +
            '</div>';

          return;
        }

        rankingElement.innerHTML =
          ranking
            .map(
              (
                member,
                index,
              ) =>
                '<div class="rank-row">' +

                  '<div class="rank-position">' +
                    (index + 1) +
                  '</div>' +

                  '<div>' +

                    '<div class="rank-name">' +
                      escapeHtml(
                        member.name,
                      ) +
                    '</div>' +

                    '<div class="rank-subtitle">' +
                      'Participação em voz' +
                    '</div>' +

                  '</div>' +

                  '<div class="rank-time">' +
                    formatDuration(
                      member.seconds,
                    ) +
                  '</div>' +

                '</div>',
            )
            .join('');

      } catch (error) {

        console.error(
          '[DASHBOARD]',
          error,
        );

        rankingElement.innerHTML =
          '<div class="error">' +
          'Não foi possível carregar os dados do painel.' +
          '</div>';

      }
    }

    loadDashboard();

    setInterval(
      loadDashboard,
      30000,
    );

  </script>

</body>

</html>
    `);
  },
);

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    console.error(
      '[WEB ERROR]',
      error,
    );

    if (res.headersSent) {
      return;
    }

    res.status(500).json({
      error:
        'Erro interno do servidor.',
    });
  },
);

/* =========================================================
   START SERVER
========================================================= */

const port =
  Number(
    process.env.WEB_PORT ||
      3010,
  );

const server =
  app.listen(
    port,
    () => {
      console.log('');
      console.log(
        '👻 Ghost Syndicate Web',
      );
      console.log(
        `🌐 http://localhost:${port}`,
      );
      console.log('');
    },
  );

/* =========================================================
   SHUTDOWN
========================================================= */

async function shutdown(
  signal: string,
): Promise<void> {
  console.log(
    `\n🛑 Recebido ${signal}. Encerrando servidor...`,
  );

  server.close(
    async () => {
      await db.$disconnect();

      console.log(
        '✅ Servidor encerrado.',
      );

      process.exit(0);
    },
  );
}

process.on(
  'SIGINT',
  () => {
    void shutdown(
      'SIGINT',
    );
  },
);

process.on(
  'SIGTERM',
  () => {
    void shutdown(
      'SIGTERM',
    );
  },
);
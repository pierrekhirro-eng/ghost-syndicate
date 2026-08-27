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
      totals.get(session.memberId) ?? {
        memberId: session.memberId,
        name:
          session.member.displayName ||
          session.member.username ||
          session.memberId,
        seconds: 0,
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
        b.seconds - a.seconds,
    )
    .slice(0, limit);
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
    (total, session) =>
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
        service: 'Ghost Syndicate Web',
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
        service: 'Ghost Syndicate Web',
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
      const id = getGuildId();

      const guild =
        await db.guild.findUnique({
          where: {
            id,
          },
        });

      const topVoice =
        await getTopVoice(id, 10);

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
      const id = getGuildId();
      const userId = getParamString(
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
          formatDuration(seconds),
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
      const id = getGuildId();

      const ranking =
        await getTopVoice(
          id,
          25,
        );

      res.json({
        ranking: ranking.map(
          (member, index) => ({
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
      const id = getGuildId();

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
            createdAt: 'desc',
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
            (movement) => ({
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
      const id = getGuildId();

      const operations =
        await db.operation.findMany({
          where: {
            guildId: id,
          },
          orderBy: {
            createdAt: 'desc',
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
      const id = getGuildId();

      const missions =
        await db.mission.findMany({
          where: {
            guildId: id,
          },
          orderBy: {
            createdAt: 'desc',
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
    content="#090b12"
  >

  <title>
    Ghost Syndicate
  </title>

  <style>
    :root {
      color-scheme: dark;
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      min-height: 100%;
    }

    body {
      min-height: 100vh;
      background:
        radial-gradient(
          circle at 15% 0%,
          rgba(124, 92, 255, .16),
          transparent 30%
        ),
        radial-gradient(
          circle at 90% 20%,
          rgba(92, 114, 255, .08),
          transparent 28%
        ),
        #080a10;
      color: #f5f7fb;
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
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      background:
        linear-gradient(
          120deg,
          transparent 0%,
          rgba(124, 92, 255, .03) 40%,
          transparent 70%
        );
    }

    main {
      width: min(
        1180px,
        calc(100% - 40px)
      );
      margin: 0 auto;
      padding: 42px 0 70px;
    }

    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
      margin-bottom: 42px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    .logo {
      width: 54px;
      height: 54px;
      display: grid;
      place-items: center;
      border-radius: 17px;
      background:
        linear-gradient(
          135deg,
          #9278ff,
          #6249db
        );
      box-shadow:
        0 18px 50px
        rgba(124, 92, 255, .24);
      font-size: 25px;
    }

    .eyebrow {
      margin: 0 0 5px;
      color: #7f899b;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .17em;
      text-transform: uppercase;
    }

    .brand h1 {
      margin: 0;
      font-size: 23px;
      letter-spacing: -.035em;
    }

    .status {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 14px;
      border: 1px solid #242938;
      border-radius: 999px;
      background:
        rgba(14, 17, 25, .72);
      color: #9ea8ba;
      font-size: 12px;
      backdrop-filter: blur(16px);
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #35d39a;
      box-shadow:
        0 0 16px
        rgba(53, 211, 154, .7);
    }

    .hero {
      margin-bottom: 26px;
    }

    .hero h2 {
      max-width: 760px;
      margin: 0;
      font-size:
        clamp(36px, 5vw, 58px);
      line-height: .98;
      letter-spacing: -.06em;
    }

    .hero p {
      max-width: 680px;
      margin: 17px 0 0;
      color: #858fa2;
      font-size: 16px;
      line-height: 1.65;
    }

    .grid {
      display: grid;
      grid-template-columns:
        repeat(3, minmax(0, 1fr));
      gap: 15px;
    }

    .card {
      border: 1px solid #242938;
      border-radius: 22px;
      padding: 23px;
      background:
        linear-gradient(
          180deg,
          rgba(20, 24, 35, .94),
          rgba(11, 14, 22, .98)
        );
      box-shadow:
        0 24px 80px
        rgba(0, 0, 0, .20);
      backdrop-filter: blur(16px);
    }

    .card-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 18px;
    }

    .label {
      margin: 0;
      color: #838da0;
      font-size: 11px;
      font-weight: 800;
      letter-spacing: .13em;
      text-transform: uppercase;
    }

    .icon {
      font-size: 21px;
    }

    .value {
      font-size: 29px;
      font-weight: 850;
      letter-spacing: -.045em;
    }

    .section {
      margin-top: 16px;
    }

    .section-title {
      margin: 0 0 15px;
      font-size: 19px;
      letter-spacing: -.025em;
    }

    .ranking {
      display: grid;
      gap: 9px;
    }

    .rank-row {
      display: grid;
      grid-template-columns:
        42px 1fr auto;
      align-items: center;
      gap: 13px;
      min-height: 60px;
      padding: 12px 14px;
      border: 1px solid #222735;
      border-radius: 16px;
      background:
        rgba(255, 255, 255, .015);
    }

    .rank-position {
      width: 32px;
      height: 32px;
      display: grid;
      place-items: center;
      border-radius: 10px;
      background: #171b27;
      color: #bdc6d7;
      font-size: 12px;
      font-weight: 850;
    }

    .rank-name {
      font-weight: 750;
    }

    .rank-subtitle {
      margin-top: 3px;
      color: #70798c;
      font-size: 12px;
    }

    .rank-time {
      color: #b1bac9;
      font-size: 13px;
      font-weight: 700;
      white-space: nowrap;
    }

    .empty {
      color: #70798c;
      line-height: 1.6;
    }

    .error {
      padding: 17px;
      border: 1px solid #4b2932;
      border-radius: 15px;
      background:
        rgba(241, 91, 107, .07);
      color: #eca4ae;
      line-height: 1.5;
    }

    .footer {
      margin-top: 34px;
      text-align: center;
      color: #626b7c;
      font-size: 11px;
    }

    @media (max-width: 850px) {
      main {
        width: min(
          100% - 24px,
          700px
        );
        padding-top: 28px;
      }

      .topbar {
        align-items: flex-start;
        flex-direction: column;
      }

      .grid {
        grid-template-columns: 1fr;
      }

      .hero h2 {
        font-size: 42px;
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
        <span class="status-dot"></span>
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

    <section class="card section">

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
      • Organização • Lealdade • Resultado
    </footer>

  </main>

  <script>
    const money = (value) =>
      Number(value || 0)
        .toLocaleString(
          'pt-BR',
          {
            style: 'currency',
            currency: 'BRL',
            maximumFractionDigits: 0
          }
        );

    const escapeHtml = (value) =>
      String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const formatDuration = (seconds) => {
      const safe =
        Math.max(
          0,
          Math.floor(
            Number(seconds || 0)
          )
        );

      const hours =
        Math.floor(
          safe / 3600
        );

      const minutes =
        Math.floor(
          (safe % 3600) / 60
        );

      return (
        hours > 0
          ? hours + 'h ' + minutes + 'min'
          : minutes + 'min'
      );
    };

    async function loadDashboard() {
      const rankingElement =
        document.getElementById(
          'ranking'
        );

      try {
        const response =
          await fetch(
            '/api/overview'
          );

        if (!response.ok) {
          throw new Error(
            'Falha na API'
          );
        }

        const data =
          await response.json();

        const guild =
          data.guild;

        document.getElementById(
          'cash'
        ).textContent =
          money(
            guild?.cashBalance
          );

        document.getElementById(
          'goal'
        ).textContent =
          guild?.dailyGoal > 0
            ? money(
                guild.dailyGoal
              )
            : 'Não definida';

        document.getElementById(
          'reserve'
        ).textContent =
          guild?.reserve > 0
            ? money(
                guild.reserve
              )
            : 'Não definida';

        const ranking =
          Array.isArray(
            data.topVoice
          )
            ? data.topVoice
            : [];

        if (
          ranking.length === 0
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
              (member, index) => {
                return (
                  '<div class="rank-row">' +
                    '<div class="rank-position">' +
                      (index + 1) +
                    '</div>' +

                    '<div>' +
                      '<div class="rank-name">' +
                        escapeHtml(
                          member.name
                        ) +
                      '</div>' +

                      '<div class="rank-subtitle">' +
                        'Participação em voz' +
                      '</div>' +
                    '</div>' +

                    '<div class="rank-time">' +
                      formatDuration(
                        member.seconds
                      ) +
                    '</div>' +
                  '</div>'
                );
              }
            )
            .join('');

      } catch (error) {
        console.error(
          '[DASHBOARD]',
          error
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
      30000
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

const port = Number(
  process.env.WEB_PORT || 3010,
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

async function shutdown(
  signal: string,
): Promise<void> {
  console.log(
    `\n🛑 Recebido ${signal}. Encerrando servidor...`,
  );

  server.close(async () => {
    await db.$disconnect();

    console.log(
      '✅ Servidor encerrado.',
    );

    process.exit(0);
  });
}

process.on(
  'SIGINT',
  () => {
    void shutdown('SIGINT');
  },
);

process.on(
  'SIGTERM',
  () => {
    void shutdown('SIGTERM');
  },
);
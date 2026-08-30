import type {
  Express,
  Request,
  Response,
} from 'express';

import type {
  PrismaClient,
} from '@prisma/client';

/* =========================================================
   TIPOS
========================================================= */

type AdminContext = {
  db: PrismaClient;
  guildId: string;
};

type DiscordRole = {
  id: string;
  name: string;
  position: number;
  managed: boolean;
};

type DiscordChannel = {
  id: string;
  name: string;
  type: number;
  parent_id: string | null;
  position: number;
};

/* =========================================================
   DEFAULTS
========================================================= */

const DEFAULTS = {
  serverName:
    'Ghost Syndicate',

  brandName:
    'Ghost Syndicate',

  primaryColor:
    '#43FF98',

  secondaryColor:
    '#07120C',

  footerText:
    'Ghost Syndicate • Organização • Lealdade • Resultado',

  ticketsEnabled:
    true,

  ticketTitle:
    '🎫 CENTRAL DE ATENDIMENTO',

  ticketDescription:
    'Abra um atendimento privado com nossa equipe.',

  ticketWelcomeText:
    'Olá {user}, seu atendimento foi aberto. Explique abaixo o que você precisa e aguarde nossa equipe.',

  ticketOpenButtonLabel:
    'Abrir Atendimento',

  ticketOpenButtonEmoji:
    '🎫',

  ticketHowButtonLabel:
    'Como funciona',

  ticketHowButtonEmoji:
    '❓',

  ticketFinanceButtonLabel:
    'Financeiro',

  ticketFinanceButtonEmoji:
    '💰',

  rankingEnabled:
    true,

  rankingTitle:
    '🎙️ Ranking de horas em call',

  rankingDescription:
    'Acompanhe o tempo acumulado da equipe nos canais de voz.',

  financeEnabled:
    true,

  moderationEnabled:
    true,
} as const;

/* =========================================================
   EMOJIS
========================================================= */

const EMOJIS = [
  '🎫',
  '📩',
  '📨',
  '📥',
  '📤',
  '📌',
  '📋',
  '📝',

  '💬',
  '📞',
  '📣',
  '🔔',
  '🆘',
  '❓',
  '💡',
  '👤',

  '💰',
  '💳',
  '🏦',
  '💸',
  '🪙',
  '📜',
  '📄',
  '🧾',

  '🔒',
  '🔓',
  '🔑',
  '🛡️',
  '⚡',
  '✅',
  '❌',
  '⭐',

  '🚀',
  '🛠️',
  '🔧',
  '⚙️',
  '👋',
  '🔥',
  '🎯',
  '🏆',

  '📂',
  '🗂️',
  '📁',
  '📮',
  '🤝',
  '🧑‍💻',
  '👨‍💼',
  '👩‍💼',

  '🏠',
  '🌐',
  '🎯',
  '🏅',
  '🥇',
  '🥈',
  '🥉',
  '📊',

  '🔴',
  '🟢',
  '🟡',
  '🔵',
  '🟣',
  '⚫',
  '⚪',
  '🟠',

  '🎮',
  '🎧',
  '🎤',
  '📢',
  '🎥',
  '🎬',
  '🖥️',
  '💻',
];

/* =========================================================
   HELPERS
========================================================= */

function escapeHtml(
  value: unknown,
): string {
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

function cleanText(
  value: unknown,
  fallback: string,
  maxLength: number,
): string {
  if (
    typeof value !==
    'string'
  ) {
    return fallback;
  }

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

function optionalId(
  value: unknown,
): string | null {
  if (
    typeof value !==
    'string'
  ) {
    return null;
  }

  const cleaned =
    value.trim();

  return cleaned ||
    null;
}

function validHex(
  value: unknown,
): boolean {
  return (
    typeof value ===
      'string' &&
    /^#[0-9A-Fa-f]{6}$/.test(
      value.trim(),
    )
  );
}

/* =========================================================
   CONFIG
========================================================= */

async function ensureConfig(
  ctx: AdminContext,
) {
  const existing =
    await ctx.db.guildConfig.findUnique({
      where: {
        guildId:
          ctx.guildId,
      },
    });

  if (
    existing
  ) {
    return existing;
  }

  const guild =
    await ctx.db.guild.findUnique({
      where: {
        id:
          ctx.guildId,
      },
    });

  return ctx.db.guildConfig.create({
    data: {
      guildId:
        ctx.guildId,

      serverName:
        guild?.name ??
        DEFAULTS.serverName,

      brandName:
        DEFAULTS.brandName,

      primaryColor:
        DEFAULTS.primaryColor,

      secondaryColor:
        DEFAULTS.secondaryColor,

      footerText:
        DEFAULTS.footerText,

      ticketsEnabled:
        DEFAULTS.ticketsEnabled,

      ticketTitle:
        DEFAULTS.ticketTitle,

      ticketDescription:
        DEFAULTS.ticketDescription,

      ticketWelcomeText:
        DEFAULTS.ticketWelcomeText,

      ticketOpenButtonLabel:
        DEFAULTS.ticketOpenButtonLabel,

      ticketOpenButtonEmoji:
        DEFAULTS.ticketOpenButtonEmoji,

      ticketHowButtonLabel:
        DEFAULTS.ticketHowButtonLabel,

      ticketHowButtonEmoji:
        DEFAULTS.ticketHowButtonEmoji,

      ticketFinanceButtonLabel:
        DEFAULTS.ticketFinanceButtonLabel,

      ticketFinanceButtonEmoji:
        DEFAULTS.ticketFinanceButtonEmoji,

      rankingEnabled:
        DEFAULTS.rankingEnabled,

      rankingTitle:
        DEFAULTS.rankingTitle,

      rankingDescription:
        DEFAULTS.rankingDescription,

      financeEnabled:
        DEFAULTS.financeEnabled,

      moderationEnabled:
        DEFAULTS.moderationEnabled,
    },
  });
}

/* =========================================================
   DISCORD API
========================================================= */

function getDiscordToken(): string {
  const token =
    process.env.DISCORD_TOKEN?.trim();

  if (
    !token
  ) {
    throw new Error(
      'DISCORD_TOKEN não configurado no .env.',
    );
  }

  return token;
}

async function discordFetch<T>(
  endpoint: string,
): Promise<T> {
  const response =
    await fetch(
      'https://discord.com/api/v10' +
      endpoint,
      {
        headers: {
          Authorization:
            'Bot ' +
            getDiscordToken(),

          'Content-Type':
            'application/json',

          'User-Agent':
            'Ghost-Syndicate/1.0',
        },
      },
    );

  if (
    response.status ===
    429
  ) {
    const retryAfter =
      response.headers.get(
        'retry-after',
      ) ??
      '30';

    throw new Error(
      'RATE_LIMIT:' +
      retryAfter,
    );
  }

  if (
    !response.ok
  ) {
    const body =
      await response.text();

    throw new Error(
      'DISCORD_' +
      response.status +
      ':' +
      body.slice(
        0,
        300,
      ),
    );
  }

  return response.json() as Promise<T>;
}

async function getDiscordResources(
  guildId: string,
) {
  const [
    roles,
    channels,
  ] =
    await Promise.all([
      discordFetch<
        DiscordRole[]
      >(
        '/guilds/' +
        guildId +
        '/roles',
      ),

      discordFetch<
        DiscordChannel[]
      >(
        '/guilds/' +
        guildId +
        '/channels',
      ),
    ]);

  return {
    roles:
      roles
        .filter(
          (
            role,
          ) =>
            !role.managed,
        )
        .sort(
          (
            a,
            b,
          ) =>
            b.position -
            a.position,
        ),

    channels:
      channels
        .filter(
          (
            channel,
          ) =>
            channel.type ===
              0 ||
            channel.type ===
              4 ||
            channel.type ===
              5,
        )
        .sort(
          (
            a,
            b,
          ) =>
            a.position -
            b.position,
        ),
  };
}

/* =========================================================
   GET CONFIG
========================================================= */

async function getConfig(
  ctx: AdminContext,
  res: Response,
): Promise<void> {
  try {
    const config =
      await ensureConfig(
        ctx,
      );

    res.json({
      success:
        true,

      config,
    });

  } catch (
    error
  ) {
    console.error(
      '[ADMIN] GET CONFIG',
      error,
    );

    res
      .status(500)
      .json({
        success:
          false,

        error:
          'Não foi possível carregar a configuração.',
      });
  }
}

/* =========================================================
   UPDATE CONFIG
   IMPORTANTE:
   NÃO chama Discord API.
========================================================= */

async function updateConfig(
  ctx: AdminContext,
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const current =
      await ensureConfig(
        ctx,
      );

    const body =
      req.body as Record<
        string,
        unknown
      >;

    const primaryColor =
      validHex(
        body.primaryColor,
      )
        ? String(
            body.primaryColor,
          ).toUpperCase()
        : current.primaryColor;

    const secondaryColor =
      validHex(
        body.secondaryColor,
      )
        ? String(
            body.secondaryColor,
          ).toUpperCase()
        : current.secondaryColor;

    const data = {
      serverName:
        cleanText(
          body.serverName,
          current.serverName,
          100,
        ),

      brandName:
        cleanText(
          body.brandName,
          current.brandName,
          100,
        ),

      primaryColor,

      secondaryColor,

      footerText:
        cleanText(
          body.footerText,
          current.footerText,
          2048,
        ),

      /* =======================
         TICKETS
      ======================= */

      ticketsEnabled:
        typeof body.ticketsEnabled ===
        'boolean'
          ? body.ticketsEnabled
          : current.ticketsEnabled,

      ticketTitle:
        cleanText(
          body.ticketTitle,
          current.ticketTitle,
          256,
        ),

      ticketDescription:
        cleanText(
          body.ticketDescription,
          current.ticketDescription,
          4000,
        ),

      ticketWelcomeText:
        cleanText(
          body.ticketWelcomeText,
          current.ticketWelcomeText,
          4000,
        ),

      ticketOpenButtonLabel:
        cleanText(
          body.ticketOpenButtonLabel,
          current.ticketOpenButtonLabel,
          80,
        ),

      ticketOpenButtonEmoji:
        cleanText(
          body.ticketOpenButtonEmoji,
          current.ticketOpenButtonEmoji,
          100,
        ),

      ticketHowButtonLabel:
        cleanText(
          body.ticketHowButtonLabel,
          current.ticketHowButtonLabel,
          80,
        ),

      ticketHowButtonEmoji:
        cleanText(
          body.ticketHowButtonEmoji,
          current.ticketHowButtonEmoji,
          100,
        ),

      ticketFinanceButtonLabel:
        cleanText(
          body.ticketFinanceButtonLabel,
          current.ticketFinanceButtonLabel,
          80,
        ),

      ticketFinanceButtonEmoji:
        cleanText(
          body.ticketFinanceButtonEmoji,
          current.ticketFinanceButtonEmoji,
          100,
        ),

      /* =======================
         CARGOS
      ======================= */

      ownerRoleId:
        body.ownerRoleId !==
        undefined
          ? optionalId(
              body.ownerRoleId,
            )
          : current.ownerRoleId,

      adminRoleId:
        body.adminRoleId !==
        undefined
          ? optionalId(
              body.adminRoleId,
            )
          : current.adminRoleId,

      recruitRoleId:
        body.recruitRoleId !==
        undefined
          ? optionalId(
              body.recruitRoleId,
            )
          : current.recruitRoleId,

      financeRoleId:
        body.financeRoleId !==
        undefined
          ? optionalId(
              body.financeRoleId,
            )
          : current.financeRoleId,

      operationsRoleId:
        body.operationsRoleId !==
        undefined
          ? optionalId(
              body.operationsRoleId,
            )
          : current.operationsRoleId,

      /* =======================
         CANAIS
      ======================= */

      ticketCategoryId:
        body.ticketCategoryId !==
        undefined
          ? optionalId(
              body.ticketCategoryId,
            )
          : current.ticketCategoryId,

      transcriptChannelId:
        body.transcriptChannelId !==
        undefined
          ? optionalId(
              body.transcriptChannelId,
            )
          : current.transcriptChannelId,

      rankingChannelId:
        body.rankingChannelId !==
        undefined
          ? optionalId(
              body.rankingChannelId,
            )
          : current.rankingChannelId,

      /* =======================
         RANKING
      ======================= */

      rankingEnabled:
        typeof body.rankingEnabled ===
        'boolean'
          ? body.rankingEnabled
          : current.rankingEnabled,

      rankingTitle:
        cleanText(
          body.rankingTitle,
          current.rankingTitle,
          256,
        ),

      rankingDescription:
        cleanText(
          body.rankingDescription,
          current.rankingDescription,
          4000,
        ),

      /* =======================
         MÓDULOS
      ======================= */

      financeEnabled:
        typeof body.financeEnabled ===
        'boolean'
          ? body.financeEnabled
          : current.financeEnabled,

      moderationEnabled:
        typeof body.moderationEnabled ===
        'boolean'
          ? body.moderationEnabled
          : current.moderationEnabled,
    };

    const updated =
      await ctx.db.guildConfig.update({
        where: {
          guildId:
            ctx.guildId,
        },

        data,
      });

    res.json({
      success:
        true,

      message:
        'Configurações salvas com sucesso.',

      config:
        updated,
    });

  } catch (
    error
  ) {
    console.error(
      '[ADMIN] UPDATE',
      error,
    );

    res
      .status(500)
      .json({
        success:
          false,

        error:
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar.',
      });
  }
}

/* =========================================================
   RESET
========================================================= */

async function resetConfig(
  ctx: AdminContext,
  res: Response,
): Promise<void> {
  try {
    const guild =
      await ctx.db.guild.findUnique({
        where: {
          id:
            ctx.guildId,
        },
      });

    const values = {
      serverName:
        guild?.name ??
        DEFAULTS.serverName,

      brandName:
        DEFAULTS.brandName,

      primaryColor:
        DEFAULTS.primaryColor,

      secondaryColor:
        DEFAULTS.secondaryColor,

      footerText:
        DEFAULTS.footerText,

      ticketsEnabled:
        DEFAULTS.ticketsEnabled,

      ticketTitle:
        DEFAULTS.ticketTitle,

      ticketDescription:
        DEFAULTS.ticketDescription,

      ticketWelcomeText:
        DEFAULTS.ticketWelcomeText,

      ticketOpenButtonLabel:
        DEFAULTS.ticketOpenButtonLabel,

      ticketOpenButtonEmoji:
        DEFAULTS.ticketOpenButtonEmoji,

      ticketHowButtonLabel:
        DEFAULTS.ticketHowButtonLabel,

      ticketHowButtonEmoji:
        DEFAULTS.ticketHowButtonEmoji,

      ticketFinanceButtonLabel:
        DEFAULTS.ticketFinanceButtonLabel,

      ticketFinanceButtonEmoji:
        DEFAULTS.ticketFinanceButtonEmoji,

      rankingEnabled:
        DEFAULTS.rankingEnabled,

      rankingTitle:
        DEFAULTS.rankingTitle,

      rankingDescription:
        DEFAULTS.rankingDescription,

      financeEnabled:
        DEFAULTS.financeEnabled,

      moderationEnabled:
        DEFAULTS.moderationEnabled,
    };

    const updated =
      await ctx.db.guildConfig.upsert({
        where: {
          guildId:
            ctx.guildId,
        },

        create: {
          guildId:
            ctx.guildId,

          ...values,
        },

        update:
          values,
      });

    res.json({
      success:
        true,

      config:
        updated,
    });

  } catch (
    error
  ) {
    console.error(
      '[ADMIN] RESET',
      error,
    );

    res
      .status(500)
      .json({
        success:
          false,

        error:
          'Não foi possível restaurar a configuração.',
      });
  }
}

/* =========================================================
   HTML
========================================================= */

function createAdminPage(
  config: Record<
    string,
    unknown
  >,
): string {
  const value = (
    key: string,
  ) =>
    escapeHtml(
      config[key],
    );

  const checked = (
    key: string,
  ) =>
    config[key]
      ? 'checked'
      : '';

  const emojiJson =
    JSON.stringify(
      EMOJIS,
    )
      .replaceAll(
        '<',
        '\\u003c',
      )
      .replaceAll(
        '>',
        '\\u003e',
      )
      .replaceAll(
        '&',
        '\\u0026',
      );

  return `
<!doctype html>

<html lang="pt-BR">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1"
/>

<meta
  name="theme-color"
  content="#030806"
/>

<meta
  name="color-scheme"
  content="dark"
/>

<title>
Ghost Syndicate • Painel Administrativo
</title>

<style>

:root {

  color-scheme:
    dark;

  --bg:
    #030806;

  --panel:
    #07100a;

  --panel2:
    #0a160e;

  --panel3:
    #0e1b12;

  --green:
    #43ff98;

  --green2:
    #b9ffd5;

  --text:
    #effff5;

  --muted:
    #789383;

  --muted2:
    #506b5a;

  --border:
    rgba(
      67,
      255,
      152,
      .14
    );

  --border2:
    rgba(
      67,
      255,
      152,
      .30
    );

  --danger:
    #ff6872;

}

* {
  box-sizing:
    border-box;
}

html {
  scroll-behavior:
    smooth;
}

body {

  margin:
    0;

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
      circle at 0 0,
      rgba(
        67,
        255,
        152,
        .08
      ),
      transparent 28%
    ),

    radial-gradient(
      circle at 100% 100%,
      rgba(
        67,
        255,
        152,
        .04
      ),
      transparent 26%
    ),

    var(--bg);

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

  opacity:
    .015;

  background:
    repeating-linear-gradient(
      180deg,
      rgba(
        255,
        255,
        255,
        .18
      ) 0,
      rgba(
        255,
        255,
        255,
        .18
      ) 1px,
      transparent 1px,
      transparent 8px
    );

}

button,
input,
textarea,
select {
  font:
    inherit;
}

button {
  cursor:
    pointer;
}

.layout {

  display:
    grid;

  grid-template-columns:
    245px
    minmax(
      0,
      1fr
    );

  min-height:
    100vh;

}

.sidebar {

  position:
    sticky;

  top:
    0;

  height:
    100vh;

  overflow:
    auto;

  padding:
    18px;

  border-right:
    1px solid
    var(--border);

  background:
    rgba(
      4,
      11,
      7,
      .97
    );

  backdrop-filter:
    blur(
      18px
    );

}

.brand {

  display:
    flex;

  align-items:
    center;

  gap:
    10px;

  margin-bottom:
    24px;

}

.logo {

  width:
    44px;

  height:
    44px;

  display:
    grid;

  place-items:
    center;

  border:
    1px solid
    var(--border2);

  border-radius:
    13px;

  background:
    #0a1c11;

  font-size:
    20px;

}

.brand-small {

  margin:
    0;

  color:
    var(--green);

  font-size:
    8px;

  font-weight:
    950;

  letter-spacing:
    .17em;

}

.brand-name {

  margin:
    3px 0 0;

  font-size:
    12px;

  font-weight:
    900;

}

.nav-title {

  margin:
    16px 7px 7px;

  color:
    var(--muted2);

  font-size:
    8px;

  font-weight:
    950;

  letter-spacing:
    .14em;

  text-transform:
    uppercase;

}

.nav {

  display:
    grid;

  gap:
    4px;

}

.nav button {

  width:
    100%;

  padding:
    10px;

  border:
    1px solid
    transparent;

  border-radius:
    10px;

  background:
    transparent;

  color:
    #819a8b;

  text-align:
    left;

  font-size:
    9px;

  font-weight:
    850;

}

.nav button:hover,
.nav button.active {

  border-color:
    var(--border);

  background:
    rgba(
      67,
      255,
      152,
      .05
    );

  color:
    var(--green2);

}

.main {

  min-width:
    0;

  padding:
    18px 22px 55px;

}

.topbar {

  position:
    sticky;

  top:
    10px;

  z-index:
    30;

  display:
    flex;

  align-items:
    center;

  justify-content:
    space-between;

  gap:
    12px;

  margin-bottom:
    14px;

  padding:
    12px 15px;

  border:
    1px solid
    var(--border);

  border-radius:
    15px;

  background:
    rgba(
      6,
      14,
      9,
      .94
    );

  backdrop-filter:
    blur(
      16px
    );

}

.page-title {

  margin:
    0;

  font-size:
    15px;

  font-weight:
    950;

}

.page-subtitle {

  margin:
    3px 0 0;

  color:
    var(--muted);

  font-size:
    8px;

}

.top-actions {

  display:
    flex;

  align-items:
    center;

  gap:
    8px;

}

.status {

  display:
    inline-flex;

  align-items:
    center;

  gap:
    7px;

  padding:
    8px 10px;

  border:
    1px solid
    var(--border);

  border-radius:
    999px;

  color:
    #89a394;

  font-size:
    8px;

  font-weight:
    850;

}

.status-dot {

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
    var(--green);

}

.btn {

  min-height:
    34px;

  padding:
    8px 12px;

  border:
    1px solid
    var(--border);

  border-radius:
    9px;

  background:
    var(--panel3);

  color:
    var(--green2);

  font-size:
    9px;

  font-weight:
    900;

}

.btn:hover {
  border-color:
    var(--border2);
}

.btn.primary {

  border-color:
    rgba(
      67,
      255,
      152,
      .35
    );

  background:
    #0b2a18;

}

.btn.danger {
  color:
    #ff9ca3;
}

.panel {

  overflow:
    hidden;

  margin-bottom:
    14px;

  border:
    1px solid
    var(--border);

  border-radius:
    17px;

  background:
    rgba(
      7,
      16,
      10,
      .96
    );

}

.panel-head {

  padding:
    14px 16px;

  border-bottom:
    1px solid
    var(--border);

  background:
    var(--panel2);

}

.panel-head h2 {

  margin:
    0;

  font-size:
    11px;

  font-weight:
    950;

}

.panel-head p {

  margin:
    4px 0 0;

  color:
    var(--muted);

  font-size:
    8px;

}

.panel-body {

  padding:
    16px;

}

.grid {

  display:
    grid;

  grid-template-columns:
    repeat(
      2,
      minmax(
        0,
        1fr
      )
    );

  gap:
    11px;

}

.full {
  grid-column:
    1 / -1;
}

.field {

  display:
    grid;

  gap:
    6px;

}

.field label {

  color:
    #91a998;

  font-size:
    8px;

  font-weight:
    950;

  letter-spacing:
    .07em;

  text-transform:
    uppercase;

}

.field input,
.field textarea,
.field select {

  width:
    100%;

  padding:
    10px;

  border:
    1px solid
    rgba(
      67,
      255,
      152,
      .10
    );

  border-radius:
    10px;

  outline:
    none;

  background:
    #050c08;

  color:
    var(--text);

  font-size:
    9px;

}

.field input:focus,
.field textarea:focus,
.field select:focus {

  border-color:
    var(--border2);

  background:
    #09140d;

}

.field textarea {

  min-height:
    90px;

  resize:
    vertical;

  line-height:
    1.55;

}

.help {

  color:
    var(--muted2);

  font-size:
    8px;

}

.cards {

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

  gap:
    10px;

}

.card {

  padding:
    13px;

  border:
    1px solid
    var(--border);

  border-radius:
    13px;

  background:
    rgba(
      255,
      255,
      255,
      .012
    );

}

.card-label {

  color:
    var(--muted2);

  font-size:
    7px;

  font-weight:
    950;

  letter-spacing:
    .13em;

}

.card-value {

  margin-top:
    7px;

  color:
    var(--green2);

  font-size:
    12px;

  font-weight:
    950;

}

.switch {

  display:
    flex;

  align-items:
    center;

  justify-content:
    space-between;

  gap:
    12px;

  padding:
    11px 12px;

  border:
    1px solid
    var(--border);

  border-radius:
    12px;

  background:
    rgba(
      255,
      255,
      255,
      .012
    );

}

.switch-title {

  font-size:
    9px;

  font-weight:
    900;

}

.switch-desc {

  margin-top:
    3px;

  color:
    var(--muted);

  font-size:
    8px;

}

.toggle {

  position:
    relative;

  width:
    42px;

  height:
    23px;

}

.toggle input {

  position:
    absolute;

  opacity:
    0;

}

.slider {

  position:
    absolute;

  inset:
    0;

  border:
    1px solid
    #20392a;

  border-radius:
    999px;

  background:
    #0a120e;

}

.slider::before {

  content:
    "";

  position:
    absolute;

  width:
    17px;

  height:
    17px;

  left:
    2px;

  top:
    2px;

  border-radius:
    50%;

  background:
    #65786b;

  transition:
    .18s;

}

.toggle input:checked
+ .slider {

  border-color:
    rgba(
      67,
      255,
      152,
      .40
    );

  background:
    #0b2818;

}

.toggle input:checked
+ .slider::before {

  transform:
    translateX(
      18px
    );

  background:
    var(--green);

  box-shadow:
    0 0 12px
    var(--green);

}

.resources {

  display:
    grid;

  grid-template-columns:
    1fr
    1fr;

  gap:
    12px;

}

.resource-box {

  padding:
    13px;

  border:
    1px solid
    var(--border);

  border-radius:
    13px;

  background:
    #061009;

}

.resource-title {

  margin-bottom:
    12px;

  color:
    var(--green2);

  font-size:
    9px;

  font-weight:
    950;

}

/* =========================================================
   EMOJI PICKER
========================================================= */

.emoji-editor {

  display:
    grid;

  gap:
    10px;

  padding:
    12px;

  border:
    1px solid
    var(--border);

  border-radius:
    13px;

  background:
    #061009;

}

.emoji-editor-head {

  display:
    flex;

  align-items:
    center;

  justify-content:
    space-between;

  gap:
    10px;

}

.emoji-selected {

  display:
    flex;

  align-items:
    center;

  gap:
    8px;

}

.emoji-selected-icon {

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
    var(--border2);

  border-radius:
    10px;

  background:
    #0b1d12;

  font-size:
    21px;

}

.emoji-selected-text {

  color:
    var(--muted);

  font-size:
    8px;

}

.emoji-search {

  width:
    180px;

  padding:
    9px 10px;

  border:
    1px solid
    var(--border);

  border-radius:
    9px;

  outline:
    none;

  background:
    #050c08;

  color:
    var(--text);

  font-size:
    9px;

}

.emoji-grid {

  display:
    grid;

  grid-template-columns:
    repeat(
      8,
      minmax(
        0,
        1fr
      )
    );

  gap:
    5px;

  max-height:
    210px;

  overflow-y:
    auto;

  padding:
    4px;

}

.emoji-option {

  width:
    100%;

  aspect-ratio:
    1;

  display:
    grid;

  place-items:
    center;

  border:
    1px solid
    transparent;

  border-radius:
    8px;

  background:
    transparent;

  color:
    white;

  font-size:
    19px;

  transition:
    .16s;

}

.emoji-option:hover {

  border-color:
    var(--border2);

  background:
    rgba(
      67,
      255,
      152,
      .07
    );

  transform:
    translateY(
      -1px
    );

}

.emoji-option.selected {

  border-color:
    var(--green);

  background:
    rgba(
      67,
      255,
      152,
      .10
    );

  box-shadow:
    0 0 14px
    rgba(
      67,
      255,
      152,
      .12
    );

}

.ticket-button-editor {

  display:
    grid;

  gap:
    10px;

  padding:
    12px;

  border:
    1px solid
    var(--border);

  border-radius:
    13px;

  background:
    rgba(
      255,
      255,
      255,
      .01
    );

}

.ticket-button-editor-title {

  display:
    flex;

  align-items:
    center;

  gap:
    8px;

  color:
    var(--green2);

  font-size:
    9px;

  font-weight:
    950;

}

.preview {

  overflow:
    hidden;

  border:
    1px solid
    var(--border);

  border-radius:
    14px;

  background:
    #1f2124;

}

.preview-head {

  padding:
    9px 11px;

  border-bottom:
    1px solid
    rgba(
      255,
      255,
      255,
      .06
    );

  color:
    #d5d8dc;

  font-size:
    8px;

}

.preview-body {

  padding:
    14px;

}

.fake-embed {

  max-width:
    680px;

  padding:
    15px;

  border-left:
    3px solid
    var(--green);

  border-radius:
    7px;

  background:
    #2b2d31;

}

.fake-title {

  color:
    #f1f3f5;

  font-size:
    10px;

  font-weight:
    950;

}

.fake-heading {

  margin-top:
    11px;

  color:
    white;

  font-size:
    18px;

  font-weight:
    950;

}

.fake-text {

  margin-top:
    7px;

  color:
    #c7cbd0;

  white-space:
    pre-wrap;

  font-size:
    8px;

  line-height:
    1.55;

}

.fake-buttons {

  display:
    flex;

  flex-wrap:
    wrap;

  gap:
    6px;

  margin-top:
    12px;

}

.fake-button {

  padding:
    8px 10px;

  border:
    0;

  border-radius:
    7px;

  background:
    #4a4d53;

  color:
    white;

  font-size:
    8px;

  font-weight:
    850;

}

.fake-button.primary {
  background:
    #4f63e8;
}

.actions {

  display:
    flex;

  justify-content:
    flex-end;

  gap:
    7px;

  padding:
    12px 15px;

  border-top:
    1px solid
    var(--border);

}

.toast {

  position:
    fixed;

  right:
    18px;

  bottom:
    18px;

  z-index:
    100;

  min-width:
    250px;

  max-width:
    400px;

  padding:
    12px 14px;

  border:
    1px solid
    var(--border2);

  border-radius:
    12px;

  background:
    #09150d;

  color:
    var(--text);

  box-shadow:
    0 18px 60px
    rgba(
      0,
      0,
      0,
      .45
    );

  opacity:
    0;

  transform:
    translateY(
      10px
    );

  pointer-events:
    none;

  transition:
    .2s;

  font-size:
    9px;

}

.toast.show {

  opacity:
    1;

  transform:
    translateY(
      0
    );

}

.toast.error {

  border-color:
    rgba(
      255,
      104,
      114,
      .40
    );

}

@media (
  max-width: 950px
) {

  .layout {
    grid-template-columns:
      1fr;
  }

  .sidebar {

    position:
      relative;

    height:
      auto;

    border-right:
      0;

    border-bottom:
      1px solid
      var(--border);

  }

}

@media (
  max-width: 700px
) {

  .main {
    padding:
      10px;
  }

  .topbar {

    position:
      relative;

    top:
      auto;

    align-items:
      flex-start;

    flex-direction:
      column;

  }

  .grid,
  .resources,
  .cards {

    grid-template-columns:
      1fr;

  }

  .full {
    grid-column:
      auto;
  }

  .emoji-grid {

    grid-template-columns:
      repeat(
        6,
        minmax(
          0,
          1fr
        )
      );

  }

  .emoji-editor-head {

    align-items:
      flex-start;

    flex-direction:
      column;

  }

  .emoji-search {
    width:
      100%;
  }

  .actions {

    flex-direction:
      column;

  }

  .actions .btn {
    width:
      100%;
  }

}

</style>

</head>

<body>

<div class="layout">

<aside class="sidebar">

<div class="brand">

<div class="logo">
👻
</div>

<div>

<p class="brand-small">
GHOST SYNDICATE
</p>

<p class="brand-name">
Painel Administrativo
</p>

</div>

</div>

<p class="nav-title">
GERAL
</p>

<nav class="nav">

<button
  class="active"
  data-target="overview"
>
🏠 Dashboard
</button>

<button
  data-target="appearance"
>
🎨 Aparência
</button>

<button
  data-target="tickets"
>
🎫 Tickets
</button>

<button
  data-target="resources"
>
👥 Cargos e canais
</button>

<button
  data-target="ranking"
>
🎙️ Ranking
</button>

<button
  data-target="modules"
>
🧩 Módulos
</button>

</nav>

<p class="nav-title">
ATALHOS
</p>

<nav class="nav">

<button
  onclick="window.open('/ranking','_blank')"
>
🌐 Ranking Web
</button>

<button
  onclick="location.reload()"
>
↻ Atualizar
</button>

</nav>

</aside>

<main class="main">

<header class="topbar">

<div>

<h1 class="page-title">
Configurações do servidor
</h1>

<p class="page-subtitle">
Centro de controle do Ghost Syndicate
</p>

</div>

<div class="top-actions">

<div class="status">

<span class="status-dot"></span>

Configuração persistente

</div>

<button
  id="saveAll"
  class="btn primary"
>
💾 Salvar
</button>

</div>

</header>

<section
  id="overview"
  class="panel"
>

<div class="panel-head">

<h2>
⚙️ Visão geral
</h2>

<p>
Estado atual do sistema.
</p>

</div>

<div class="panel-body">

<div class="cards">

<div class="card">

<div class="card-label">
SERVIDOR
</div>

<div
  id="overviewServer"
  class="card-value"
>
${value(
  'serverName',
)}
</div>

</div>

<div class="card">

<div class="card-label">
TICKETS
</div>

<div
  id="overviewTickets"
  class="card-value"
>
${
  config.ticketsEnabled
    ? 'Ativado'
    : 'Desativado'
}
</div>

</div>

<div class="card">

<div class="card-label">
RANKING
</div>

<div
  id="overviewRanking"
  class="card-value"
>
${
  config.rankingEnabled
    ? 'Ativado'
    : 'Desativado'
}
</div>

</div>

</div>

</div>

</section>

<section
  id="appearance"
  class="panel"
>

<div class="panel-head">

<h2>
🎨 Aparência
</h2>

<p>
Personalize a identidade do sistema.
</p>

</div>

<div class="panel-body">

<div class="grid">

<div class="field">

<label>
Nome do servidor
</label>

<input
  id="serverName"
  value="${value(
    'serverName',
  )}"
/>

</div>

<div class="field">

<label>
Nome da marca
</label>

<input
  id="brandName"
  value="${value(
    'brandName',
  )}"
/>

</div>

<div class="field">

<label>
Cor principal
</label>

<input
  id="primaryColor"
  maxlength="7"
  value="${value(
    'primaryColor',
  )}"
/>

</div>

<div class="field">

<label>
Cor secundária
</label>

<input
  id="secondaryColor"
  maxlength="7"
  value="${value(
    'secondaryColor',
  )}"
/>

</div>

<div class="field full">

<label>
Rodapé
</label>

<input
  id="footerText"
  value="${value(
    'footerText',
  )}"
/>

</div>

</div>

</div>

<div class="actions">

<button
  id="saveAppearance"
  class="btn primary"
>
💾 Salvar aparência
</button>

</div>

</section>

<section
  id="tickets"
  class="panel"
>

<div class="panel-head">

<h2>
🎫 Tickets
</h2>

<p>
Personalize textos, botões e emojis diretamente pelo site.
</p>

</div>

<div class="panel-body">

<div class="switch">

<div>

<div class="switch-title">
Sistema de tickets
</div>

<div class="switch-desc">
Permite abertura de novos atendimentos.
</div>

</div>

<label class="toggle">

<input
  id="ticketsEnabled"
  type="checkbox"
  ${checked(
    'ticketsEnabled',
  )}
/>

<span class="slider"></span>

</label>

</div>

<br>

<div class="grid">

<div class="field full">

<label>
Título da central
</label>

<input
  id="ticketTitle"
  value="${value(
    'ticketTitle',
  )}"
/>

</div>

<div class="field full">

<label>
Descrição
</label>

<textarea
  id="ticketDescription"
>${value(
  'ticketDescription',
)}</textarea>

</div>

<div class="field full">

<label>
Mensagem de boas-vindas
</label>

<textarea
  id="ticketWelcomeText"
>${value(
  'ticketWelcomeText',
)}</textarea>

<span class="help">
Use {user} para mencionar automaticamente o usuário.
</span>

</div>

<div class="ticket-button-editor">

<div class="ticket-button-editor-title">
📩 BOTÃO PRINCIPAL
</div>

<div class="field">

<label>
Nome do botão
</label>

<input
  id="ticketOpenButtonLabel"
  value="${value(
    'ticketOpenButtonLabel',
  )}"
/>

</div>

<div class="emoji-editor">

<div class="emoji-editor-head">

<div class="emoji-selected">

<div
  id="ticketOpenButtonEmojiPreview"
  class="emoji-selected-icon"
>
${value(
  'ticketOpenButtonEmoji',
)}
</div>

<div>

<div class="ticket-button-editor-title">
Emoji selecionado
</div>

<div
  id="ticketOpenButtonEmojiName"
  class="emoji-selected-text"
>
Clique em um emoji abaixo.
</div>

</div>

</div>

<input
  id="ticketOpenButtonEmojiSearch"
  class="emoji-search"
  placeholder="🔎 Pesquisar emoji..."
/>

</div>

<div
  id="ticketOpenButtonEmojiGrid"
  class="emoji-grid"
>
</div>

<input
  id="ticketOpenButtonEmoji"
  type="hidden"
  value="${value(
    'ticketOpenButtonEmoji',
  )}"
/>

</div>

</div>

<div class="ticket-button-editor">

<div class="ticket-button-editor-title">
❓ BOTÃO AJUDA
</div>

<div class="field">

<label>
Nome do botão
</label>

<input
  id="ticketHowButtonLabel"
  value="${value(
    'ticketHowButtonLabel',
  )}"
/>

</div>

<div class="emoji-editor">

<div class="emoji-editor-head">

<div class="emoji-selected">

<div
  id="ticketHowButtonEmojiPreview"
  class="emoji-selected-icon"
>
${value(
  'ticketHowButtonEmoji',
)}
</div>

<div>

<div class="ticket-button-editor-title">
Emoji selecionado
</div>

<div
  id="ticketHowButtonEmojiName"
  class="emoji-selected-text"
>
Clique em um emoji abaixo.
</div>

</div>

</div>

<input
  id="ticketHowButtonEmojiSearch"
  class="emoji-search"
  placeholder="🔎 Pesquisar emoji..."
/>

</div>

<div
  id="ticketHowButtonEmojiGrid"
  class="emoji-grid"
>
</div>

<input
  id="ticketHowButtonEmoji"
  type="hidden"
  value="${value(
    'ticketHowButtonEmoji',
  )}"
/>

</div>

</div>

<div class="ticket-button-editor">

<div class="ticket-button-editor-title">
💰 BOTÃO FINANCEIRO
</div>

<div class="field">

<label>
Nome do botão
</label>

<input
  id="ticketFinanceButtonLabel"
  value="${value(
    'ticketFinanceButtonLabel',
  )}"
/>

</div>

<div class="emoji-editor">

<div class="emoji-editor-head">

<div class="emoji-selected">

<div
  id="ticketFinanceButtonEmojiPreview"
  class="emoji-selected-icon"
>
${value(
  'ticketFinanceButtonEmoji',
)}
</div>

<div>

<div class="ticket-button-editor-title">
Emoji selecionado
</div>

<div
  id="ticketFinanceButtonEmojiName"
  class="emoji-selected-text"
>
Clique em um emoji abaixo.
</div>

</div>

</div>

<input
  id="ticketFinanceButtonEmojiSearch"
  class="emoji-search"
  placeholder="🔎 Pesquisar emoji..."
/>

</div>

<div
  id="ticketFinanceButtonEmojiGrid"
  class="emoji-grid"
>
</div>

<input
  id="ticketFinanceButtonEmoji"
  type="hidden"
  value="${value(
    'ticketFinanceButtonEmoji',
  )}"
/>

</div>

</div>

</div>

</div>

<div class="actions">

<button
  id="saveTickets"
  class="btn primary"
>
💾 Salvar tickets
</button>

</div>

</section>

<section class="panel">

<div class="panel-head">

<h2>
👁️ Pré-visualização
</h2>

<p>
A prévia acompanha as alterações dos botões e emojis em tempo real.
</p>

</div>

<div class="panel-body">

<div class="preview">

<div class="preview-head">
🤖 Ghost Syndicate
</div>

<div class="preview-body">

<div class="fake-embed">

<div
  id="previewTitle"
  class="fake-title"
>
${value(
  'ticketTitle',
)}
</div>

<div class="fake-heading">
👋 Seja bem-vindo
</div>

<div
  id="previewDescription"
  class="fake-text"
>
${value(
  'ticketDescription',
)}
</div>

<div class="fake-buttons">

<button
  id="previewOpen"
  class="fake-button primary"
>
${value(
  'ticketOpenButtonEmoji',
)}
 ${value(
   'ticketOpenButtonLabel',
 )}
</button>

<button
  id="previewHow"
  class="fake-button"
>
${value(
  'ticketHowButtonEmoji',
)}
 ${value(
   'ticketHowButtonLabel',
 )}
</button>

<button
  id="previewFinance"
  class="fake-button"
>
${value(
  'ticketFinanceButtonEmoji',
)}
 ${value(
   'ticketFinanceButtonLabel',
 )}
</button>

</div>

</div>

</div>

</div>

</div>

</section>

<section
  id="resources"
  class="panel"
>

<div class="panel-head">

<h2>
👥 Cargos e canais
</h2>

<p>
Escolha os recursos diretamente do Discord.
</p>

</div>

<div class="panel-body">

<div class="resources">

<div class="resource-box">

<div class="resource-title">
👥 CARGOS
</div>

<div class="field">

<label>
Dono
</label>

<select id="ownerRoleId">

<option value="">
Selecione...
</option>

</select>

</div>

<br>

<div class="field">

<label>
Administrador
</label>

<select id="adminRoleId">

<option value="">
Selecione...
</option>

</select>

</div>

<br>

<div class="field">

<label>
Recruta
</label>

<select id="recruitRoleId">

<option value="">
Selecione...
</option>

</select>

</div>

<br>

<div class="field">

<label>
Financeiro
</label>

<select id="financeRoleId">

<option value="">
Selecione...
</option>

</select>

</div>

<br>

<div class="field">

<label>
Operações
</label>

<select id="operationsRoleId">

<option value="">
Selecione...
</option>

</select>

</div>

</div>

<div class="resource-box">

<div class="resource-title">
📁 CANAIS
</div>

<div class="field">

<label>
Categoria dos tickets
</label>

<select id="ticketCategoryId">

<option value="">
Selecione...
</option>

</select>

</div>

<br>

<div class="field">

<label>
Canal de transcript
</label>

<select id="transcriptChannelId">

<option value="">
Selecione...
</option>

</select>

</div>

<br>

<div class="field">

<label>
Canal do ranking
</label>

<select id="rankingChannelId">

<option value="">
Selecione...
</option>

</select>

</div>

<br>

<button
  id="refreshResources"
  class="btn"
>
↻ Atualizar recursos
</button>

</div>

</div>

</div>

<div class="actions">

<button
  id="saveResources"
  class="btn primary"
>
💾 Salvar cargos e canais
</button>

</div>

</section>

<section
  id="ranking"
  class="panel"
>

<div class="panel-head">

<h2>
🎙️ Ranking
</h2>

<p>
Personalize o ranking de voz.
</p>

</div>

<div class="panel-body">

<div class="switch">

<div>

<div class="switch-title">
Ranking de voz
</div>

<div class="switch-desc">
Ativar o ranking.
</div>

</div>

<label class="toggle">

<input
  id="rankingEnabled"
  type="checkbox"
  ${checked(
    'rankingEnabled',
  )}
/>

<span class="slider"></span>

</label>

</div>

<br>

<div class="grid">

<div class="field full">

<label>
Título
</label>

<input
  id="rankingTitle"
  value="${value(
    'rankingTitle',
  )}"
/>

</div>

<div class="field full">

<label>
Descrição
</label>

<textarea
  id="rankingDescription"
>${value(
  'rankingDescription',
)}</textarea>

</div>

</div>

</div>

<div class="actions">

<button
  id="saveRanking"
  class="btn primary"
>
💾 Salvar ranking
</button>

</div>

</section>

<section
  id="modules"
  class="panel"
>

<div class="panel-head">

<h2>
🧩 Módulos
</h2>

<p>
Controle os módulos do bot.
</p>

</div>

<div class="panel-body">

<div class="grid">

<div class="switch">

<div>

<div class="switch-title">
💰 Financeiro
</div>

<div class="switch-desc">
Sistema financeiro.
</div>

</div>

<label class="toggle">

<input
  id="financeEnabled"
  type="checkbox"
  ${checked(
    'financeEnabled',
  )}
/>

<span class="slider"></span>

</label>

</div>

<div class="switch">

<div>

<div class="switch-title">
🛡️ Moderação
</div>

<div class="switch-desc">
Sistema de moderação.
</div>

</div>

<label class="toggle">

<input
  id="moderationEnabled"
  type="checkbox"
  ${checked(
    'moderationEnabled',
  )}
/>

<span class="slider"></span>

</label>

</div>

</div>

</div>

<div class="actions">

<button
  id="saveModules"
  class="btn primary"
>
💾 Salvar módulos
</button>

<button
  id="resetAll"
  class="btn danger"
>
↩ Restaurar padrão
</button>

</div>

</section>

</main>

</div>

<div
  id="toast"
  class="toast"
></div>

<script>

const EMOJI_OPTIONS =
  ${emojiJson};

const FIELD_IDS = [

  'serverName',
  'brandName',
  'primaryColor',
  'secondaryColor',
  'footerText',

  'ticketsEnabled',

  'ticketTitle',
  'ticketDescription',
  'ticketWelcomeText',

  'ticketOpenButtonLabel',
  'ticketOpenButtonEmoji',

  'ticketHowButtonLabel',
  'ticketHowButtonEmoji',

  'ticketFinanceButtonLabel',
  'ticketFinanceButtonEmoji',

  'ownerRoleId',
  'adminRoleId',
  'recruitRoleId',
  'financeRoleId',
  'operationsRoleId',

  'ticketCategoryId',
  'transcriptChannelId',
  'rankingChannelId',

  'rankingEnabled',
  'rankingTitle',
  'rankingDescription',

  'financeEnabled',
  'moderationEnabled',

];

function byId(
  id,
) {

  return document.getElementById(
    id,
  );

}

function fieldValue(
  id,
) {

  const element =
    byId(id);

  if (
    !element
  ) {

    return '';

  }

  if (
    element.type ===
    'checkbox'
  ) {

    return Boolean(
      element.checked,
    );

  }

  return element.value ??
    '';

}

function showToast(
  message,
  isError = false,
) {

  const toast =
    byId(
      'toast',
    );

  toast.textContent =
    message;

  toast.className =
    isError
      ? 'toast show error'
      : 'toast show';

  window.setTimeout(
    function () {

      toast.className =
        'toast';

    },
    2800,
  );

}

function collectFields() {

  const result = {};

  for (
    const id of FIELD_IDS
  ) {

    result[id] =
      fieldValue(id);

  }

  return result;

}

function updateOverview() {

  byId(
    'overviewServer',
  ).textContent =
    String(
      fieldValue(
        'serverName',
      ),
    );

  byId(
    'overviewTickets',
  ).textContent =
    fieldValue(
      'ticketsEnabled',
    )
      ? 'Ativado'
      : 'Desativado';

  byId(
    'overviewRanking',
  ).textContent =
    fieldValue(
      'rankingEnabled',
    )
      ? 'Ativado'
      : 'Desativado';

}

function updatePreview() {

  byId(
    'previewTitle',
  ).textContent =
    fieldValue(
      'ticketTitle',
    );

  byId(
    'previewDescription',
  ).textContent =
    fieldValue(
      'ticketDescription',
    );

  byId(
    'previewOpen',
  ).textContent =
    (
      fieldValue(
        'ticketOpenButtonEmoji',
      ) +
      ' ' +
      fieldValue(
        'ticketOpenButtonLabel',
      )
    ).trim();

  byId(
    'previewHow',
  ).textContent =
    (
      fieldValue(
        'ticketHowButtonEmoji',
      ) +
      ' ' +
      fieldValue(
        'ticketHowButtonLabel',
      )
    ).trim();

  byId(
    'previewFinance',
  ).textContent =
    (
      fieldValue(
        'ticketFinanceButtonEmoji',
      ) +
      ' ' +
      fieldValue(
        'ticketFinanceButtonLabel',
      )
    ).trim();

}

function applyConfig(
  config,
) {

  if (
    !config
  ) {

    return;

  }

  for (
    const id of FIELD_IDS
  ) {

    const element =
      byId(id);

    if (
      !element ||
      config[id] ===
        undefined
    ) {

      continue;

    }

    if (
      element.type ===
      'checkbox'
    ) {

      element.checked =
        Boolean(
          config[id],
        );

    } else {

      element.value =
        config[id] ??
        '';

    }

  }

  updateOverview();

  updatePreview();

  refreshAllEmojiPickers();

}

async function loadConfig() {

  try {

    const response =
      await fetch(
        '/api/admin/config',
        {
          cache:
            'no-store',
        },
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.success
    ) {

      throw new Error(
        data.error ||
          'Não foi possível carregar.',
      );

    }

    applyConfig(
      data.config,
    );

  } catch (
    error
  ) {

    console.error(
      '[ADMIN LOAD]',
      error,
    );

    showToast(
      error?.message ||
        'Falha ao carregar.',
      true,
    );

  }

}

async function saveConfig(
  extra = {},
) {

  try {

    const payload = {
      ...collectFields(),
      ...extra,
    };

    const response =
      await fetch(
        '/api/admin/config',
        {
          method:
            'PUT',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify(
              payload,
            ),

          cache:
            'no-store',
        },
      );

    const data =
      await response.json();

    if (
      !response.ok ||
      !data.success
    ) {

      throw new Error(
        data.error ||
          'Não foi possível salvar.',
      );

    }

    applyConfig(
      data.config,
    );

    showToast(
      '✓ Configurações salvas com sucesso.',
    );

  } catch (
    error
  ) {

    console.error(
      '[ADMIN SAVE]',
      error,
    );

    showToast(
      error?.message ||
        'Falha ao salvar.',
      true,
    );

  }

}

/* =========================================================
   EMOJI PICKER
========================================================= */

const emojiPickers = [

  {
    field:
      'ticketOpenButtonEmoji',

    grid:
      'ticketOpenButtonEmojiGrid',

    preview:
      'ticketOpenButtonEmojiPreview',

    name:
      'ticketOpenButtonEmojiName',

    search:
      'ticketOpenButtonEmojiSearch',
  },

  {
    field:
      'ticketHowButtonEmoji',

    grid:
      'ticketHowButtonEmojiGrid',

    preview:
      'ticketHowButtonEmojiPreview',

    name:
      'ticketHowButtonEmojiName',

    search:
      'ticketHowButtonEmojiSearch',
  },

  {
    field:
      'ticketFinanceButtonEmoji',

    grid:
      'ticketFinanceButtonEmojiGrid',

    preview:
      'ticketFinanceButtonEmojiPreview',

    name:
      'ticketFinanceButtonEmojiName',

    search:
      'ticketFinanceButtonEmojiSearch',
  },

];

function renderEmojiPicker(
  picker,
) {

  const grid =
    byId(
      picker.grid,
    );

  const search =
    byId(
      picker.search,
    );

  const selected =
    fieldValue(
      picker.field,
    );

  const query =
    (
      search?.value ??
      ''
    )
      .trim()
      .toLowerCase();

  const filtered =
    EMOJI_OPTIONS.filter(
      function (
        emoji,
      ) {

        return (
          !query ||
          emoji.includes(
            query,
          )
        );

      },
    );

  grid.innerHTML =
    '';

  for (
    const emoji of filtered
  ) {

    const button =
      document.createElement(
        'button',
      );

    button.type =
      'button';

    button.className =
      'emoji-option' +
      (
        emoji ===
        selected
          ? ' selected'
          : ''
      );

    button.textContent =
      emoji;

    button.title =
      'Selecionar ' +
      emoji;

    button.addEventListener(
      'click',
      function () {

        const input =
          byId(
            picker.field,
          );

        input.value =
          emoji;

        const preview =
          byId(
            picker.preview,
          );

        preview.textContent =
          emoji;

        const name =
          byId(
            picker.name,
          );

        name.textContent =
          'Emoji selecionado: ' +
          emoji;

        renderEmojiPicker(
          picker,
        );

        updatePreview();

      },
    );

    grid.appendChild(
      button,
    );

  }

}

function refreshAllEmojiPickers() {

  for (
    const picker of emojiPickers
  ) {

    renderEmojiPicker(
      picker,
    );

  }

}

for (
  const picker of emojiPickers
) {

  byId(
    picker.search,
  )?.addEventListener(
    'input',
    function () {

      renderEmojiPicker(
        picker,
      );

    },
  );

}

/* =========================================================
   DISCORD RESOURCES
========================================================= */

function fillSelect(
  id,
  items,
  selectedId,
  formatter,
) {

  const select =
    byId(id);

  if (
    !select
  ) {

    return;

  }

  select.innerHTML =
    '';

  const empty =
    document.createElement(
      'option',
    );

  empty.value =
    '';

  empty.textContent =
    'Selecione...';

  select.appendChild(
    empty,
  );

  for (
    const item of items
  ) {

    const option =
      document.createElement(
        'option',
      );

    option.value =
      item.id;

    option.textContent =
      formatter(
        item,
      );

    option.selected =
      item.id ===
      selectedId;

    select.appendChild(
      option,
    );

  }

}

async function loadResources() {

  try {

    const response =
      await fetch(
        '/api/admin/discord-resources',
        {
          cache:
            'no-store',
        },
      );

    const data =
      await response.json();

    if (
      response.status ===
      429
    ) {

      throw new Error(
        data.error ||
          'Discord está limitando consultas. Aguarde alguns segundos.',
      );

    }

    if (
      !response.ok ||
      !data.success
    ) {

      throw new Error(
        data.error ||
          'Não foi possível carregar os recursos.',
      );

    }

    const roles =
      Array.isArray(
        data.roles,
      )
        ? data.roles
        : [];

    const channels =
      Array.isArray(
        data.channels,
      )
        ? data.channels
        : [];

    const categories =
      channels.filter(
        function (
          channel,
        ) {

          return (
            channel.type ===
            4
          );

        },
      );

    const textChannels =
      channels.filter(
        function (
          channel,
        ) {

          return (
            channel.type ===
              0 ||
            channel.type ===
              5
          );

        },
      );

    fillSelect(
      'ownerRoleId',
      roles,
      fieldValue(
        'ownerRoleId',
      ),
      function (
        role,
      ) {

        return '@' +
          role.name;

      },
    );

    fillSelect(
      'adminRoleId',
      roles,
      fieldValue(
        'adminRoleId',
      ),
      function (
        role,
      ) {

        return '@' +
          role.name;

      },
    );

    fillSelect(
      'recruitRoleId',
      roles,
      fieldValue(
        'recruitRoleId',
      ),
      function (
        role,
      ) {

        return '@' +
          role.name;

      },
    );

    fillSelect(
      'financeRoleId',
      roles,
      fieldValue(
        'financeRoleId',
      ),
      function (
        role,
      ) {

        return '@' +
          role.name;

      },
    );

    fillSelect(
      'operationsRoleId',
      roles,
      fieldValue(
        'operationsRoleId',
      ),
      function (
        role,
      ) {

        return '@' +
          role.name;

      },
    );

    fillSelect(
      'ticketCategoryId',
      categories,
      fieldValue(
        'ticketCategoryId',
      ),
      function (
        channel,
      ) {

        return '📂 ' +
          channel.name;

      },
    );

    fillSelect(
      'transcriptChannelId',
      textChannels,
      fieldValue(
        'transcriptChannelId',
      ),
      function (
        channel,
      ) {

        return '# ' +
          channel.name;

      },
    );

    fillSelect(
      'rankingChannelId',
      textChannels,
      fieldValue(
        'rankingChannelId',
      ),
      function (
        channel,
      ) {

        return '# ' +
          channel.name;

      },
    );

    showToast(
      '✓ Recursos do Discord atualizados.',
    );

  } catch (
    error
  ) {

    console.error(
      '[ADMIN RESOURCES]',
      error,
    );

    showToast(
      error?.message ||
        'Falha ao consultar o Discord.',
      true,
    );

  }

}

/* =========================================================
   NAVEGAÇÃO
========================================================= */

document
  .querySelectorAll(
    '[data-target]',
  )
  .forEach(
    function (
      button,
    ) {

      button.addEventListener(
        'click',
        function () {

          const target =
            button.getAttribute(
              'data-target',
            );

          if (
            target
          ) {

            document
              .getElementById(
                target,
              )
              ?.scrollIntoView({
                behavior:
                  'smooth',

                block:
                  'start',
              });

          }

          document
            .querySelectorAll(
              '[data-target]',
            )
            .forEach(
              function (
                item,
              ) {

                item.classList.toggle(
                  'active',
                  item ===
                    button,
                );

              },
            );

        },
      );

    },
  );

/* =========================================================
   CAMPOS
========================================================= */

for (
  const id of FIELD_IDS
) {

  const element =
    byId(id);

  if (
    !element
  ) {

    continue;

  }

  element.addEventListener(
    'input',
    function () {

      updatePreview();

      updateOverview();

    },
  );

  element.addEventListener(
    'change',
    function () {

      updatePreview();

      updateOverview();

    },
  );

}

/* =========================================================
   BOTÕES
========================================================= */

byId(
  'saveAll',
).addEventListener(
  'click',
  function () {

    void saveConfig();

  },
);

byId(
  'saveAppearance',
).addEventListener(
  'click',
  function () {

    void saveConfig();

  },
);

byId(
  'saveTickets',
).addEventListener(
  'click',
  function () {

    void saveConfig({

      ticketsEnabled:
        fieldValue(
          'ticketsEnabled',
        ),

      ticketTitle:
        fieldValue(
          'ticketTitle',
        ),

      ticketDescription:
        fieldValue(
          'ticketDescription',
        ),

      ticketWelcomeText:
        fieldValue(
          'ticketWelcomeText',
        ),

      ticketOpenButtonLabel:
        fieldValue(
          'ticketOpenButtonLabel',
        ),

      ticketOpenButtonEmoji:
        fieldValue(
          'ticketOpenButtonEmoji',
        ),

      ticketHowButtonLabel:
        fieldValue(
          'ticketHowButtonLabel',
        ),

      ticketHowButtonEmoji:
        fieldValue(
          'ticketHowButtonEmoji',
        ),

      ticketFinanceButtonLabel:
        fieldValue(
          'ticketFinanceButtonLabel',
        ),

      ticketFinanceButtonEmoji:
        fieldValue(
          'ticketFinanceButtonEmoji',
        ),

    });

  },
);

byId(
  'saveResources',
).addEventListener(
  'click',
  function () {

    void saveConfig({

      ownerRoleId:
        fieldValue(
          'ownerRoleId',
        ),

      adminRoleId:
        fieldValue(
          'adminRoleId',
        ),

      recruitRoleId:
        fieldValue(
          'recruitRoleId',
        ),

      financeRoleId:
        fieldValue(
          'financeRoleId',
        ),

      operationsRoleId:
        fieldValue(
          'operationsRoleId',
        ),

      ticketCategoryId:
        fieldValue(
          'ticketCategoryId',
        ),

      transcriptChannelId:
        fieldValue(
          'transcriptChannelId',
        ),

      rankingChannelId:
        fieldValue(
          'rankingChannelId',
        ),

    });

  },
);

byId(
  'saveRanking',
).addEventListener(
  'click',
  function () {

    void saveConfig({

      rankingEnabled:
        fieldValue(
          'rankingEnabled',
        ),

      rankingTitle:
        fieldValue(
          'rankingTitle',
        ),

      rankingDescription:
        fieldValue(
          'rankingDescription',
        ),

      rankingChannelId:
        fieldValue(
          'rankingChannelId',
        ),

    });

  },
);

byId(
  'saveModules',
).addEventListener(
  'click',
  function () {

    void saveConfig({

      financeEnabled:
        fieldValue(
          'financeEnabled',
        ),

      moderationEnabled:
        fieldValue(
          'moderationEnabled',
        ),

    });

  },
);

byId(
  'refreshResources',
).addEventListener(
  'click',
  function () {

    void loadResources();

  },
);

byId(
  'resetAll',
).addEventListener(
  'click',
  function () {

    const confirmed =
      window.confirm(
        'Restaurar todas as configurações para o padrão?',
      );

    if (
      !confirmed
    ) {

      return;

    }

    void fetch(
      '/api/admin/config/reset',
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/json',
        },
      },
    )
      .then(
        function (
          response,
        ) {

          return response.json();

        },
      )
      .then(
        function (
          data,
        ) {

          if (
            !data.success
          ) {

            throw new Error(
              data.error ||
                'Falha ao restaurar.',
            );

          }

          applyConfig(
            data.config,
          );

          void loadResources();

          showToast(
            '✓ Configuração restaurada.',
          );

        },
      )
      .catch(
        function (
          error,
        ) {

          console.error(
            '[ADMIN RESET]',
            error,
          );

          showToast(
            error?.message ||
              'Falha ao restaurar.',
            true,
          );

        },
      );

  },
);

/* =========================================================
   BOOT
========================================================= */

async function boot() {

  await loadConfig();

  refreshAllEmojiPickers();

  /*
   * Consulta o Discord somente para preencher
   * cargos e canais.
   */

  await loadResources();

}

void boot();

</script>

</body>

</html>
`;
}

/* =========================================================
   ROTAS
========================================================= */

export function registerAdminRoutes(
  app: Express,
  db: PrismaClient,
  guildId: string,
): void {

  const ctx: AdminContext = {
    db,
    guildId,
  };

  /* =======================================================
     ADMIN PAGE
  ======================================================= */

  app.get(
    '/admin',
    async (
      _req: Request,
      res: Response,
    ) => {

      try {

        const config =
          await ensureConfig(
            ctx,
          );

        res
          .type(
            'html',
          )
          .send(
            createAdminPage(
              config as unknown as Record<
                string,
                unknown
              >,
            ),
          );

      } catch (
        error
      ) {

        console.error(
          '[ADMIN] PAGE',
          error,
        );

        res
          .status(500)
          .type(
            'html',
          )
          .send(
            `
<!doctype html>

<html lang="pt-BR">

<head>

<meta charset="utf-8">

<title>
Ghost Syndicate • Erro
</title>

<style>

body {

  margin: 0;

  min-height: 100vh;

  display: grid;

  place-items: center;

  background:
    #030806;

  color:
    #effff5;

  font-family:
    system-ui,
    sans-serif;

}

main {

  width:
    min(
      540px,
      90vw
    );

  padding:
    30px;

  border:
    1px solid
    rgba(
      67,
      255,
      152,
      .18
    );

  border-radius:
    20px;

  background:
    #07100a;

}

h1 {
  color:
    #43ff98;
}

p {
  color:
    #789383;
}

</style>

</head>

<body>

<main>

<h1>
⚠️ Painel indisponível
</h1>

<p>
Não foi possível carregar o painel administrativo.
</p>

</main>

</body>

</html>
            `,
          );

      }

    },
  );

  /* =======================================================
     CONFIG GET
  ======================================================= */

  app.get(
    '/api/admin/config',
    async (
      _req: Request,
      res: Response,
    ) => {

      await getConfig(
        ctx,
        res,
      );

    },
  );

  /* =======================================================
     CONFIG UPDATE
  ======================================================= */

  app.put(
    '/api/admin/config',
    async (
      req: Request,
      res: Response,
    ) => {

      await updateConfig(
        ctx,
        req,
        res,
      );

    },
  );

  /* =======================================================
     RESET
  ======================================================= */

  app.post(
    '/api/admin/config/reset',
    async (
      _req: Request,
      res: Response,
    ) => {

      await resetConfig(
        ctx,
        res,
      );

    },
  );

  /* =======================================================
     DISCORD RESOURCES
     CONSULTA SEPARADA
  ======================================================= */

  app.get(
    '/api/admin/discord-resources',
    async (
      _req: Request,
      res: Response,
    ) => {

      try {

        const resources =
          await getDiscordResources(
            guildId,
          );

        res.json({
          success:
            true,

          roles:
            resources.roles,

          channels:
            resources.channels,
        });

      } catch (
        error
      ) {

        console.error(
          '[ADMIN] DISCORD RESOURCES',
          error,
        );

        const message =
          error instanceof Error
            ? error.message
            : 'Erro desconhecido.';

        if (
          message.startsWith(
            'RATE_LIMIT:',
          )
        ) {

          const retryAfter =
            Number(
              message.split(
                ':',
              )[1],
            ) || 30;

          res
            .status(429)
            .json({
              success:
                false,

              retryAfter,

              error:
                'Discord está limitando as consultas. Aguarde ' +
                retryAfter +
                ' segundos e tente novamente.',
            });

          return;
        }

        res
          .status(500)
          .json({
            success:
              false,

            error:
              'Não foi possível consultar os recursos do Discord.',
          });

      }

    },
  );

  console.log(
    '⚙️ [WEB] Painel administrativo registrado em /admin',
  );
}
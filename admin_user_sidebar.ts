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
   ADMIN UI • MULTI-PAGE
   Cada item do menu possui uma URL própria.
========================================================= */

function createAdminPage(
  config: Record<string, unknown>,
  activePage: string,
): string {
  const esc = (key: string) => escapeHtml(config[key] ?? '');
  const checked = (key: string) => config[key] ? 'checked' : '';
  const emojiJson = JSON.stringify(EMOJIS)
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026');

  const pages = [
    ['overview', '/admin', '🏠', 'Dashboard'],
    ['appearance', '/admin/aparencia', '🎨', 'Aparência'],
    ['tickets', '/admin/tickets', '🎫', 'Tickets'],
    ['resources', '/admin/cargos', '👥', 'Cargos e canais'],
    ['ranking', '/admin/ranking', '🏆', 'Ranking'],
    ['modules', '/admin/modulos', '🧩', 'Módulos'],
    ['finance', '/admin/financeiro', '💰', 'Financeiro'],
    ['transcripts', '/admin/transcripts', '📜', 'Transcripts'],
  ] as const;

  const nav = pages.map(([id, href, icon, label]) => `
    <a class="nav-item ${activePage === id ? 'active' : ''}" href="${href}">
      <span class="nav-icon">${icon}</span>
      <span>${label}</span>
    </a>
  `).join('');

  let content = '';

  if (activePage === 'overview') {
    content = `
      <section class="page-head">
        <div>
          <div class="eyebrow">GHOST SYNDICATE</div>
          <h2>Dashboard</h2>
          <p>Visão geral do servidor e dos principais sistemas.</p>
        </div>
        <button id="refreshDashboard" class="btn">↻ Atualizar</button>
      </section>

      <section class="stats-grid">
        <article class="stat-card"><span>Servidor</span><strong id="overviewServer">${esc('serverName')}</strong><small>Nome configurado</small></article>
        <article class="stat-card"><span>Tickets</span><strong id="overviewTickets">${config.ticketsEnabled ? 'Ativado' : 'Desativado'}</strong><small>Sistema de atendimento</small></article>
        <article class="stat-card"><span>Ranking</span><strong id="overviewRanking">${config.rankingEnabled ? 'Ativado' : 'Desativado'}</strong><small>Horas em voz</small></article>
        <article class="stat-card"><span>Financeiro</span><strong>${config.financeEnabled ? 'Ativado' : 'Desativado'}</strong><small>Controle financeiro</small></article>
      </section>

      <section class="two-col">
        <article class="panel">
          <div class="panel-head"><div><strong>⚡ Acesso rápido</strong><span>Abra diretamente o módulo desejado.</span></div></div>
          <div class="quick-grid">
            <a href="/admin/tickets" class="quick-card"><b>🎫 Tickets</b><small>Configurar atendimento</small></a>
            <a href="/admin/financeiro" class="quick-card"><b>💰 Financeiro</b><small>Caixa e movimentações</small></a>
            <a href="/admin/transcripts" class="quick-card"><b>📜 Transcripts</b><small>Histórico de atendimentos</small></a>
            <a href="/admin/cargos" class="quick-card"><b>👥 Cargos e canais</b><small>Permissões e destinos</small></a>
          </div>
        </article>
        <article class="panel">
          <div class="panel-head"><div><strong>🛡️ Sistema</strong><span>Status da administração.</span></div></div>
          <div class="status-stack">
            <div><span class="dot"></span>Banco de dados</div>
            <div><span class="dot"></span>Configuração persistente</div>
            <div><span class="dot"></span>Integração Discord</div>
          </div>
        </article>
      </section>
    `;
  }

  if (activePage === 'appearance') {
    content = `
      <section class="page-head"><div><div class="eyebrow">CONFIGURAÇÃO</div><h2>Aparência</h2><p>Personalize a identidade visual do servidor.</p></div><button id="saveAppearance" class="btn primary">💾 Salvar</button></section>
      <section class="panel form-panel"><div class="form-grid">
        <div class="field"><label>Nome do servidor</label><input id="serverName" value="${esc('serverName')}"></div>
        <div class="field"><label>Nome da marca</label><input id="brandName" value="${esc('brandName')}"></div>
        <div class="field"><label>Cor principal</label><input id="primaryColor" value="${esc('primaryColor')}"></div>
        <div class="field"><label>Cor secundária</label><input id="secondaryColor" value="${esc('secondaryColor')}"></div>
        <div class="field full"><label>Rodapé</label><input id="footerText" value="${esc('footerText')}"></div>
      </div></section>
    `;
  }

  if (activePage === 'tickets') {
    content = `
      <section class="page-head"><div><div class="eyebrow">ATENDIMENTO</div><h2>Tickets</h2><p>Configure a central e os botões do atendimento.</p></div><button id="saveTickets" class="btn primary">💾 Salvar</button></section>
      <section class="panel form-panel"><div class="form-grid">
        <label class="switch full"><span><b>Sistema de tickets</b><small>Permitir abertura de novos atendimentos.</small></span><input id="ticketsEnabled" type="checkbox" ${checked('ticketsEnabled')}><i></i></label>
        <div class="field full"><label>Título da central</label><input id="ticketTitle" value="${esc('ticketTitle')}"></div>
        <div class="field full"><label>Descrição</label><textarea id="ticketDescription" rows="3">${esc('ticketDescription')}</textarea></div>
        <div class="field full"><label>Mensagem de boas-vindas</label><textarea id="ticketWelcomeText" rows="4">${esc('ticketWelcomeText')}</textarea></div>
        <div class="field"><label>Botão principal</label><input id="ticketOpenButtonLabel" value="${esc('ticketOpenButtonLabel')}"></div>
        <div class="field"><label>Emoji principal</label><input id="ticketOpenButtonEmoji" value="${esc('ticketOpenButtonEmoji')}"></div>
        <div class="field"><label>Botão ajuda</label><input id="ticketHowButtonLabel" value="${esc('ticketHowButtonLabel')}"></div>
        <div class="field"><label>Emoji ajuda</label><input id="ticketHowButtonEmoji" value="${esc('ticketHowButtonEmoji')}"></div>
        <div class="field"><label>Botão financeiro</label><input id="ticketFinanceButtonLabel" value="${esc('ticketFinanceButtonLabel')}"></div>
        <div class="field"><label>Emoji financeiro</label><input id="ticketFinanceButtonEmoji" value="${esc('ticketFinanceButtonEmoji')}"></div>
      </div></section>
    `;
  }

  if (activePage === 'resources') {
    content = `
      <section class="page-head"><div><div class="eyebrow">DISCORD</div><h2>Cargos e canais</h2><p>Defina quem pode atuar e para onde cada registro vai.</p></div><div><button id="refreshResources" class="btn">↻ Atualizar</button><button id="saveResources" class="btn primary">💾 Salvar</button></div></section>
      <section class="panel form-panel"><div class="form-grid">
        <div class="field"><label>Dono</label><select id="ownerRoleId"><option value="">Selecione...</option></select></div>
        <div class="field"><label>Administrador</label><select id="adminRoleId"><option value="">Selecione...</option></select></div>
        <div class="field"><label>Recrutador</label><select id="recruitRoleId"><option value="">Selecione...</option></select></div>
        <div class="field"><label>Financeiro</label><select id="financeRoleId"><option value="">Selecione...</option></select></div>
        <div class="field"><label>Operações</label><select id="operationsRoleId"><option value="">Selecione...</option></select></div>
        <div class="field"><label>Categoria dos tickets</label><select id="ticketCategoryId"><option value="">Selecione...</option></select></div>
        <div class="field"><label>Canal de transcript</label><select id="transcriptChannelId"><option value="">Selecione...</option></select></div>
        <div class="field"><label>Canal do ranking</label><select id="rankingChannelId"><option value="">Selecione...</option></select></div>
      </div></section>
    `;
  }

  if (activePage === 'ranking') {
    content = `
      <section class="page-head"><div><div class="eyebrow">RANKING</div><h2>Ranking de voz</h2><p>Personalize o acompanhamento de horas em call.</p></div><button id="saveRanking" class="btn primary">💾 Salvar</button></section>
      <section class="panel form-panel"><div class="form-grid">
        <label class="switch full"><span><b>Ranking de voz</b><small>Ativar acompanhamento das horas.</small></span><input id="rankingEnabled" type="checkbox" ${checked('rankingEnabled')}><i></i></label>
        <div class="field full"><label>Título</label><input id="rankingTitle" value="${esc('rankingTitle')}"></div>
        <div class="field full"><label>Descrição</label><textarea id="rankingDescription" rows="4">${esc('rankingDescription')}</textarea></div>
      </div></section>
    `;
  }

  if (activePage === 'modules') {
    content = `
      <section class="page-head"><div><div class="eyebrow">MÓDULOS</div><h2>Módulos</h2><p>Ligue ou desligue recursos do sistema.</p></div><div><button id="resetAll" class="btn danger">↩ Padrão</button><button id="saveModules" class="btn primary">💾 Salvar</button></div></section>
      <section class="module-grid">
        <label class="module-card"><div><b>💰 Financeiro</b><small>Sistema financeiro.</small></div><input id="financeEnabled" type="checkbox" ${checked('financeEnabled')}><i></i></label>
        <label class="module-card"><div><b>🛡️ Moderação</b><small>Sistema de moderação.</small></div><input id="moderationEnabled" type="checkbox" ${checked('moderationEnabled')}><i></i></label>
      </section>
    `;
  }

  if (activePage === 'finance') {
    content = `
      <section class="page-head"><div><div class="eyebrow">FINANCEIRO DO SERVIDOR</div><h2>Financeiro</h2><p>Todos os registros da Ghost Syndicate.</p></div><button id="financeRefresh" class="btn">↻ Atualizar</button></section>
      <section class="stats-grid stats-5">
        <article class="stat-card"><span>Saldo</span><strong id="financeBalance">—</strong><small>Caixa atual</small></article>
        <article class="stat-card"><span>Entradas</span><strong id="financeIn">—</strong><small>Total</small></article>
        <article class="stat-card"><span>Saídas</span><strong id="financeOut">—</strong><small>Total</small></article>
        <article class="stat-card"><span>Empréstimos ativos</span><strong id="financeLoans">—</strong><small>Em aberto</small></article>
        <article class="stat-card"><span>Registros</span><strong id="financeRecords">—</strong><small>Movimentações + empréstimos</small></article>
      </section>
      <section class="panel table-panel">
        <div class="toolbar"><input id="financeSearch" placeholder="🔎 membro, responsável, motivo..."><select id="financeFilter"><option value="ALL">Todos</option><option value="IN">Entradas</option><option value="OUT">Saídas</option><option value="LOAN">Empréstimos</option></select></div>
        <div class="table-wrap"><table><thead><tr><th>Tipo</th><th>Membro</th><th>Responsável</th><th>Valor / Item</th><th>Data</th></tr></thead><tbody id="financeList"><tr><td colspan="5" class="empty">Carregando...</td></tr></tbody></table></div>
      </section>
    `;
  }

  if (activePage === 'transcripts') {
    content = `
      <section class="page-head"><div><div class="eyebrow">HISTÓRICO</div><h2>Transcripts</h2><p>Arquivos de atendimento salvos no servidor.</p></div><button id="transcriptRefresh" class="btn">↻ Atualizar</button></section>
      <section class="panel table-panel">
        <div class="toolbar"><input id="transcriptSearch" placeholder="🔎 pesquisar ticket ou arquivo..."><span id="transcriptCount" class="toolbar-count">—</span></div>
        <div class="table-wrap"><table><thead><tr><th>Transcript</th><th>Ticket</th><th>Tamanho</th><th>Data</th><th>Ação</th></tr></thead><tbody id="transcriptList"><tr><td colspan="5" class="empty">Carregando...</td></tr></tbody></table></div>
      </section>
    `;
  }

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#07110c">
<title>Ghost Syndicate • ${escapeHtml(pages.find(p => p[0] === activePage)?.[3] ?? 'Painel')}</title>
<style>
:root{color-scheme:dark;--bg:#07100b;--sidebar:#0a130e;--panel:#0d1812;--panel2:#101d16;--line:rgba(67,255,152,.13);--line2:rgba(67,255,152,.28);--green:#43ff98;--text:#edf8f1;--muted:#7f9688;--purple:#8f7cff;--red:#ff6b78}
*{box-sizing:border-box}html,body{margin:0;min-height:100%;background:var(--bg)}body{color:var(--text);font:13px/1.45 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{text-decoration:none;color:inherit}button,input,textarea,select{font:inherit}button{cursor:pointer}
.app{display:grid;grid-template-columns:230px minmax(0,1fr);min-height:100vh}.sidebar{position:sticky;top:0;height:100vh;padding:18px 14px;border-right:1px solid var(--line);background:linear-gradient(180deg,#09130e,#07100b);display:flex;flex-direction:column;gap:16px}.brand{display:flex;align-items:center;gap:10px;padding:4px 6px}.brand-icon{width:42px;height:42px;display:grid;place-items:center;border:1px solid var(--line2);border-radius:13px;background:#08140d;font-size:22px}.brand small{display:block;color:var(--green);font-size:8px;font-weight:950;letter-spacing:.18em}.brand b{display:block;margin-top:2px;font-size:15px}.server{padding:11px 12px;border:1px solid var(--line);border-radius:14px;background:#09130e}.server span{display:block;color:var(--muted);font-size:8px;text-transform:uppercase;letter-spacing:.14em}.server b{display:block;margin-top:4px;font-size:11px}.nav{display:grid;gap:4px}.nav-title{margin:4px 6px 2px;color:#53685b;font-size:8px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.nav-item{display:flex;align-items:center;gap:9px;padding:10px 11px;border:1px solid transparent;border-radius:10px;color:#a8b8af;font-size:11px;font-weight:800}.nav-item:hover{background:rgba(67,255,152,.05);color:#effff4}.nav-item.active{border-color:var(--line2);background:rgba(67,255,152,.08);color:var(--green)}.nav-icon{width:18px;text-align:center}.side-bottom{margin-top:auto;padding:12px;border:1px solid var(--line);border-radius:14px;background:#09130e}.side-bottom b{font-size:11px}.side-bottom small{display:block;margin-top:4px;color:var(--muted);font-size:9px}
.user-card{padding:11px 12px;border:1px solid var(--line);border-radius:14px;background:linear-gradient(145deg,#0b1710,#09120d)}
.user-card-top{display:flex;align-items:center;gap:9px}
.user-avatar{width:36px;height:36px;border-radius:11px;object-fit:cover;background:#102017;border:1px solid var(--line2)}
.user-avatar-fallback{display:grid;place-items:center;font-size:16px}
.user-meta{min-width:0;flex:1}
.user-name{display:block;overflow:hidden;font-size:10px;font-weight:900;text-overflow:ellipsis;white-space:nowrap}
.user-role{display:inline-flex;align-items:center;gap:4px;margin-top:4px;padding:3px 6px;border-radius:7px;background:rgba(67,255,152,.06);border:1px solid var(--line);color:var(--green);font-size:7px;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
.user-greeting{margin-top:8px;color:#9fb5a6;font-size:9px;line-height:1.4}
.logout-link{display:block;margin-top:9px;color:#71887a;font-size:8px;font-weight:800}
.logout-link:hover{color:#ff9da7}
.top-user{display:flex;align-items:center;gap:9px}
.top-user-avatar{width:30px;height:30px;border-radius:9px;object-fit:cover;border:1px solid var(--line)}
.top-user-text{display:grid;gap:1px}
.top-user-greeting{font-size:9px;color:var(--muted)}
.top-user-name{font-size:10px;font-weight:900}

.main{min-width:0;padding:18px 22px 40px}.topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.crumb{color:var(--muted);font-size:9px}.system-pill{padding:6px 9px;border:1px solid var(--line);border-radius:999px;color:#9db1a4;font-size:9px}.page-head{display:flex;justify-content:space-between;align-items:flex-end;gap:15px;margin-bottom:13px}.page-head h2{margin:2px 0 0;font-size:22px;letter-spacing:-.045em}.page-head p{margin:4px 0 0;color:var(--muted);font-size:10px}.eyebrow{color:var(--green);font-size:8px;font-weight:950;letter-spacing:.18em}.btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:36px;padding:0 12px;border:1px solid var(--line);border-radius:10px;background:#09130e;color:#d9efe1;font-size:10px;font-weight:900}.btn:hover{border-color:var(--line2);background:#0d1a13}.btn.primary{background:rgba(67,255,152,.09);color:var(--green);border-color:var(--line2)}.btn.danger{color:#ff9da7;border-color:rgba(255,107,120,.2)}
.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}.stats-5{grid-template-columns:repeat(5,minmax(0,1fr))}.stat-card{padding:15px;border:1px solid var(--line);border-radius:14px;background:linear-gradient(145deg,#0c1711,#09110d)}.stat-card span{display:block;color:#6e8477;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.11em}.stat-card strong{display:block;margin-top:7px;color:var(--green);font-size:19px;letter-spacing:-.03em}.stat-card small{display:block;margin-top:3px;color:var(--muted);font-size:8px}
.two-col{display:grid;grid-template-columns:1.2fr .8fr;gap:12px}.panel{overflow:hidden;border:1px solid var(--line);border-radius:15px;background:var(--panel)}.panel-head{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid var(--line);background:rgba(255,255,255,.01)}.panel-head strong{display:block;font-size:11px}.panel-head span{display:block;margin-top:2px;color:var(--muted);font-size:8px}.quick-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;padding:12px}.quick-card{padding:13px;border:1px solid var(--line);border-radius:12px;background:#0a140e}.quick-card:hover{border-color:var(--line2);transform:translateY(-1px)}.quick-card b{display:block;font-size:10px}.quick-card small{display:block;margin-top:4px;color:var(--muted);font-size:8px}.status-stack{padding:14px;display:grid;gap:10px;color:#bed1c5;font-size:10px}.dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin-right:7px;background:var(--green);box-shadow:0 0 10px rgba(67,255,152,.45)}
.form-panel{padding:16px}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.field{display:grid;gap:5px}.field.full{grid-column:1/-1}.field label{color:#8ca497;font-size:8px;font-weight:900;text-transform:uppercase;letter-spacing:.12em}.field input,.field textarea,.field select,.toolbar input,.toolbar select{width:100%;border:1px solid var(--line);border-radius:10px;background:#08110c;color:var(--text);outline:none;padding:10px 11px}.field input,.field select{height:38px}.field textarea{resize:vertical}.field input:focus,.field textarea:focus,.field select:focus,.toolbar input:focus,.toolbar select:focus{border-color:var(--line2);box-shadow:0 0 0 3px rgba(67,255,152,.04)}.switch,.module-card{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:13px;border:1px solid var(--line);border-radius:12px;background:#09140e}.switch input,.module-card input{display:none}.switch i,.module-card i{width:42px;height:22px;border-radius:99px;background:#17241b;border:1px solid var(--line);position:relative}.switch i:after,.module-card i:after{content:"";position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#789082;transition:.15s}.switch input:checked+i,.module-card input:checked+i{background:rgba(67,255,152,.14);border-color:var(--line2)}.switch input:checked+i:after,.module-card input:checked+i:after{left:22px;background:var(--green);box-shadow:0 0 10px rgba(67,255,152,.45)}.switch b,.module-card b{display:block;font-size:10px}.switch small,.module-card small{display:block;margin-top:3px;color:var(--muted);font-size:8px}.module-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.module-card{min-height:80px}
.table-panel{padding-bottom:4px}.toolbar{display:flex;gap:8px;padding:12px}.toolbar input{flex:1}.toolbar select{max-width:180px}.toolbar-count{display:flex;align-items:center;color:var(--muted);font-size:9px;padding:0 5px}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:680px}th,td{padding:11px 13px;text-align:left;border-top:1px solid rgba(255,255,255,.035);font-size:9px}th{color:#63786b;font-size:8px;text-transform:uppercase;letter-spacing:.1em;background:rgba(255,255,255,.01)}td{color:#d7e8dc}.muted{color:var(--muted)}.badge{display:inline-flex;padding:4px 7px;border-radius:7px;border:1px solid var(--line);color:var(--green);font-size:8px;font-weight:900;text-transform:uppercase}.badge.loan{color:#b9adff;border-color:rgba(143,124,255,.22);background:rgba(143,124,255,.07)}.badge.out{color:#ffafb7;border-color:rgba(255,107,120,.2);background:rgba(255,107,120,.06)}.action-link{color:var(--green);font-weight:900}.empty{text-align:center!important;color:var(--muted)!important;padding:30px!important}.toast{position:fixed;right:20px;bottom:20px;display:none;padding:10px 13px;border:1px solid var(--line2);border-radius:11px;background:#0b1710;color:#ccead7;font-size:10px;box-shadow:0 15px 40px rgba(0,0,0,.4)}.toast.show{display:block}.toast.error{color:#ffb7be;border-color:rgba(255,107,120,.3)}
@media(max-width:1000px){.app{grid-template-columns:190px 1fr}.stats-grid,.stats-5{grid-template-columns:repeat(2,minmax(0,1fr))}.two-col,.module-grid{grid-template-columns:1fr}}
@media(max-width:700px){.app{display:block}.sidebar{position:static;height:auto;border-right:0;border-bottom:1px solid var(--line)}.nav{grid-template-columns:repeat(2,1fr)}.main{padding:15px}.form-grid{grid-template-columns:1fr}.field.full{grid-column:auto}.page-head{align-items:flex-start;flex-direction:column}.stats-grid,.stats-5,.quick-grid{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="app">
<aside class="sidebar">
  <div class="brand"><div class="brand-icon">👻</div><div><small>GHOST SYNDICATE</small><b>Painel Administrativo</b></div></div>
  <div class="server"><span>Servidor</span><b>${esc('serverName')}</b></div>

  <div class="user-card">
    <div class="user-card-top">
      <div id="adminAvatar" class="user-avatar user-avatar-fallback">👤</div>
      <div class="user-meta">
        <span id="adminName" class="user-name">Carregando...</span>
        <span id="adminRole" class="user-role">VERIFICANDO</span>
      </div>
    </div>
    <div id="adminGreeting" class="user-greeting">Olá!</div>
    <a class="logout-link" href="/auth/logout">↪ Sair da conta</a>
  </div>

  <div class="nav-title">GERAL</div>
  <nav class="nav">${nav}</nav>
  <div class="side-bottom"><b><span class="dot"></span>Sistema online</b><small>Configurações salvas no banco.</small></div>
</aside>
<main class="main">
  <div class="topbar">
    <span class="crumb">Ghost Syndicate / Administração</span>
    <div class="top-user">
      <div class="top-user-text">
        <span id="topGreeting" class="top-user-greeting">Olá!</span>
        <span id="topUserName" class="top-user-name">Administrador</span>
      </div>
      <div id="topAvatar" class="top-user-avatar user-avatar-fallback">👤</div>
      <span class="system-pill">● Persistente</span>
    </div>
  </div>
  ${content}
</main>
</div>
<div id="toast" class="toast"></div>
<script>
const EMOJI_OPTIONS=${emojiJson};
const FIELD_IDS=['serverName','brandName','primaryColor','secondaryColor','footerText','ticketsEnabled','ticketTitle','ticketDescription','ticketWelcomeText','ticketOpenButtonLabel','ticketOpenButtonEmoji','ticketHowButtonLabel','ticketHowButtonEmoji','ticketFinanceButtonLabel','ticketFinanceButtonEmoji','ownerRoleId','adminRoleId','recruitRoleId','financeRoleId','operationsRoleId','ticketCategoryId','transcriptChannelId','rankingChannelId','rankingEnabled','rankingTitle','rankingDescription','financeEnabled','moderationEnabled'];
const ACTIVE_PAGE=${JSON.stringify(activePage)};
function byId(id){return document.getElementById(id)}
function getGreeting(date=new Date()){
  const hour=date.getHours();
  if(hour>=6 && hour<12)return 'Bom dia';
  if(hour>=12 && hour<18)return 'Boa tarde';
  return 'Boa noite';
}
function escapeText(value){return String(value??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}
async function loadAdminUser(){
  try{
    const r=await fetch('/auth/me',{cache:'no-store',credentials:'same-origin'});
    const d=await r.json();
    if(!r.ok||!d.authenticated)throw new Error('Sessão não encontrada.');
    const greeting=getGreeting();
    const name=d.displayName||d.username||'Administrador';
    const role=(d.role==='owner'?'DONO':'ADMINISTRADOR');
    const avatar=d.avatarUrl||'';
    const avatarHtml=avatar
      ? '<img src="'+avatar.replaceAll('"','&quot;')+'" alt="" class="user-avatar">'
      : '<div class="user-avatar user-avatar-fallback">👤</div>';
    const topAvatar=byId('topAvatar');
    if(topAvatar)topAvatar.outerHTML=avatar
      ? '<img id="topAvatar" src="'+avatar.replaceAll('"','&quot;')+'" alt="" class="top-user-avatar">'
      : '<div id="topAvatar" class="top-user-avatar user-avatar-fallback">👤</div>';
    const sideAvatar=byId('adminAvatar');
    if(sideAvatar)sideAvatar.outerHTML='<img id="adminAvatar" src="'+(avatar?avatar.replaceAll('"','&quot;'):'')+'" alt="" class="user-avatar'+(avatar?'':' user-avatar-fallback')+'">'+(avatar?'':'');
    const nameEl=byId('adminName'); if(nameEl)nameEl.textContent=name;
    const roleEl=byId('adminRole'); if(roleEl){roleEl.textContent=(role==='DONO'?'👑 DONO':'🛡️ ADMIN');}
    const greetEl=byId('adminGreeting'); if(greetEl)greetEl.textContent=greeting+', '+name+'!';
    const topGreet=byId('topGreeting'); if(topGreet)topGreet.textContent=greeting;
    const topName=byId('topUserName'); if(topName)topName.textContent=name;
  }catch(error){
    console.error('[ADMIN USER]',error);
  }
}
function fieldValue(id){const el=byId(id);if(!el)return '';return el.type==='checkbox'?Boolean(el.checked):(el.value??'')}
function showToast(message,error=false){const t=byId('toast');if(!t)return;t.textContent=message;t.className=error?'toast show error':'toast show';window.setTimeout(()=>{t.className='toast'},2600)}
function collectFields(){const o={};for(const id of FIELD_IDS)o[id]=fieldValue(id);return o}
async function loadConfig(){const r=await fetch('/api/admin/config',{cache:'no-store'});const d=await r.json();if(!d.success)throw new Error(d.error||'Falha ao carregar configuração.');const c=d.config||{};for(const id of FIELD_IDS){const el=byId(id);if(!el||c[id]===undefined)continue;if(el.type==='checkbox')el.checked=Boolean(c[id]);else el.value=c[id]??''}}
async function saveConfig(partial={}){const data=Object.keys(partial).length?partial:collectFields();const r=await fetch('/api/admin/config',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const d=await r.json();if(!r.ok||!d.success)throw new Error(d.error||'Falha ao salvar.');showToast('✓ Configuração salva.');return d.config}
function fillSelect(id,items,selected,placeholder){const el=byId(id);if(!el)return;const opts=['<option value="">'+placeholder+'</option>'];for(const item of items){const name=String(item.name).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');opts.push('<option value="'+item.id+'">'+name+'</option>')}el.innerHTML=opts.join('');el.value=selected??''}
async function loadResources(){const r=await fetch('/api/admin/discord-resources',{cache:'no-store'});const d=await r.json();if(!r.ok||!d.success)throw new Error(d.error||'Não foi possível carregar os recursos.');const c=await (await fetch('/api/admin/config',{cache:'no-store'})).json();const cfg=c.config||{};const roles=d.roles||[],channels=d.channels||[];for(const id of ['ownerRoleId','adminRoleId','recruitRoleId','financeRoleId','operationsRoleId'])fillSelect(id,roles,cfg[id],'Selecione...');for(const id of ['ticketCategoryId'])fillSelect(id,channels.filter(x=>x.type===4),cfg[id],'Selecione...');for(const id of ['transcriptChannelId','rankingChannelId'])fillSelect(id,channels.filter(x=>x.type===0||x.type===5),cfg[id],'Selecione...');showToast('✓ Recursos atualizados.')}
function money(v){return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}).format(Number(v)||0)}
function renderFinance(rows){const body=byId('financeList');if(!body)return;if(!rows.length){body.innerHTML='<tr><td colspan="5" class="empty">Nenhum registro encontrado.</td></tr>';return}body.innerHTML=rows.map(r=>{const isLoan=r.kind==='loan';const type=isLoan?'EMPRÉSTIMO':(r.type==='IN'?'ENTRADA':'SAÍDA');const cls=isLoan?'loan':(r.type==='OUT'?'out':'');const val=isLoan?(r.value||r.amountFormatted||'—'):(r.amountFormatted||money(r.amount));return '<tr><td><span class="badge '+cls+'">'+type+'</span></td><td>'+(r.member||'—')+'</td><td class="muted">'+(r.responsible||'Não registrado')+'</td><td>'+val+'</td><td class="muted">'+new Date(r.createdAt).toLocaleString('pt-BR')+'</td></tr>'}).join('')}
async function loadFinance(){const r=await fetch('/api/history?limit=250',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Falha ao carregar financeiro.');const s=d.summary||{};byId('financeBalance').textContent=s.balanceFormatted||money(s.balance);byId('financeIn').textContent=s.totalInFormatted||money(s.totalIn);byId('financeOut').textContent=s.totalOutFormatted||money(s.totalOut);byId('financeLoans').textContent=String(s.activeLoans??0);byId('financeRecords').textContent=String((d.finance||[]).length);const q=(byId('financeSearch')?.value||'').toLowerCase();const f=(byId('financeFilter')?.value||'ALL').toUpperCase();let rows=(d.finance||[]).filter(x=>{const kind=f==='LOAN'?'loan':f==='ALL'?null:'movement';if(kind&&x.kind!==kind)return false;if(f==='IN'&&x.type!=='IN')return false;if(f==='OUT'&&x.type!=='OUT')return false;return [x.member,x.responsible,x.reason,x.type,x.value,x.status].filter(Boolean).join(' ').toLowerCase().includes(q)});renderFinance(rows)}
async function loadTranscripts(){const r=await fetch('/api/transcripts?limit=250',{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Falha ao carregar transcripts.');const q=(byId('transcriptSearch')?.value||'').toLowerCase();const rows=(d.transcripts||[]).filter(x=>[x.filename,x.title,x.ticket].join(' ').toLowerCase().includes(q));byId('transcriptCount').textContent=String(rows.length)+' registros';const body=byId('transcriptList');if(!rows.length){body.innerHTML='<tr><td colspan="5" class="empty">Nenhum transcript encontrado.</td></tr>';return}body.innerHTML=rows.map(x=>'<tr><td><b>'+x.title+'</b></td><td class="muted">'+x.ticket+'</td><td>'+x.sizeFormatted+'</td><td class="muted">'+new Date(x.createdAt).toLocaleString('pt-BR')+'</td><td><a class="action-link" href="'+x.url+'" target="_blank" rel="noopener">Abrir ↗</a></td></tr>').join('')}
async function resetConfig(){const r=await fetch('/api/admin/config/reset',{method:'POST',headers:{'Content-Type':'application/json'}});const d=await r.json();if(!r.ok||!d.success)throw new Error(d.error||'Falha ao restaurar.');await loadConfig();showToast('✓ Configuração restaurada.')}
function wire(){
  byId('saveAppearance')?.addEventListener('click',()=>saveConfig().catch(e=>showToast(e.message,true)));
  byId('saveTickets')?.addEventListener('click',()=>saveConfig({ticketsEnabled:fieldValue('ticketsEnabled'),ticketTitle:fieldValue('ticketTitle'),ticketDescription:fieldValue('ticketDescription'),ticketWelcomeText:fieldValue('ticketWelcomeText'),ticketOpenButtonLabel:fieldValue('ticketOpenButtonLabel'),ticketOpenButtonEmoji:fieldValue('ticketOpenButtonEmoji'),ticketHowButtonLabel:fieldValue('ticketHowButtonLabel'),ticketHowButtonEmoji:fieldValue('ticketHowButtonEmoji'),ticketFinanceButtonLabel:fieldValue('ticketFinanceButtonLabel'),ticketFinanceButtonEmoji:fieldValue('ticketFinanceButtonEmoji')}).catch(e=>showToast(e.message,true)));
  byId('saveResources')?.addEventListener('click',()=>saveConfig({ownerRoleId:fieldValue('ownerRoleId'),adminRoleId:fieldValue('adminRoleId'),recruitRoleId:fieldValue('recruitRoleId'),financeRoleId:fieldValue('financeRoleId'),operationsRoleId:fieldValue('operationsRoleId'),ticketCategoryId:fieldValue('ticketCategoryId'),transcriptChannelId:fieldValue('transcriptChannelId'),rankingChannelId:fieldValue('rankingChannelId')}).catch(e=>showToast(e.message,true)));
  byId('refreshResources')?.addEventListener('click',()=>loadResources().catch(e=>showToast(e.message,true)));
  byId('saveRanking')?.addEventListener('click',()=>saveConfig({rankingEnabled:fieldValue('rankingEnabled'),rankingTitle:fieldValue('rankingTitle'),rankingDescription:fieldValue('rankingDescription')}).catch(e=>showToast(e.message,true)));
  byId('saveModules')?.addEventListener('click',()=>saveConfig({financeEnabled:fieldValue('financeEnabled'),moderationEnabled:fieldValue('moderationEnabled')}).catch(e=>showToast(e.message,true)));
  byId('resetAll')?.addEventListener('click',()=>{if(confirm('Restaurar todas as configurações?'))resetConfig().catch(e=>showToast(e.message,true))});
  byId('financeRefresh')?.addEventListener('click',()=>loadFinance().catch(e=>showToast(e.message,true)));
  byId('financeSearch')?.addEventListener('input',()=>loadFinance().catch(e=>showToast(e.message,true)));
  byId('financeFilter')?.addEventListener('change',()=>loadFinance().catch(e=>showToast(e.message,true)));
  byId('transcriptRefresh')?.addEventListener('click',()=>loadTranscripts().catch(e=>showToast(e.message,true)));
  byId('transcriptSearch')?.addEventListener('input',()=>loadTranscripts().catch(e=>showToast(e.message,true)));
  byId('refreshDashboard')?.addEventListener('click',async()=>{await loadConfig();showToast('✓ Dashboard atualizado.')});
}
(async()=>{try{wire();await Promise.all([loadAdminUser(),loadConfig()]);if(ACTIVE_PAGE==='resources')await loadResources();if(ACTIVE_PAGE==='finance')await loadFinance();if(ACTIVE_PAGE==='transcripts')await loadTranscripts()}catch(e){console.error(e);showToast(e?.message||'Falha ao carregar.',true)}})();
</script>
</body>
</html>`;
}

/* =========================================================
   ROTAS ADMIN
========================================================= */

export function registerAdminRoutes(
  app: Express,
  db: PrismaClient,
  guildId: string,
): void {
  const ctx: AdminContext = { db, guildId };

  const pageRoutes: Array<[string, string]> = [
    ['/admin', 'overview'],
    ['/admin/aparencia', 'appearance'],
    ['/admin/tickets', 'tickets'],
    ['/admin/cargos', 'resources'],
    ['/admin/ranking', 'ranking'],
    ['/admin/modulos', 'modules'],
    ['/admin/financeiro', 'finance'],
    ['/admin/transcripts', 'transcripts'],
  ];

  for (const [route, page] of pageRoutes) {
    app.get(route, async (_req: Request, res: Response) => {
      try {
        const config = await ensureConfig(ctx);
        res.type('html').send(
          createAdminPage(
            config as unknown as Record<string, unknown>,
            page,
          ),
        );
      } catch (error) {
        console.error(`[ADMIN] ${route}`, error);
        res.status(500).type('html').send(`
<!doctype html><html lang="pt-BR"><body style="background:#07100b;color:#fff;font-family:system-ui;padding:40px">
<h2>⚠️ Painel indisponível</h2><p>Não foi possível carregar esta página.</p>
</body></html>`);
      }
    });
  }

  app.get(
    '/api/admin/config',
    async (_req: Request, res: Response) => {
      await getConfig(ctx, res);
    },
  );

  app.put(
    '/api/admin/config',
    async (req: Request, res: Response) => {
      await updateConfig(ctx, req, res);
    },
  );

  app.post(
    '/api/admin/config/reset',
    async (_req: Request, res: Response) => {
      await resetConfig(ctx, res);
    },
  );

  app.get(
    '/api/admin/discord-resources',
    async (_req: Request, res: Response) => {
      try {
        const resources = await getDiscordResources(guildId);
        res.json({
          success: true,
          roles: resources.roles,
          channels: resources.channels,
        });
      } catch (error) {
        console.error('[ADMIN] DISCORD RESOURCES', error);
        const message = error instanceof Error ? error.message : 'Erro desconhecido.';
        if (message.startsWith('RATE_LIMIT:')) {
          const retryAfter = Number(message.split(':')[1]) || 30;
          res.status(429).json({
            success: false,
            retryAfter,
            error: `Discord está limitando as consultas. Aguarde ${retryAfter} segundos e tente novamente.`,
          });
          return;
        }
        res.status(500).json({
          success: false,
          error: 'Não foi possível consultar os recursos do Discord.',
        });
      }
    },
  );

  console.log('⚙️ [WEB] Painel administrativo multi-página registrado em /admin');
}

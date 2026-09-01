import type {
  Express,
  NextFunction,
  Request,
  Response,
} from 'express';
import crypto from 'node:crypto';

/* =========================================================
   GHOST SYNDICATE • AUTENTICAÇÃO DO PAINEL
   - Discord OAuth2
   - sessão assinada em cookie HttpOnly
   - proteção por guild
   - acesso somente ao dono ou cargo ADM
   - sem dependências externas de sessão
========================================================= */

type DiscordUser = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

type DiscordGuildMember = {
  user?: DiscordUser;
  roles?: string[];
  nick?: string | null;
};

type SessionPayload = {
  userId: string;
  exp: number;
};

const AUTH_COOKIE = 'ghost_admin_session';
const OAUTH_STATE_COOKIE = 'ghost_oauth_state';

const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
const OAUTH_STATE_MAX_AGE_SECONDS = 10 * 60;

const DISCORD_API = 'https://discord.com/api/v10';

function env(name: string): string {
  return (
    process.env[name]?.trim() ??
    ''
  );
}

function getClientId(): string {
  const value = env('DISCORD_CLIENT_ID');

  if (!value) {
    throw new Error(
      'DISCORD_CLIENT_ID não configurado no .env.',
    );
  }

  return value;
}

function getClientSecret(): string {
  const value =
    env('DISCORD_CLIENT_SECRET');

  if (!value) {
    throw new Error(
      'DISCORD_CLIENT_SECRET não configurado no .env.',
    );
  }

  return value;
}

function getRedirectUri(): string {
  return (
    env('DISCORD_REDIRECT_URI') ||
    `${env('WEB_PUBLIC_URL') || 'http://localhost:3010'}/auth/discord/callback`
  );
}

function getGuildId(): string {
  const value =
    env('DISCORD_GUILD_ID');

  if (!value) {
    throw new Error(
      'DISCORD_GUILD_ID não configurado no .env.',
    );
  }

  return value;
}

function getSessionSecret(): string {
  const value =
    env('SESSION_SECRET');

  if (!value) {
    throw new Error(
      'SESSION_SECRET não configurado no .env.',
    );
  }

  if (value.length < 32) {
    throw new Error(
      'SESSION_SECRET precisa ter pelo menos 32 caracteres.',
    );
  }

  return value;
}

function getAllowedRoleIds(): string[] {
  return [
    env('ROLE_DONO_DA_FAC_ID'),
    env('ROLE_ADM_ID'),
  ].filter(Boolean);
}

function parseCookies(
  header: string | undefined,
): Record<string, string> {
  if (!header) {
    return {};
  }

  const result: Record<string, string> = {};

  for (const part of header.split(';')) {
    const index = part.indexOf('=');

    if (index <= 0) {
      continue;
    }

    const key =
      decodeURIComponent(
        part.slice(0, index).trim(),
      );

    const value =
      decodeURIComponent(
        part.slice(index + 1).trim(),
      );

    result[key] = value;
  }

  return result;
}

function base64UrlEncode(
  value: string,
): string {
  return Buffer
    .from(value, 'utf8')
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(
  value: string,
): string {
  return Buffer
    .from(
      value
        .replaceAll('-', '+')
        .replaceAll('_', '/')
        .padEnd(
          Math.ceil(value.length / 4) * 4,
          '=',
        ),
      'base64',
    )
    .toString('utf8');
}

function sign(value: string): string {
  return crypto
    .createHmac(
      'sha256',
      getSessionSecret(),
    )
    .update(value)
    .digest('base64url');
}

function constantTimeEqual(
  a: string,
  b: string,
): boolean {
  const left =
    Buffer.from(a);

  const right =
    Buffer.from(b);

  if (
    left.length !== right.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    left,
    right,
  );
}

function createSignedToken(
  payload: SessionPayload,
): string {
  const body =
    base64UrlEncode(
      JSON.stringify(payload),
    );

  return (
    body +
    '.' +
    sign(body)
  );
}

function verifySignedToken(
  token: string,
): SessionPayload | null {
  const separator =
    token.lastIndexOf('.');

  if (separator <= 0) {
    return null;
  }

  const body =
    token.slice(0, separator);

  const signature =
    token.slice(separator + 1);

  const expected =
    sign(body);

  if (
    !constantTimeEqual(
      signature,
      expected,
    )
  ) {
    return null;
  }

  try {
    const payload =
      JSON.parse(
        base64UrlDecode(body),
      ) as SessionPayload;

    if (
      !payload ||
      typeof payload.userId !== 'string' ||
      !payload.userId ||
      typeof payload.exp !== 'number'
    ) {
      return null;
    }

    if (
      payload.exp <=
      Math.floor(
        Date.now() / 1000,
      )
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

function cookieIsSecure(): boolean {
  const publicUrl =
    env('WEB_PUBLIC_URL')
      .toLowerCase();

  return (
    publicUrl.startsWith('https://') ||
    env('NODE_ENV') === 'production'
  );
}

function setCookie(
  res: Response,
  name: string,
  value: string,
  maxAge: number,
): void {
  const parts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${Math.max(0, Math.floor(maxAge))}`,
  ];

  if (cookieIsSecure()) {
    parts.push('Secure');
  }

  res.append(
    'Set-Cookie',
    parts.join('; '),
  );
}

function clearCookie(
  res: Response,
  name: string,
): void {
  const parts = [
    `${encodeURIComponent(name)}=`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0',
  ];

  if (cookieIsSecure()) {
    parts.push('Secure');
  }

  res.append(
    'Set-Cookie',
    parts.join('; '),
  );
}

function randomState(): string {
  return crypto.randomBytes(32).toString('base64url');
}

function redirect(
  res: Response,
  url: string,
): void {
  res.redirect(302, url);
}

function loginPage(
  errorMessage?: string,
): string {
  const escaped =
    String(errorMessage ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ghost Syndicate • Acesso</title>
<style>
:root{
  color-scheme:dark;
  --bg:#030806;
  --panel:#07100a;
  --line:rgba(67,255,152,.16);
  --text:#effff5;
  --muted:#789383;
  --green:#43ff98;
}
*{box-sizing:border-box}
body{
  margin:0;
  min-height:100vh;
  display:grid;
  place-items:center;
  background:
    radial-gradient(circle at 50% 0%,rgba(67,255,152,.08),transparent 38%),
    var(--bg);
  color:var(--text);
  font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
}
main{
  width:min(440px,92vw);
  padding:30px;
  border:1px solid var(--line);
  border-radius:20px;
  background:linear-gradient(180deg,rgba(7,16,10,.98),rgba(4,11,7,.98));
  box-shadow:0 20px 60px rgba(0,0,0,.4);
}
.brand{
  display:flex;
  align-items:center;
  gap:14px;
  margin-bottom:24px;
}
.logo{
  width:50px;
  height:50px;
  display:grid;
  place-items:center;
  border-radius:15px;
  background:#0b1d13;
  border:1px solid var(--line);
  font-size:24px;
}
h1{margin:0 0 6px;font-size:25px}
p{margin:0;color:var(--muted);line-height:1.6}
button{
  width:100%;
  margin-top:24px;
  border:0;
  border-radius:12px;
  padding:13px 16px;
  font-weight:700;
  cursor:pointer;
  color:#041008;
  background:var(--green);
}
.error{
  margin-top:18px;
  padding:11px 12px;
  border-radius:10px;
  color:#ffd9d9;
  background:rgba(255,70,70,.08);
  border:1px solid rgba(255,70,70,.18);
  font-size:13px;
}
.small{
  margin-top:16px;
  font-size:12px;
}
</style>
</head>
<body>
<main>
  <div class="brand">
    <div class="logo">👻</div>
    <div>
      <div style="color:#43ff98;font-size:11px;font-weight:800;letter-spacing:.18em">
        GHOST SYNDICATE
      </div>
      <div style="font-size:13px;color:#9bb7a6">
        Painel Administrativo
      </div>
    </div>
  </div>

  <h1>Entrar no painel</h1>
  <p>
    Use sua conta do Discord para continuar.
    Apenas o dono ou administrador autorizado do servidor pode entrar.
  </p>

  <form method="GET" action="/auth/discord">
    <button type="submit">Entrar com Discord</button>
  </form>

  ${
    escaped
      ? `<div class="error">${escaped}</div>`
      : ''
  }

  <p class="small">
    O acesso é validado diretamente no servidor configurado.
  </p>
</main>
</body>
</html>`;
}

async function discordApi<T>(
  endpoint: string,
  init?: RequestInit,
): Promise<T> {
  const token =
    env('DISCORD_TOKEN');

  if (!token) {
    throw new Error(
      'DISCORD_TOKEN não configurado no .env.',
    );
  }

  const response =
    await fetch(
      DISCORD_API + endpoint,
      {
        ...init,
        headers: {
          Authorization:
            `Bot ${token}`,
          'Content-Type':
            'application/json',
          ...(init?.headers ?? {}),
        },
      },
    );

  if (!response.ok) {
    const body =
      await response.text();

    throw new Error(
      `Discord API ${response.status}: ${body.slice(0, 300)}`,
    );
  }

  return response.json() as Promise<T>;
}

async function exchangeCode(
  code: string,
): Promise<{
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}> {
  const body =
    new URLSearchParams();

  body.set(
    'client_id',
    getClientId(),
  );
  body.set(
    'client_secret',
    getClientSecret(),
  );
  body.set(
    'grant_type',
    'authorization_code',
  );
  body.set(
    'code',
    code,
  );
  body.set(
    'redirect_uri',
    getRedirectUri(),
  );

  const response =
    await fetch(
      `${DISCORD_API}/oauth2/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type':
            'application/x-www-form-urlencoded',
        },
        body,
      },
    );

  if (!response.ok) {
    const text =
      await response.text();

    throw new Error(
      `OAuth2 token exchange falhou: ${response.status} ${text.slice(0, 300)}`,
    );
  }

  return response.json() as Promise<{
    access_token: string;
    token_type: string;
    expires_in: number;
    scope: string;
  }>;
}

async function fetchDiscordUser(
  accessToken: string,
): Promise<DiscordUser> {
  const response =
    await fetch(
      `${DISCORD_API}/users/@me`,
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      },
    );

  if (!response.ok) {
    throw new Error(
      'Não foi possível identificar sua conta do Discord.',
    );
  }

  return response.json() as Promise<DiscordUser>;
}

async function fetchGuildMember(
  userId: string,
): Promise<DiscordGuildMember> {
  return discordApi<DiscordGuildMember>(
    `/guilds/${encodeURIComponent(getGuildId())}/members/${encodeURIComponent(userId)}`,
  );
}

async function validateAdminAccess(
  userId: string,
): Promise<{
  allowed: boolean;
  reason: string;
  member: DiscordGuildMember;
}> {
  const member =
    await fetchGuildMember(
      userId,
    );

  const ownerId =
    env('DISCORD_OWNER_ID');

  if (
    ownerId &&
    userId === ownerId
  ) {
    return {
      allowed: true,
      reason: 'owner',
      member,
    };
  }

  const memberRoles =
    Array.isArray(member.roles)
      ? member.roles
      : [];

  const allowedRoles =
    getAllowedRoleIds();

  const allowedByRole =
    allowedRoles.some(
      (roleId) =>
        memberRoles.includes(
          roleId,
        ),
    );

  if (allowedByRole) {
    return {
      allowed: true,
      reason: 'admin-role',
      member,
    };
  }

  return {
    allowed: false,
    reason:
      'Sua conta pertence ao Discord, mas não possui autorização para administrar este servidor.',
    member,
  };
}

export async function getAuthenticatedAdmin(
  req: Request,
): Promise<{
  userId: string;
  role: 'owner' | 'admin';
  username: string;
  displayName: string;
  avatarUrl: string | null;
} | null> {
  const cookies =
    parseCookies(
      req.headers.cookie,
    );

  const token =
    cookies[AUTH_COOKIE];

  if (!token) {
    return null;
  }

  const payload =
    verifySignedToken(
      token,
    );

  if (!payload) {
    return null;
  }

  try {
    const access =
      await validateAdminAccess(
        payload.userId,
      );

    if (!access.allowed) {
      return null;
    }

    const ownerId =
      env('DISCORD_OWNER_ID');

    const discordUser = access.member.user;
    const username =
      discordUser?.username ||
      access.member.nick ||
      payload.userId;
    const displayName =
      access.member.nick ||
      discordUser?.global_name ||
      discordUser?.username ||
      payload.userId;
    const avatarUrl =
      discordUser?.avatar && discordUser.id
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=64`
        : null;

    return {
      userId:
        payload.userId,
      role:
        ownerId &&
        payload.userId === ownerId
          ? 'owner'
          : 'admin',
      username,
      displayName,
      avatarUrl,
    };
  } catch {
    return null;
  }
}

export function requireAdminAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  void getAuthenticatedAdmin(
    req,
  )
    .then(
      (
        session,
      ) => {
        if (session) {
          (
            req as Request & {
              adminAuth?: typeof session;
            }
          ).adminAuth =
            session;

          next();
          return;
        }

        const acceptsHtml =
          String(
            req.headers.accept ??
              '',
          ).includes(
            'text/html',
          );

        if (acceptsHtml) {
          redirect(
            res,
            '/auth/discord?error=unauthorized',
          );
          return;
        }

        res
          .status(401)
          .json({
            success: false,
            error:
              'Não autorizado.',
          });
      },
    )
    .catch(
      (error) => {
        console.error(
          '[AUTH] middleware:',
          error,
        );

        res
          .status(503)
          .json({
            success: false,
            error:
              'Não foi possível validar sua sessão.',
          });
      },
    );
}

function oauthAuthorizeUrl(
  state: string,
): string {
  const query =
    new URLSearchParams();

  query.set(
    'client_id',
    getClientId(),
  );
  query.set(
    'response_type',
    'code',
  );
  query.set(
    'redirect_uri',
    getRedirectUri(),
  );
  query.set(
    'scope',
    'identify',
  );
  query.set(
    'state',
    state,
  );
  query.set(
    'prompt',
    'consent',
  );

  return (
    `${DISCORD_API}/oauth2/authorize?${query.toString()}`
  );
}

export function registerAuthRoutes(
  app: Express,
): void {
  app.get(
    '/auth/discord',
    (
      req: Request,
      res: Response,
    ) => {
      const existingError =
        typeof req.query.error ===
        'string'
          ? req.query.error
          : '';

      try {
        const state =
          randomState();

        setCookie(
          res,
          OAUTH_STATE_COOKIE,
          state,
          OAUTH_STATE_MAX_AGE_SECONDS,
        );

        redirect(
          res,
          oauthAuthorizeUrl(
            state,
          ),
        );
      } catch (error) {
        console.error(
          '[AUTH] iniciar login:',
          error,
        );

        res
          .status(500)
          .type('html')
          .send(
            loginPage(
              existingError ===
                'unauthorized'
                ? 'Sua conta do Discord não tem permissão para acessar este painel.'
                : 'Não foi possível iniciar o login com o Discord.',
            ),
          );
      }
    },
  );

  app.get(
    '/auth/discord/callback',
    async (
      req: Request,
      res: Response,
    ) => {
      try {
        const code =
          typeof req.query.code ===
          'string'
            ? req.query.code
            : '';

        const returnedState =
          typeof req.query.state ===
          'string'
            ? req.query.state
            : '';

        const cookies =
          parseCookies(
            req.headers.cookie,
          );

        const expectedState =
          cookies[OAUTH_STATE_COOKIE];

        clearCookie(
          res,
          OAUTH_STATE_COOKIE,
        );

        if (
          !code ||
          !returnedState ||
          !expectedState ||
          !constantTimeEqual(
            returnedState,
            expectedState,
          )
        ) {
          res
            .status(400)
            .type('html')
            .send(
              loginPage(
                'A validação de segurança do login falhou. Tente novamente.',
              ),
            );

          return;
        }

        if (
          req.query.error
        ) {
          res
            .status(400)
            .type('html')
            .send(
              loginPage(
                'O login com Discord foi cancelado.',
              ),
            );

          return;
        }

        const oauth =
          await exchangeCode(
            code,
          );

        const user =
          await fetchDiscordUser(
            oauth.access_token,
          );

        const authorization =
          await validateAdminAccess(
            user.id,
          );

        if (
          !authorization.allowed
        ) {
          res
            .status(403)
            .type('html')
            .send(
              loginPage(
                authorization.reason,
              ),
            );

          return;
        }

        const payload: SessionPayload = {
          userId:
            user.id,
          exp:
            Math.floor(
              Date.now() /
                1000,
            ) +
            SESSION_MAX_AGE_SECONDS,
        };

        setCookie(
          res,
          AUTH_COOKIE,
          createSignedToken(
            payload,
          ),
          SESSION_MAX_AGE_SECONDS,
        );

        redirect(
          res,
          '/admin',
        );
      } catch (error) {
        console.error(
          '[AUTH] callback:',
          error,
        );

        res
          .status(500)
          .type('html')
          .send(
            loginPage(
              'Não foi possível concluir a autenticação.',
            ),
          );
      }
    },
  );

  app.get(
    '/auth/logout',
    (
      _req: Request,
      res: Response,
    ) => {
      clearCookie(
        res,
        AUTH_COOKIE,
      );

      redirect(
        res,
        '/auth/discord',
      );
    },
  );

  app.get(
    '/auth/me',
    async (
      req: Request,
      res: Response,
    ) => {
      const session =
        await getAuthenticatedAdmin(
          req,
        );

      if (!session) {
        res
          .status(401)
          .json({
            authenticated: false,
          });

        return;
      }

      res.json({
        authenticated: true,
        userId:
          session.userId,
        role:
          session.role,
        username:
          session.username,
        displayName:
          session.displayName,
        avatarUrl:
          session.avatarUrl,
      });
    },
  );

  console.log(
    '🔐 [AUTH] Discord OAuth2 registrado.',
  );
}

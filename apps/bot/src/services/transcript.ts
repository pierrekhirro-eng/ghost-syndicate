// apps/bot/src/services/transcript.ts

import {
  AttachmentBuilder,
  ChannelType,
  EmbedBuilder,
  type Message,
  type TextChannel,
} from 'discord.js';

import fs from 'node:fs/promises';
import path from 'node:path';

import {
  config,
} from '../utils/config.js';

/* =========================================================
   TIPOS
========================================================= */

interface TranscriptMessage {
  id: string;
  authorId: string;
  authorTag: string;
  authorName: string;
  content: string;
  createdAt: number;
  attachments: string[];
}

/* =========================================================
   HELPERS
========================================================= */

function escapeHtml(
  value: string,
): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll(
      "'",
      '&#039;',
    );
}

function escapeAttribute(
  value: string,
): string {
  return escapeHtml(value);
}

function formatDate(
  timestamp: number,
): string {
  return new Intl.DateTimeFormat(
    'pt-BR',
    {
      dateStyle: 'short',
      timeStyle: 'medium',
    },
  ).format(
    new Date(timestamp),
  );
}

function sanitizeFileName(
  value: string,
): string {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9-_]/g,
      '-',
    )
    .replace(
      /-+/g,
      '-',
    )
    .replace(
      /^-|-$/g,
      '',
    );
}

/* =========================================================
   BUSCAR MENSAGENS
========================================================= */

async function fetchAllMessages(
  channel: TextChannel,
): Promise<Message[]> {
  const messages: Message[] = [];

  let lastId:
    | string
    | undefined;

  while (true) {
    const fetched =
      await channel.messages.fetch(
        {
          limit: 100,
          before: lastId,
        },
      );

    if (
      fetched.size === 0
    ) {
      break;
    }

    messages.push(
      ...fetched.values(),
    );

    if (
      fetched.size < 100
    ) {
      break;
    }

    const last =
      fetched.last();

    if (!last) {
      break;
    }

    lastId = last.id;
  }

  return messages.sort(
    (a, b) =>
      a.createdTimestamp -
      b.createdTimestamp,
  );
}

/* =========================================================
   TRANSFORMAR MENSAGENS
========================================================= */

function normalizeMessage(
  message: Message,
): TranscriptMessage {
  return {
    id: message.id,

    authorId:
      message.author.id,

    authorTag:
      message.author.tag,

    authorName:
      message.member?.displayName ??
      message.author.globalName ??
      message.author.username,

    content:
      message.content,

    createdAt:
      message.createdTimestamp,

    attachments:
      [...message.attachments.values()]
        .map(
          (attachment) =>
            attachment.url,
        ),
  };
}

/* =========================================================
   GERAR HTML
========================================================= */

function buildHtml(
  channel: TextChannel,
  messages: TranscriptMessage[],
  closedBy: string,
): string {
  const messageHtml =
    messages
      .map(
        (message) => {
          const attachments =
            message.attachments
              .map(
                (url) =>
                  `
                    <div class="attachment">
                      <a
                        href="${escapeAttribute(url)}"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        📎 Anexo
                      </a>
                    </div>
                  `,
              )
              .join('');

          const safeContent =
            escapeHtml(
              message.content ||
                '[Mensagem sem texto]',
            ).replaceAll(
              '\n',
              '<br>',
            );

          return `
            <article class="message">
              <div class="avatar">
                ${escapeHtml(
                  message.authorName
                    .slice(0, 1)
                    .toUpperCase(),
                )}
              </div>

              <div class="message-body">

                <div class="message-header">

                  <span class="author">
                    ${escapeHtml(
                      message.authorName,
                    )}
                  </span>

                  <span class="tag">
                    ${escapeHtml(
                      message.authorTag,
                    )}
                  </span>

                  <span class="date">
                    ${escapeHtml(
                      formatDate(
                        message.createdAt,
                      ),
                    )}
                  </span>

                </div>

                <div class="content">
                  ${safeContent}
                </div>

                ${attachments}
              </div>
            </article>
          `;
        },
      )
      .join('');

  return `
<!doctype html>

<html lang="pt-BR">

<head>

<meta charset="utf-8">

<meta
  name="viewport"
  content="width=device-width, initial-scale=1"
/>

<title>
  Transcript • ${escapeHtml(
    channel.name,
  )}
</title>

<style>

:root {
  color-scheme: dark;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;

  min-height: 100vh;

  background:
    radial-gradient(
      circle at 10% 0%,
      rgba(
        124,
        92,
        255,
        .16
      ),
      transparent 32%
    ),

    #080a10;

  color:
    #f5f7fb;

  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

.container {
  width:
    min(
      1000px,
      calc(
        100% - 32px
      )
    );

  margin:
    0 auto;

  padding:
    34px 0 70px;
}

.header {
  padding:
    26px;

  border:
    1px solid
    #252a39;

  border-radius:
    24px;

  background:
    linear-gradient(
      180deg,
      rgba(
        21,
        25,
        37,
        .96
      ),
      rgba(
        11,
        14,
        22,
        .96
      )
    );

  box-shadow:
    0 24px 80px
    rgba(
      0,
      0,
      0,
      .25
    );

  margin-bottom:
    18px;
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
    50px;

  height:
    50px;

  display:
    grid;

  place-items:
    center;

  border-radius:
    15px;

  background:
    linear-gradient(
      135deg,
      #9278ff,
      #6249db
    );

  font-size:
    23px;

  box-shadow:
    0 16px 40px
    rgba(
      124,
      92,
      255,
      .24
    );
}

.eyebrow {
  margin:
    0 0 4px;

  color:
    #818a9c;

  font-size:
    11px;

  font-weight:
    800;

  letter-spacing:
    .15em;

  text-transform:
    uppercase;
}

h1 {
  margin:
    0;

  font-size:
    25px;

  letter-spacing:
    -.035em;
}

.meta {
  display:
    flex;

  flex-wrap:
    wrap;

  gap:
    9px;

  margin-top:
    20px;
}

.badge {
  padding:
    8px 11px;

  border:
    1px solid
    #292f40;

  border-radius:
    999px;

  background:
    rgba(
      255,
      255,
      255,
      .02
    );

  color:
    #aeb7c8;

  font-size:
    12px;
}

.badge strong {
  color:
    #f5f7fb;
}

.messages {
  display:
    grid;

  gap:
    8px;
}

.message {
  display:
    grid;

  grid-template-columns:
    40px 1fr;

  gap:
    12px;

  padding:
    14px 16px;

  border:
    1px solid
    #202534;

  border-radius:
    17px;

  background:
    rgba(
      17,
      20,
      30,
      .84
    );
}

.avatar {
  width:
    36px;

  height:
    36px;

  display:
    grid;

  place-items:
    center;

  border-radius:
    12px;

  background:
    #1a1f2c;

  color:
    #c3cad8;

  font-weight:
    800;
}

.message-body {
  min-width:
    0;
}

.message-header {
  display:
    flex;

  align-items:
    baseline;

  flex-wrap:
    wrap;

  gap:
    7px;

  margin-bottom:
    5px;
}

.author {
  font-weight:
    800;
}

.tag {
  color:
    #727c8f;

  font-size:
    12px;
}

.date {
  color:
    #616a7d;

  font-size:
    11px;

  margin-left:
    auto;
}

.content {
  color:
    #d4d9e3;

  line-height:
    1.62;

  white-space:
    normal;

  overflow-wrap:
    anywhere;
}

.attachment {
  margin-top:
    9px;
}

.attachment a {
  color:
    #9d8aff;

  text-decoration:
    none;

  font-size:
    13px;
}

.footer {
  margin-top:
    20px;

  color:
    #656e80;

  font-size:
    11px;

  text-align:
    center;
}

@media (
  max-width: 620px
) {
  .container {
    width:
      calc(
        100% - 20px
      );

    padding-top:
      16px;
  }

  .header {
    padding:
      20px;
  }

  .date {
    width:
      100%;

    margin-left:
      0;
  }

  .message {
    grid-template-columns:
      34px 1fr;

    padding:
      12px;
  }

  .avatar {
    width:
      32px;

    height:
      32px;
  }
}

</style>

</head>

<body>

<main class="container">

<header class="header">

  <div class="brand">

    <div class="logo">
      👻
    </div>

    <div>

      <p class="eyebrow">
        Ghost Syndicate
      </p>

      <h1>
        Transcript • #${escapeHtml(
          channel.name,
        )}
      </h1>

    </div>

  </div>

  <div class="meta">

    <div class="badge">
      <strong>Mensagens:</strong>
      ${messages.length}
    </div>

    <div class="badge">
      <strong>Fechado por:</strong>
      ${escapeHtml(
        closedBy,
      )}
    </div>

    <div class="badge">
      <strong>Gerado em:</strong>
      ${escapeHtml(
        formatDate(
          Date.now(),
        ),
      )}
    </div>

  </div>

</header>

<section class="messages">

  ${messageHtml}

</section>

<footer class="footer">
  Ghost Syndicate • Organização • Lealdade • Resultado
</footer>

</main>

</body>

</html>
  `;
}

/* =========================================================
   CRIAR TRANSCRIPT
========================================================= */

export async function createTranscript(
  channel: TextChannel,
  closedBy: string,
): Promise<string> {
  const messages =
    await fetchAllMessages(
      channel,
    );

  const normalized =
    messages.map(
      normalizeMessage,
    );

  const html =
    buildHtml(
      channel,
      normalized,
      closedBy,
    );

  const transcriptDirectory =
    path.resolve(
      process.cwd(),
      'storage',
      'transcripts',
    );

  await fs.mkdir(
    transcriptDirectory,
    {
      recursive: true,
    },
  );

  const timestamp =
    new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        '-',
      );

  const safeChannel =
    sanitizeFileName(
      channel.name,
    ) ||
    'ticket';

  const fileName =
    `${safeChannel}-${timestamp}.html`;

  const filePath =
    path.join(
      transcriptDirectory,
      fileName,
    );

  await fs.writeFile(
    filePath,
    html,
    'utf8',
  );

  await sendTranscriptToDiscord(
    channel,
    filePath,
    normalized.length,
    closedBy,
  );

  return filePath;
}

/* =========================================================
   ENVIAR PARA O DISCORD
========================================================= */

async function sendTranscriptToDiscord(
  channel: TextChannel,
  filePath: string,
  messageCount: number,
  closedBy: string,
): Promise<void> {
  const targetChannelId =
    config.tickets
      .transcriptsChannelId;

  if (!targetChannelId) {
    console.warn(
      '⚠️ Canal de transcripts não configurado.',
    );

    return;
  }

  const targetChannel =
    channel.client.channels.cache.get(
      targetChannelId,
    );

  if (
    !targetChannel ||
    targetChannel.type !==
      ChannelType.GuildText
  ) {
    console.warn(
      '⚠️ Canal de transcripts inválido ou não encontrado.',
    );

    return;
  }

  const textChannel =
    targetChannel as TextChannel;

  const attachment =
    new AttachmentBuilder(
      filePath,
      {
        name:
          path.basename(
            filePath,
          ),
      },
    );

  const embed =
    new EmbedBuilder()
      .setColor(0x7c5cff)
      .setTitle(
        '📜 TRANSCRIPT GERADO',
      )
      .setDescription(
        [
          `🎫 **Ticket:** \`#${channel.name}\``,
          `👤 **Fechado por:** ${closedBy}`,
          `💬 **Mensagens:** ${messageCount}`,
          '',
          'O transcript completo deste atendimento está anexado abaixo.',
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Sistema de Tickets',
      })
      .setTimestamp();

  await textChannel.send({
    embeds: [
      embed,
    ],
    files: [
      attachment,
    ],
  });
}
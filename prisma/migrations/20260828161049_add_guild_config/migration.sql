-- CreateTable
CREATE TABLE "GuildConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "guildId" TEXT NOT NULL,
    "serverName" TEXT NOT NULL DEFAULT 'Ghost Syndicate',
    "brandName" TEXT NOT NULL DEFAULT 'Ghost Syndicate',
    "primaryColor" TEXT NOT NULL DEFAULT '#43FF98',
    "secondaryColor" TEXT NOT NULL DEFAULT '#07120C',
    "footerText" TEXT NOT NULL DEFAULT 'Ghost Syndicate • Organização • Lealdade • Resultado',
    "ticketsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "ticketTitle" TEXT NOT NULL DEFAULT '🎫 CENTRAL DE ATENDIMENTO',
    "ticketDescription" TEXT NOT NULL DEFAULT 'Abra um atendimento privado com nossa equipe.',
    "ticketWelcomeText" TEXT NOT NULL DEFAULT 'Olá {user}, seu atendimento foi aberto. Explique abaixo o que você precisa e aguarde nossa equipe.',
    "ticketOpenButtonLabel" TEXT NOT NULL DEFAULT 'Abrir Atendimento',
    "ticketOpenButtonEmoji" TEXT NOT NULL DEFAULT '🎫',
    "ticketHowButtonLabel" TEXT NOT NULL DEFAULT 'Como funciona',
    "ticketHowButtonEmoji" TEXT NOT NULL DEFAULT '❓',
    "ticketFinanceButtonLabel" TEXT NOT NULL DEFAULT 'Financeiro',
    "ticketFinanceButtonEmoji" TEXT NOT NULL DEFAULT '💰',
    "ticketCategoryId" TEXT,
    "transcriptChannelId" TEXT,
    "ownerRoleId" TEXT,
    "adminRoleId" TEXT,
    "recruitRoleId" TEXT,
    "financeRoleId" TEXT,
    "operationsRoleId" TEXT,
    "rankingEnabled" BOOLEAN NOT NULL DEFAULT true,
    "rankingChannelId" TEXT,
    "rankingTitle" TEXT NOT NULL DEFAULT '🎙️ Ranking de horas em call',
    "rankingDescription" TEXT NOT NULL DEFAULT 'Acompanhe o tempo acumulado da equipe nos canais de voz.',
    "financeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "moderationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GuildConfig_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildConfig_guildId_key" ON "GuildConfig"("guildId");

-- CreateIndex
CREATE INDEX "GuildConfig_guildId_idx" ON "GuildConfig"("guildId");

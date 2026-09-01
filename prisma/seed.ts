import 'dotenv/config';

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Variável obrigatória ausente: ${name}`);
  }

  return value;
}

async function main(): Promise<void> {
  const guildId = requiredEnv('DISCORD_GUILD_ID');
  const guildName =
    process.env.DISCORD_GUILD_NAME?.trim() || 'Ghost Syndicate';

  const roleOwner = process.env.ROLE_DONO_DA_FAC_ID?.trim() || null;
  const roleAdmin = process.env.ROLE_ADM_ID?.trim() || null;
  const roleRecruit = process.env.ROLE_RECRUTA_ID?.trim() || null;
  const transcriptChannel =
    process.env.TRANSCRIPT_CHANNEL_ID?.trim() || null;

  const existing = await prisma.guild.findUnique({
    where: { id: guildId },
    select: { id: true },
  });

  if (!existing) {
    await prisma.guild.create({
      data: {
        id: guildId,
        name: guildName,
      },
    });

    console.log(`✅ Guild criada: ${guildId}`);
  } else {
    console.log(`ℹ️ Guild já existe: ${guildId}`);
  }

  await prisma.guildConfig.upsert({
    where: { guildId },
    create: {
      guildId,
      serverName:
        process.env.GUILD_SERVER_NAME?.trim() || guildName,
      brandName:
        process.env.GUILD_BRAND_NAME?.trim() || 'Ghost Syndicate',
      primaryColor:
        process.env.GUILD_PRIMARY_COLOR?.trim() || '#43FF98',
      secondaryColor:
        process.env.GUILD_SECONDARY_COLOR?.trim() || '#07120C',
      footerText:
        process.env.GUILD_FOOTER_TEXT?.trim() ||
        'Ghost Syndicate • Organização • Lealdade • Resultado',
      ownerRoleId: roleOwner,
      adminRoleId: roleAdmin,
      recruitRoleId: roleRecruit,
      transcriptChannelId: transcriptChannel,
      rankingChannelId:
        process.env.RANKING_CHANNEL_ID?.trim() || null,
      ticketCategoryId:
        process.env.TICKET_CATEGORY_ID?.trim() || null,
      financeRoleId:
        process.env.ROLE_FINANCEIRO_ID?.trim() || null,
      operationsRoleId:
        process.env.ROLE_OPERACOES_ID?.trim() || null,
    },
    update: {
      ownerRoleId: roleOwner,
      adminRoleId: roleAdmin,
      recruitRoleId: roleRecruit,
      transcriptChannelId: transcriptChannel,
      rankingChannelId:
        process.env.RANKING_CHANNEL_ID?.trim() || undefined,
      ticketCategoryId:
        process.env.TICKET_CATEGORY_ID?.trim() || undefined,
      financeRoleId:
        process.env.ROLE_FINANCEIRO_ID?.trim() || undefined,
      operationsRoleId:
        process.env.ROLE_OPERACOES_ID?.trim() || undefined,
    },
  });

  console.log(`✅ GuildConfig pronta para ${guildId}`);
}

main()
  .catch((error) => {
    console.error('❌ Seed falhou:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

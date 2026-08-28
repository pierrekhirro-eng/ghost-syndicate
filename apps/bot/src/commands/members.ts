// apps/bot/src/commands/members.ts

import {
  EmbedBuilder,
  SlashCommandBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
} from 'discord.js';

import {
  requireAdmin,
  requireOwner,
} from '../utils/permissions.js';

import {
  ensureMember,
} from '../services/finance.js';

/* =========================================================
   TIPOS
========================================================= */

export type MemberAction =
  | 'PROMOTE'
  | 'DEMOTE'
  | 'ADD'
  | 'REMOVE';

/* =========================================================
   IDENTIDADE
========================================================= */

const COLORS = {
  brand: 0x7c5cff,
  success: 0x35d39a,
  warning: 0xffc857,
  danger: 0xf15b6b,
  info: 0x5865f2,
} as const;

/* =========================================================
   COMANDO
========================================================= */

export const membersCommand =
  new SlashCommandBuilder()
    .setName('membro')
    .setDescription(
      'Gerencia os membros da Ghost Syndicate.',
    )

    /* -------------------------------------------------------
       INFO
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('info')
        .setDescription(
          'Mostra informações de um membro.',
        )
        .addUserOption((option) =>
          option
            .setName('membro')
            .setDescription(
              'Membro consultado.',
            )
            .setRequired(true),
        ),
    )

    /* -------------------------------------------------------
       ADICIONAR
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('adicionar')
        .setDescription(
          'Registra um membro na Ghost Syndicate.',
        )
        .addUserOption((option) =>
          option
            .setName('membro')
            .setDescription(
              'Membro que será registrado.',
            )
            .setRequired(true),
        ),
    )

    /* -------------------------------------------------------
       REMOVER
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('remover')
        .setDescription(
          'Remove o vínculo administrativo de um membro.',
        )
        .addUserOption((option) =>
          option
            .setName('membro')
            .setDescription(
              'Membro que será removido.',
            )
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('motivo')
            .setDescription(
              'Motivo da remoção.',
            )
            .setRequired(true)
            .setMaxLength(500),
        ),
    )

    /* -------------------------------------------------------
       PROMOVER
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('promover')
        .setDescription(
          'Promove um membro.',
        )
        .addUserOption((option) =>
          option
            .setName('membro')
            .setDescription(
              'Membro que será promovido.',
            )
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('cargo')
            .setDescription(
              'Cargo de destino.',
            )
            .setRequired(true)
            .addChoices(
              {
                name: '👤 Recruta',
                value: 'RECRUIT',
              },
              {
                name: '🛡️ ADM',
                value: 'ADMIN',
              },
              {
                name: '👑 Dono da fac',
                value: 'OWNER',
              },
            ),
        ),
    )

    /* -------------------------------------------------------
       REBAIXAR
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('rebaixar')
        .setDescription(
          'Rebaixa um membro.',
        )
        .addUserOption((option) =>
          option
            .setName('membro')
            .setDescription(
              'Membro que será rebaixado.',
            )
            .setRequired(true),
        )
        .addStringOption((option) =>
          option
            .setName('cargo')
            .setDescription(
              'Novo cargo.',
            )
            .setRequired(true)
            .addChoices(
              {
                name: '👤 Recruta',
                value: 'RECRUIT',
              },
              {
                name: '🛡️ ADM',
                value: 'ADMIN',
              },
            ),
        )
        .addStringOption((option) =>
          option
            .setName('motivo')
            .setDescription(
              'Motivo do rebaixamento.',
            )
            .setRequired(true)
            .setMaxLength(500),
        ),
    )

    /* -------------------------------------------------------
       CARGOS
    ------------------------------------------------------- */

    .addSubcommand((subcommand) =>
      subcommand
        .setName('cargos')
        .setDescription(
          'Mostra os cargos administrativos de um membro.',
        )
        .addUserOption((option) =>
          option
            .setName('membro')
            .setDescription(
              'Membro consultado.',
            )
            .setRequired(true),
        ),
    );

/* =========================================================
   EXECUTOR
========================================================= */

export async function executeMembersCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) {
    await interaction.reply({
      content:
        '❌ Este comando só pode ser usado dentro do servidor.',
      ephemeral: true,
    });

    return;
  }

  const executor =
    await interaction.guild.members.fetch(
      interaction.user.id,
    );

  const subcommand =
    interaction.options.getSubcommand();

  /*
   * INFO E CARGOS:
   * qualquer administrador pode consultar.
   *
   * ALTERAÇÕES:
   * exigem ADM.
   *
   * PROMOÇÃO PARA DONO:
   * exige DONO.
   */

  if (
    subcommand === 'info' ||
    subcommand === 'cargos'
  ) {
    await handlePublicInfo(
      interaction,
    );

    return;
  }

  try {
    requireAdmin(executor);
  } catch (error) {
    await interaction.reply({
      content:
        error instanceof Error
          ? `❌ ${error.message}`
          : '❌ Você não possui permissão para gerenciar membros.',
      ephemeral: true,
    });

    return;
  }

  switch (subcommand) {
    case 'adicionar':
      await handleAdd(
        interaction,
      );
      break;

    case 'remover':
      await handleRemove(
        interaction,
        executor,
      );
      break;

    case 'promover':
      await handlePromote(
        interaction,
        executor,
      );
      break;

    case 'rebaixar':
      await handleDemote(
        interaction,
        executor,
      );
      break;

    default:
      await interaction.reply({
        content:
          '❌ Subcomando de membro inválido.',
        ephemeral: true,
      });
      break;
  }
}

/* =========================================================
   INFO
========================================================= */

async function handlePublicInfo(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) {
    return;
  }

  const target =
    interaction.options.getUser(
      'membro',
      true,
    );

  const member =
    await interaction.guild.members.fetch(
      target.id,
    );

  const roles =
    member.roles.cache
      .filter(
        (role) =>
          role.id !==
          interaction.guild!.roles.everyone.id,
      )
      .sort(
        (a, b) =>
          b.position -
          a.position,
      )
      .map(
        (role) =>
          role,
      );

  const roleText =
    roles.length > 0
      ? roles
          .slice(0, 10)
          .map(
            (role) =>
              `${role}`,
          )
          .join(', ')
      : 'Nenhum cargo';

  const embed =
    new EmbedBuilder()
      .setColor(
        COLORS.brand,
      )
      .setTitle(
        '👤 INFORMAÇÕES DO MEMBRO',
      )
      .setThumbnail(
        target.displayAvatarURL({
          size: 256,
        }),
      )
      .setDescription(
        [
          `👤 **Usuário:** ${target}`,
          `🏷️ **Nome:** ${target.username}`,
          `🆔 **ID:** \`${target.id}\``,
          '',
          `📅 **Entrou no servidor:** ${
            member.joinedTimestamp
              ? `<t:${Math.floor(
                  member.joinedTimestamp /
                    1000,
                )}:F>`
              : 'Desconhecido'
          }`,
          '',
          `🎖️ **Cargos:** ${roleText}`,
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Membros',
      })
      .setTimestamp();

  await interaction.reply({
    embeds: [
      embed,
    ],
    ephemeral: true,
  });
}

/* =========================================================
   ADICIONAR
========================================================= */

async function handleAdd(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  if (!interaction.guild) {
    return;
  }

  const target =
    interaction.options.getMember(
      'membro',
    ) as GuildMember | null;

  if (!target) {
    await interaction.reply({
      content:
        '❌ Não foi possível encontrar o membro no servidor.',
      ephemeral: true,
    });

    return;
  }

  await ensureMember(
    interaction.guild.id,
    {
      id: target.id,
      username: target.user.username,
      displayName:
        target.displayName,
    },
  );

  const embed =
    new EmbedBuilder()
      .setColor(
        COLORS.success,
      )
      .setTitle(
        '✅ MEMBRO REGISTRADO',
      )
      .setDescription(
        [
          `👤 ${target}`,
          '',
          'O membro foi registrado no sistema da Ghost Syndicate.',
          '',
          '📊 **Status:** ATIVO',
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Membros',
      })
      .setTimestamp();

  await interaction.reply({
    embeds: [
      embed,
    ],
    ephemeral: true,
  });
}

/* =========================================================
   REMOVER
========================================================= */

async function handleRemove(
  interaction: ChatInputCommandInteraction,
  executor: GuildMember,
): Promise<void> {
  const target =
    interaction.options.getMember(
      'membro',
    ) as GuildMember | null;

  if (!target) {
    await interaction.reply({
      content:
        '❌ Membro não encontrado.',
      ephemeral: true,
    });

    return;
  }

  const reason =
    interaction.options
      .getString(
        'motivo',
        true,
      )
      .trim();

  /*
   * Um ADM não pode remover outro ADM
   * sem que exista uma regra superior.
   */

  const targetIsAdmin =
    target.permissions.has(
      'Administrator',
    );

  if (
    targetIsAdmin &&
    !requireOwnerSafe(executor)
  ) {
    await interaction.reply({
      content:
        '❌ Apenas um Dono da fac pode remover um administrador.',
      ephemeral: true,
    });

    return;
  }

  const embed =
    new EmbedBuilder()
      .setColor(
        COLORS.danger,
      )
      .setTitle(
        '🚫 MEMBRO REMOVIDO',
      )
      .setDescription(
        [
          `👤 **Membro:** ${target}`,
          `📝 **Motivo:** ${reason}`,
          `🛡️ **Responsável:** ${executor}`,
          '',
          '⚠️ A remoção definitiva de cargos e persistência será conectada na integração final.',
        ].join('\n'),
      )
      .setFooter({
        text:
          'Ghost Syndicate • Administração',
      })
      .setTimestamp();

  await interaction.reply({
    embeds: [
      embed,
    ],
    ephemeral: true,
  });
}

/* =========================================================
   PROMOVER
========================================================= */

async function handlePromote(
  interaction: ChatInputCommandInteraction,
  executor: GuildMember,
): Promise<void> {
  const target =
    interaction.options.getMember(
      'membro',
    ) as GuildMember | null;

  if (!target) {
    await interaction.reply({
      content:
        '❌ Membro não encontrado.',
      ephemeral: true,
    });

    return;
  }

  const role =
    interaction.options.getString(
      'cargo',
      true,
    );

  if (
    role === 'OWNER' &&
    !requireOwnerSafe(executor)
  ) {
    await interaction.reply({
      content:
        '❌ Apenas um Dono da fac pode promover alguém para Dono.',
      ephemeral: true,
    });

    return;
  }

  const roleLabel =
    getRoleLabel(role);

  const embed =
    new EmbedBuilder()
      .setColor(
        role === 'OWNER'
          ? COLORS.warning
          : COLORS.success,
      )
      .setTitle(
        '⬆️ MEMBRO PROMOVIDO',
      )
      .setDescription(
        [
          `👤 **Membro:** ${target}`,
          `🎖️ **Novo cargo:** ${roleLabel}`,
          `🛡️ **Promovido por:** ${executor}`,
          '',
          'A alteração definitiva dos cargos do Discord será conectada na integração final.',
        ].join('\n'),
      )
      .setTimestamp();

  await interaction.reply({
    embeds: [
      embed,
    ],
    ephemeral: true,
  });
}

/* =========================================================
   REBAIXAR
========================================================= */

async function handleDemote(
  interaction: ChatInputCommandInteraction,
  executor: GuildMember,
): Promise<void> {
  const target =
    interaction.options.getMember(
      'membro',
    ) as GuildMember | null;

  if (!target) {
    await interaction.reply({
      content:
        '❌ Membro não encontrado.',
      ephemeral: true,
    });

    return;
  }

  const role =
    interaction.options.getString(
      'cargo',
      true,
    );

  const reason =
    interaction.options
      .getString(
        'motivo',
        true,
      )
      .trim();

  if (
    requireOwnerSafe(executor) ===
    false
  ) {
    const targetIsAdmin =
      target.permissions.has(
        'Administrator',
      );

    if (targetIsAdmin) {
      await interaction.reply({
        content:
          '❌ Apenas um Dono da fac pode rebaixar um administrador.',
        ephemeral: true,
      });

      return;
    }
  }

  const embed =
    new EmbedBuilder()
      .setColor(
        COLORS.warning,
      )
      .setTitle(
        '⬇️ MEMBRO REBAIXADO',
      )
      .setDescription(
        [
          `👤 **Membro:** ${target}`,
          `🎖️ **Novo cargo:** ${getRoleLabel(role)}`,
          `📝 **Motivo:** ${reason}`,
          `🛡️ **Responsável:** ${executor}`,
          '',
          'A alteração definitiva dos cargos será conectada na integração final.',
        ].join('\n'),
      )
      .setTimestamp();

  await interaction.reply({
    embeds: [
      embed,
    ],
    ephemeral: true,
  });
}

/* =========================================================
   LABEL DE CARGO
========================================================= */

function getRoleLabel(
  role: string,
): string {
  switch (role) {
    case 'OWNER':
      return '👑 Dono da fac';

    case 'ADMIN':
      return '🛡️ ADM';

    case 'RECRUIT':
      return '👤 Recruta';

    default:
      return '👤 Membro';
  }
}

/* =========================================================
   VERIFICAÇÃO SEGURA DE DONO
========================================================= */

function requireOwnerSafe(
  member: GuildMember,
): boolean {
  try {
    requireOwner(
      member,
    );

    return true;
  } catch {
    return false;
  }
}
// apps/bot/src/utils/permissions.ts

import {
  PermissionFlagsBits,
  type GuildMember,
} from 'discord.js';

import {
  config,
} from './config.js';

/* =========================================================
   TIPOS
========================================================= */

export enum StaffLevel {
  MEMBER = 0,
  RECRUIT = 1,
  ADMIN = 2,
  OWNER = 3,
}

/* =========================================================
   IDENTIFICAR NÍVEL DO MEMBRO
========================================================= */

export function getStaffLevel(
  member: GuildMember,
): StaffLevel {
  /*
   * 👑 DONO DA FAC
   */

  if (
    member.roles.cache.has(
      config.roles.ownerId,
    )
  ) {
    return StaffLevel.OWNER;
  }

  /*
   * 🛡️ ADM
   */

  if (
    member.roles.cache.has(
      config.roles.leadershipId,
    )
  ) {
    return StaffLevel.ADMIN;
  }

  /*
   * 👤 RECRUTA
   */

  if (
    member.roles.cache.has(
      config.roles.recruitsId,
    )
  ) {
    return StaffLevel.RECRUIT;
  }

  /*
   * 👤 MEMBRO COMUM
   */

  return StaffLevel.MEMBER;
}

/* =========================================================
   VERIFICAÇÕES DE NÍVEL
========================================================= */

export function isOwner(
  member: GuildMember,
): boolean {
  return (
    getStaffLevel(member) >=
    StaffLevel.OWNER
  );
}

export function isAdmin(
  member: GuildMember,
): boolean {
  return (
    getStaffLevel(member) >=
    StaffLevel.ADMIN
  );
}

export function isStaff(
  member: GuildMember,
): boolean {
  return (
    getStaffLevel(member) >=
    StaffLevel.ADMIN
  );
}

export function isRecruit(
  member: GuildMember,
): boolean {
  return (
    getStaffLevel(member) >=
    StaffLevel.RECRUIT
  );
}

/* =========================================================
   VERIFICAR ADMIN DO DISCORD
========================================================= */

export function hasDiscordAdministrator(
  member: GuildMember,
): boolean {
  return member.permissions.has(
    PermissionFlagsBits.Administrator,
  );
}

/* =========================================================
   ADMINISTRADOR DO SISTEMA
========================================================= */

export function hasAdminAccess(
  member: GuildMember,
): boolean {
  /*
   * O cargo ADM da Ghost Syndicate
   * é a principal forma de acesso.
   *
   * Também aceitamos Administrator
   * do Discord para evitar bloqueios
   * caso um administrador real do servidor
   * precise usar o bot.
   */

  return (
    isAdmin(member) ||
    hasDiscordAdministrator(member)
  );
}

/* =========================================================
   ACESSO DO DONO
========================================================= */

export function hasOwnerAccess(
  member: GuildMember,
): boolean {
  return (
    isOwner(member) ||
    hasDiscordAdministrator(member)
  );
}

/* =========================================================
   CHECAGEM EXIGINDO ADMIN
========================================================= */

export function requireAdmin(
  member: GuildMember,
): void {
  if (
    !hasAdminAccess(member)
  ) {
    throw new Error(
      'Você precisa ter o cargo **ADM** ou possuir **Administrador** no Discord para usar esta ação.',
    );
  }
}

/* =========================================================
   CHECAGEM EXIGINDO DONO
========================================================= */

export function requireOwner(
  member: GuildMember,
): void {
  if (
    !hasOwnerAccess(member)
  ) {
    throw new Error(
      'Apenas os **Donos da fac** podem executar esta ação.',
    );
  }
}

/* =========================================================
   DESCRIÇÃO DO NÍVEL
========================================================= */

export function getStaffLabel(
  member: GuildMember,
): string {
  const level =
    getStaffLevel(member);

  switch (level) {
    case StaffLevel.OWNER:
      return '👑 Dono da fac';

    case StaffLevel.ADMIN:
      return '🛡️ ADM';

    case StaffLevel.RECRUIT:
      return '👤 Recruta';

    default:
      return '👤 Membro';
  }
}

/* =========================================================
   RESUMO DE PERMISSÃO
========================================================= */

export function getPermissionSummary(
  member: GuildMember,
): {
  level: StaffLevel;
  label: string;
  admin: boolean;
  owner: boolean;
  discordAdministrator: boolean;
} {
  return {
    level:
      getStaffLevel(member),

    label:
      getStaffLabel(member),

    admin:
      hasAdminAccess(member),

    owner:
      hasOwnerAccess(member),

    discordAdministrator:
      hasDiscordAdministrator(
        member,
      ),
  };
}
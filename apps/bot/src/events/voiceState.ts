import {
  type Guild,
  type GuildMember,
  type VoiceState,
} from 'discord.js';

import {
  reconcileVoiceSessions,
  startVoice,
  stopVoice,
} from '../services/voice.js';

/* =========================================================
   EVENTO DE VOZ
========================================================= */

export async function onVoiceState(
  oldState: VoiceState,
  newState: VoiceState,
): Promise<void> {
  try {
    const guild =
      newState.guild ??
      oldState.guild;

    if (!guild) {
      return;
    }

    const member =
      (
        newState.member ??
        oldState.member
      ) as GuildMember | null;

    if (!member) {
      return;
    }

    /*
     * Bots não participam do ranking.
     */
    if (member.user.bot) {
      return;
    }

    const guildId =
      guild.id;

    const userId =
      member.id;

    /*
     * =====================================================
     * ENTRADA EM VOZ
     * =====================================================
     */

    if (
      !oldState.channelId &&
      newState.channelId
    ) {
      await startVoice(
        guildId,
        userId,
        newState.channelId,
        member.displayName,
        member.user.username,
      );

      return;
    }

    /*
     * =====================================================
     * SAÍDA DA VOZ
     * =====================================================
     */

    if (
      oldState.channelId &&
      !newState.channelId
    ) {
      await stopVoice(
        guildId,
        userId,
      );

      return;
    }

    /*
     * =====================================================
     * TROCA DE CANAL
     * =====================================================
     */

    if (
      oldState.channelId &&
      newState.channelId &&
      oldState.channelId !==
        newState.channelId
    ) {
      await stopVoice(
        guildId,
        userId,
      );

      await startVoice(
        guildId,
        userId,
        newState.channelId,
        member.displayName,
        member.user.username,
      );

      return;
    }

  } catch (
    error
  ) {
    console.error(
      '❌ [VOICE STATE] Erro ao processar estado de voz:',
      error,
    );
  }
}

/* =========================================================
   RECONCILIAÇÃO DO SERVIDOR
========================================================= */

export async function reconcileGuildVoice(
  guild: Guild,
): Promise<void> {
  try {
    /*
     * IMPORTANTE:
     *
     * Não usamos channel.members aqui.
     *
     * Usamos diretamente o cache de VoiceState
     * mantido pelo Discord.js.
     *
     * Isso evita exatamente o problema que você
     * acabou de mostrar: membro offline sendo
     * tratado como se ainda estivesse na call.
     */

    const currentMembers: Array<{
      userId: string;
      channelId: string;
      displayName: string;
      username: string;
    }> = [];

    for (
      const voiceState of guild.voiceStates.cache.values()
    ) {
      /*
       * Sem canal = não está em voz.
       */

      if (
        !voiceState.channelId
      ) {
        continue;
      }

      /*
       * O membro pode ainda não estar disponível
       * em alguma situação parcial.
       */

      const member =
        voiceState.member;

      if (
        !member
      ) {
        continue;
      }

      /*
       * Bots não entram no ranking.
       */

      if (
        member.user.bot
      ) {
        continue;
      }

      currentMembers.push({
        userId:
          member.id,

        channelId:
          voiceState.channelId,

        displayName:
          member.displayName,

        username:
          member.user.username,
      });
    }

    /*
     * Log de diagnóstico.
     *
     * Assim conseguimos enxergar exatamente
     * quem o Discord está dizendo que está em voz.
     */

    console.log(
      `🔎 [VOICE] ${guild.name}: ${currentMembers.length} membro(s) realmente em voz.`,
    );

    for (
      const member of currentMembers
    ) {
      console.log(
        `   🎙️ ${member.displayName} → ${member.channelId}`,
      );
    }

    /*
     * Sincroniza banco <-> Discord.
     */

    await reconcileVoiceSessions(
      guild.id,
      currentMembers,
    );

  } catch (
    error
  ) {
    console.error(
      '❌ [VOICE RECONCILE] Erro:',
      error,
    );
  }
}
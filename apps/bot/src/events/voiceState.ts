// apps/bot/src/events/voiceState.ts

import {
  type GuildMember,
  type VoiceState,
} from 'discord.js';

import {
  startVoice,
  stopVoice,
} from '../services/voice.js';

export async function onVoiceState(
  oldS: VoiceState,
  newS: VoiceState,
): Promise<void> {
  try {
    if (!newS.guild) {
      return;
    }

    const member =
      (newS.member ??
        oldS.member) as
        | GuildMember
        | null;

    if (!member) {
      return;
    }

    if (member.user.bot) {
      return;
    }

    const guildId =
      newS.guild.id;

    const userId =
      member.id;

    if (
      !oldS.channelId &&
      newS.channelId
    ) {
      await startVoice(
        guildId,
        userId,
        newS.channelId,
        member.displayName,
        member.user.username,
      );

      return;
    }

    if (
      oldS.channelId &&
      !newS.channelId
    ) {
      await stopVoice(
        guildId,
        userId,
      );

      return;
    }

    if (
      oldS.channelId &&
      newS.channelId &&
      oldS.channelId !==
        newS.channelId
    ) {
      await stopVoice(
        guildId,
        userId,
      );

      await startVoice(
        guildId,
        userId,
        newS.channelId,
        member.displayName,
        member.user.username,
      );

      return;
    }
  } catch (error) {
    console.error(
      '❌ [VOICE STATE] Erro ao processar mudança de voz:',
      error,
    );
  }
}

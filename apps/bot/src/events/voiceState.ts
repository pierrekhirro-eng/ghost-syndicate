import { GuildMember, VoiceState } from 'discord.js';
import { startVoice, stopVoice } from '../services/voice.js';
export async function onVoiceState(oldS:VoiceState,newS:VoiceState){
  if(!newS.guild) return;
  if(!oldS.channelId && newS.channelId){ const m=newS.member as GuildMember; await startVoice(newS.guild.id,m.id,newS.channelId,m.displayName,m.user.username); }
  else if(oldS.channelId && !newS.channelId){ await stopVoice(newS.guild.id,oldS.id); }
  else if(oldS.channelId!==newS.channelId && newS.channelId){ await stopVoice(newS.guild.id,newS.id); const m=newS.member as GuildMember; await startVoice(newS.guild.id,m.id,newS.channelId,m.displayName,m.user.username); }
}

import { db } from './db.js';

export async function startVoice(guildId:string, userId:string, channelId:string, displayName:string, username:string) {
  await db.member.upsert({where:{id:userId},create:{id:userId,guildId,displayName,username},update:{displayName,username}});
  const active = await db.voiceSession.findFirst({where:{guildId,memberId:userId,endedAt:null}});
  if (!active) await db.voiceSession.create({data:{guildId,memberId:userId,channelId,startedAt:new Date()}});
}
export async function stopVoice(guildId:string,userId:string){
  const active = await db.voiceSession.findFirst({where:{guildId,memberId:userId,endedAt:null},orderBy:{startedAt:'desc'}});
  if (!active) return;
  const endedAt = new Date();
  const seconds = Math.max(0, Math.floor((endedAt.getTime()-active.startedAt.getTime())/1000));
  await db.voiceSession.update({where:{id:active.id},data:{endedAt,seconds}});
}
export async function topVoice(guildId:string, limit=10){
  const sessions = await db.voiceSession.findMany({where:{guildId,endedAt:{not:null}}});
  const map = new Map<string,{name:string;seconds:number}>();
  for(const s of sessions){ const n=map.get(s.memberId)??{name:s.memberId,seconds:0}; n.seconds+=s.seconds; map.set(s.memberId,n); }
  const members = await db.member.findMany({where:{guildId}});
  for(const m of members){ const n=map.get(m.id); if(n)n.name=m.displayName; }
  return [...map.entries()].map(([memberId,v])=>({memberId,...v})).sort((a,b)=>b.seconds-a.seconds).slice(0,limit);
}
export async function memberVoiceSeconds(guildId:string,userId:string){
  const rows=await db.voiceSession.findMany({where:{guildId,memberId:userId,endedAt:{not:null}}});
  return rows.reduce((a,b)=>a+b.seconds,0);
}

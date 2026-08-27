import { db } from './db.js';

export async function ensureGuild(guildId: string, name: string) {
  return db.guild.upsert({ where:{id:guildId}, create:{id:guildId,name}, update:{name} });
}
export async function ensureMember(guildId: string, member:{id:string; username:string; displayName:string}) {
  return db.member.upsert({ where:{id:member.id}, create:{id:member.id,guildId,username:member.username,displayName:member.displayName}, update:{username:member.username,displayName:member.displayName} });
}
export async function addMovement(guildId:string, memberId:string|undefined, type:'IN'|'OUT', amount:number, reason:string, responsible:string) {
  const value = Math.round(amount);
  return db.$transaction(async tx => {
    const guild = await tx.guild.findUnique({where:{id:guildId}});
    if (!guild) throw new Error('Guild não configurada.');
    if (type==='OUT' && guild.cashBalance < value) throw new Error('Saldo insuficiente no caixa.');
    await tx.cashMovement.create({data:{guildId,memberId,type,amount:value,reason,responsible}});
    return tx.guild.update({where:{id:guildId},data:{cashBalance:{increment:type==='IN'?value:-value}}});
  });
}

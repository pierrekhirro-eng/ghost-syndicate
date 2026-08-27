import { AttachmentBuilder, TextChannel } from 'discord.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '../utils/config.js';

function esc(s:string){ return s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
export async function createTranscript(channel:TextChannel, closedBy:string){
  const messages=[] as any[];
  let before: string | undefined;
  while(true){
    const batch=await channel.messages.fetch({limit:100,before});
    if(!batch.size) break;
    messages.push(...batch.values());
    before=batch.last()?.id;
    if(batch.size<100) break;
  }
  messages.reverse();
  const rows=messages.map(m=>`<article class="msg"><img src="${esc(m.author.displayAvatarURL({extension:'png',size:64}))}"><div><b>${esc(m.author.displayName)}</b><time>${m.createdAt.toLocaleString('pt-BR')}</time><p>${esc(m.content||'').replace(/\n/g,'<br>')}</p>${m.attachments.size?`<small>Anexos: ${[...m.attachments.values()].map(a=>`<a href="${esc(a.url)}">${esc(a.name??'arquivo')}</a>`).join(' · ')}</small>`:''}</div></article>`).join('');
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Transcript ${esc(channel.name)}</title><style>body{font-family:Inter,system-ui;background:#0b0d12;color:#eef0f4;margin:0;padding:32px}.card{max-width:1000px;margin:auto;background:#121620;border:1px solid #252b38;border-radius:18px;padding:26px}.head{display:flex;justify-content:space-between;gap:16px;border-bottom:1px solid #272e3b;padding-bottom:18px;margin-bottom:18px}.muted,time{color:#8f98a8;font-size:12px}.msg{display:flex;gap:12px;padding:12px 0;border-bottom:1px solid #1f2530}.msg img{width:36px;height:36px;border-radius:50%}.msg p{margin:5px 0;white-space:normal}.msg a{color:#9ab8ff}</style></head><body><section class="card"><div class="head"><div><h1>👻 Ghost Syndicate</h1><div class="muted">Transcript • #${esc(channel.name)}</div></div><div class="muted">Fechado por ${esc(closedBy)}</div></div>${rows||'<p class="muted">Sem mensagens.</p>'}</section></body></html>`;
  const dir=path.resolve('storage/transcripts'); await fs.mkdir(dir,{recursive:true});
  const filename=`${channel.guild.id}-${channel.name}-${Date.now()}.html`; const full=path.join(dir,filename); await fs.writeFile(full,html,'utf8');
  const target=channel.client.channels.cache.get(config.TRANSCRIPT_CHANNEL_ID) as TextChannel|undefined;
  if(target?.isTextBased()) await target.send({content:`📜 **Transcript fechado** • ${channel.name}\n👤 Fechado por: ${closedBy}`,files:[new AttachmentBuilder(full,{name:filename})]});
  return full;
}

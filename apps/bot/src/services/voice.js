"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startVoice = startVoice;
exports.stopVoice = stopVoice;
exports.topVoice = topVoice;
exports.memberVoiceSeconds = memberVoiceSeconds;
const db_js_1 = require("./db.js");
async function startVoice(guildId, userId, channelId, displayName, username) {
    await db_js_1.db.member.upsert({ where: { id: userId }, create: { id: userId, guildId, displayName, username }, update: { displayName, username } });
    const active = await db_js_1.db.voiceSession.findFirst({ where: { guildId, memberId: userId, endedAt: null } });
    if (!active)
        await db_js_1.db.voiceSession.create({ data: { guildId, memberId: userId, channelId, startedAt: new Date() } });
}
async function stopVoice(guildId, userId) {
    const active = await db_js_1.db.voiceSession.findFirst({ where: { guildId, memberId: userId, endedAt: null }, orderBy: { startedAt: 'desc' } });
    if (!active)
        return;
    const endedAt = new Date();
    const seconds = Math.max(0, Math.floor((endedAt.getTime() - active.startedAt.getTime()) / 1000));
    await db_js_1.db.voiceSession.update({ where: { id: active.id }, data: { endedAt, seconds } });
}
async function topVoice(guildId, limit = 10) {
    const sessions = await db_js_1.db.voiceSession.findMany({ where: { guildId, endedAt: { not: null } } });
    const map = new Map();
    for (const s of sessions) {
        const n = map.get(s.memberId) ?? { name: s.memberId, seconds: 0 };
        n.seconds += s.seconds;
        map.set(s.memberId, n);
    }
    const members = await db_js_1.db.member.findMany({ where: { guildId } });
    for (const m of members) {
        const n = map.get(m.id);
        if (n)
            n.name = m.displayName;
    }
    return [...map.entries()].map(([memberId, v]) => ({ memberId, ...v })).sort((a, b) => b.seconds - a.seconds).slice(0, limit);
}
async function memberVoiceSeconds(guildId, userId) {
    const rows = await db_js_1.db.voiceSession.findMany({ where: { guildId, memberId: userId, endedAt: { not: null } } });
    return rows.reduce((a, b) => a + b.seconds, 0);
}

"use strict";
// apps/bot/src/index.ts
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
require("dotenv/config");
/* =========================================================
   CONFIGURAÇÃO BÁSICA
========================================================= */
const token = process.env.DISCORD_TOKEN;
if (!token) {
    console.error('❌ DISCORD_TOKEN não foi encontrado no arquivo .env.');
    process.exit(1);
}
/* =========================================================
   CLIENT DISCORD
========================================================= */
const client = new discord_js_1.Client({
    intents: [
        discord_js_1.GatewayIntentBits.Guilds,
        discord_js_1.GatewayIntentBits.GuildMembers,
        discord_js_1.GatewayIntentBits.GuildMessages,
        discord_js_1.GatewayIntentBits.MessageContent,
        discord_js_1.GatewayIntentBits.GuildVoiceStates,
    ],
    partials: [
        discord_js_1.Partials.Channel,
        discord_js_1.Partials.Message,
        discord_js_1.Partials.GuildMember,
        discord_js_1.Partials.User,
    ],
});
/* =========================================================
   EVENTO READY
========================================================= */
client.once('ready', (readyClient) => {
    console.log('');
    console.log('👻 ========================================');
    console.log('👻       GHOST SYNDICATE BOT');
    console.log('👻 ========================================');
    console.log('');
    console.log(`✅ Bot conectado como ${readyClient.user.tag}`);
    console.log(`🌐 Servidores: ${readyClient.guilds.cache.size}`);
    console.log(`🆔 ID: ${readyClient.user.id}`);
    console.log('');
    console.log('🚀 Sistema iniciado com sucesso.');
    console.log('');
});
/* =========================================================
   ERROS
========================================================= */
client.on('error', (error) => {
    console.error('❌ Erro no cliente Discord:', error);
});
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled Rejection:', error);
});
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});
/* =========================================================
   ENCERRAMENTO SEGURO
========================================================= */
async function shutdown(signal) {
    console.log('');
    console.log(`🛑 Recebido ${signal}. Encerrando Ghost Syndicate...`);
    client.destroy();
    console.log('✅ Bot encerrado com segurança.');
    process.exit(0);
}
process.on('SIGINT', () => {
    void shutdown('SIGINT');
});
process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
});
/* =========================================================
   LOGIN
========================================================= */
client
    .login(token)
    .catch((error) => {
    console.error('❌ Não foi possível conectar ao Discord.', error);
    process.exit(1);
});

import { Client, GatewayIntentBits, Events } from 'discord.js';
import { config } from './utils/config.js';
import { db } from './services/db.js';
import { registerCommands } from './commands/register.js';
import { onInteraction } from './events/interaction.js';
import { onVoiceState } from './events/voiceState.js';

const client=new Client({intents:[GatewayIntentBits.Guilds,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildMessages,GatewayIntentBits.MessageContent,GatewayIntentBits.GuildVoiceStates]});
client.once(Events.ClientReady,async c=>{ console.log(`👻 ${c.user.tag} online`); await registerCommands(); });
client.on(Events.InteractionCreate,i=>onInteraction(i).catch(e=>console.error('interaction',e)));
client.on(Events.VoiceStateUpdate,(a,b)=>onVoiceState(a,b).catch(e=>console.error('voice',e)));
process.on('SIGINT',async()=>{await db.$disconnect(); client.destroy(); process.exit(0)});
client.login(config.DISCORD_TOKEN);

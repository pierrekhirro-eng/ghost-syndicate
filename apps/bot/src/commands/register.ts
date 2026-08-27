import { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { config } from '../utils/config.js';
const commands=[
 new SlashCommandBuilder().setName('caixa').setDescription('Mostra o caixa atual da Ghost Syndicate'),
 new SlashCommandBuilder().setName('entrada').setDescription('Registra uma entrada no caixa').addIntegerOption(o=>o.setName('valor').setDescription('Valor').setRequired(true).setMinValue(1)).addStringOption(o=>o.setName('motivo').setDescription('Motivo').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
 new SlashCommandBuilder().setName('saida').setDescription('Registra uma saída do caixa').addIntegerOption(o=>o.setName('valor').setDescription('Valor').setRequired(true).setMinValue(1)).addStringOption(o=>o.setName('motivo').setDescription('Motivo').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
 new SlashCommandBuilder().setName('horas').setDescription('Mostra seu tempo em call'),
 new SlashCommandBuilder().setName('ranking-voz').setDescription('Ranking de horas em call'),
 new SlashCommandBuilder().setName('ticket-setup').setDescription('Cria o painel de tickets').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
].map(c=>c.toJSON());
export async function registerCommands(){ const rest=new REST({version:'10'}).setToken(config.DISCORD_TOKEN); await rest.put(Routes.applicationGuildCommands(config.DISCORD_CLIENT_ID,config.DISCORD_GUILD_ID),{body:commands}); }

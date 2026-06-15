require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const commands = [
    new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Verwarnt einen Nutzer')
        .addUserOption(option => option.setName('target').setDescription('Der zu verwarnende Nutzer').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Der Grund für die Verwarnung').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
    new SlashCommandBuilder()
        .setName('kick')
        .setDescription('Kickt einen Nutzer')
        .addUserOption(option => option.setName('target').setDescription('Der zu kickende Nutzer').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Der Grund für den Kick').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
    new SlashCommandBuilder()
        .setName('ban')
        .setDescription('Bannt einen Nutzer')
        .addUserOption(option => option.setName('target').setDescription('Der zu bannende Nutzer').setRequired(true))
        .addStringOption(option => option.setName('reason').setDescription('Der Grund für den Bann').setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
    new SlashCommandBuilder()
        .setName('ticket')
        .setDescription('Erstellt ein Support-Ticket')
].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        await rest.put(
            Routes.applicationCommands(process.env.CLIENT_ID),
            { body: commands },
        );
    } catch (error) {
        console.error(error);
    }
})();
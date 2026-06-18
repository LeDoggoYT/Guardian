require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, ChannelType, ActivityType, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    presence: {
        status: 'dnd',
        activities: [{
            name: 'Wird gestartet',
            type: ActivityType.Custom
        }]
    }
});

const warnings = new Map();
const badWords = [
    'penis', 'arsch', 'depp', 'arschloch', 'hurensohn', 'bastard', 'wichser', 
    'wixxer', 'fotze', 'schlampe', 'nutte', 'missgeburt', 'spast', 'spasti', 
    'fick', 'ficken', 'schwuchtel', 'kanake', 'nazi', 'hundesohn', 'drecksau',
    'wichs', 'wixx', 'hs', 'huso', 'affe', 'lappen', 'opfer', 'pimmel', 'schwanz',
    'fotzenknecht', 'lauch', 'kek', 'alman', 'bimbo', 'neger', 'nigger', 
    'schweinehund', 'kacke', 'scheiße', 'scheiss', 'scheiß', 'dreckskerl', 
    'flittchen', 'stricher', 'hure', 'dirne', 'bordsteinschwalbe', 'vollidiot', 
    'idiot', 'spacko', 'spacken', 'spanner', 'wichsfleck', 'pissnelke', 'pisser', 
    'pissen', 'kackwurst', 'kackbratze', 'dulli', 'schmock', 'trottel', 
    'dummsack', 'dummkopf', 'pedo', 'ratte', 'dreckspack', 'gesindel', 
    'asozialer', 'assi', 'asi', 'mongo', 'behinderter', 'krüppel', 
    'fickschnitzel', 'saftsack', 'sackgesicht'
];

const settingsPath = path.join(__dirname, 'guildSettings.json');

function getSettings(guildId) {
    try {
        if (fs.existsSync(settingsPath)) {
            const data = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
            return data[guildId] || {};
        }
    } catch (error) {}
    return {};
}

async function sendLog(guild, settings, embed) {
    if (!settings.logChannel) return;
    const cleanLogId = settings.logChannel.replace(/[^0-9]/g, '');
    try {
        const channel = await guild.channels.fetch(cleanLogId);
        if (channel) {
            await channel.send({ embeds: [embed] }).catch(() => {});
        }
    } catch (error) {}
}

client.once('clientReady', () => {
    setTimeout(() => {
        client.user.setPresence({
            status: 'online',
            activities: [{
                name: 'Ready',
                type: ActivityType.Custom
            }]
        });
    }, 3500);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const settings = getSettings(message.guild.id);
    const isModerator = message.member?.permissions.has(PermissionsBitField.Flags.ManageMessages);

    if (settings.automod !== false && !isModerator) {
        const messageContentLower = message.content.toLowerCase();
        const containsBadWord = badWords.some(word => messageContentLower.includes(word));
        
        if (containsBadWord) {
            await message.delete().catch(() => {});
            const badWordEmbed = new EmbedBuilder()
                .setColor('#ff6f91')
                .setTitle('Automod')
                .setDescription(`${message.author}, achte auf deine Wortwahl!`)
                .setTimestamp();
            await message.channel.send({ embeds: [badWordEmbed] }).catch(() => {});
            
            const logEmbed = new EmbedBuilder()
                .setColor('#ff6f91')
                .setTitle('Automod: Schimpfwort')
                .setDescription(`**User:** ${message.author}\n**Channel:** ${message.channel}\n**Nachricht:** ${message.content}`)
                .setTimestamp();
            await sendLog(message.guild, settings, logEmbed);
            return;
        }
    }

    if (settings.inviteBlocker !== false && !isModerator) {
        const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9]+/i;
        if (inviteRegex.test(message.content)) {
            await message.delete().catch(() => {});
            const warnEmbed = new EmbedBuilder()
                .setColor('#ff6f91')
                .setTitle('Automod')
                .setDescription(`${message.author}, Einladungslinks sind auf diesem Server nicht erlaubt.`)
                .setTimestamp();
            await message.channel.send({ embeds: [warnEmbed] }).catch(() => {});
            
            const logEmbed = new EmbedBuilder()
                .setColor('#ff6f91')
                .setTitle('Automod: Einladung')
                .setDescription(`**User:** ${message.author}\n**Channel:** ${message.channel}\n**Nachricht:** ${message.content}`)
                .setTimestamp();
            await sendLog(message.guild, settings, logEmbed);
            return;
        }
    }

    const maxMentions = settings.maxMentions || 5;
    if (message.mentions.users.size > maxMentions && !isModerator) {
        await message.delete().catch(() => {});
        const mentionEmbed = new EmbedBuilder()
            .setColor('#ff6f91')
            .setTitle('Automod')
            .setDescription(`${message.author}, du hast zu viele Nutzer auf einmal erwähnt.`)
            .setTimestamp();
        await message.channel.send({ embeds: [mentionEmbed] }).catch(() => {});
        
        const logEmbed = new EmbedBuilder()
            .setColor('#ff6f91')
            .setTitle('Automod: Mass Mentions')
            .setDescription(`**User:** ${message.author}\n**Channel:** ${message.channel}`)
            .setTimestamp();
        await sendLog(message.guild, settings, logEmbed);
        return;
    }
});

client.on('interactionCreate', async interaction => {
    const settings = interaction.guild ? getSettings(interaction.guild.id) : {};

    if (interaction.isButton()) {
        if (interaction.customId === 'claim_ticket') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                return interaction.reply({ content: 'Du hast keine Berechtigung, dieses Ticket zu claimen.', ephemeral: true });
            }
            
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('claim_ticket')
                        .setLabel(`Geclaimt von ${interaction.user.username}`)
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId('delete_ticket')
                        .setLabel('Ticket löschen')
                        .setStyle(ButtonStyle.Danger)
                );
            
            await interaction.update({ components: [row] }).catch(() => {});
            await interaction.channel.send({ content: `Dieses Ticket wird nun von ${interaction.user} bearbeitet.` }).catch(() => {});
            
            const logEmbed = new EmbedBuilder()
                .setColor('#35d5a7')
                .setTitle('Ticket geclaimt')
                .setDescription(`**Ticket:** ${interaction.channel.name}\n**Moderator:** ${interaction.user}`)
                .setTimestamp();
            await sendLog(interaction.guild, settings, logEmbed);
            return;
        }

        if (interaction.customId === 'delete_ticket') {
            if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
                return interaction.reply({ content: 'Du hast keine Berechtigung, dieses Ticket zu löschen.', ephemeral: true });
            }
            await interaction.reply({ content: 'Ticket wird in 10 Sekunden gelöscht.' }).catch(() => {});
            
            const logEmbed = new EmbedBuilder()
                .setColor('#ff6f91')
                .setTitle('Ticket gelöscht')
                .setDescription(`**Ticket:** ${interaction.channel.name}\n**Gelöscht von:** ${interaction.user}`)
                .setTimestamp();
            await sendLog(interaction.guild, settings, logEmbed);
            
            setTimeout(() => {
                interaction.channel.delete().catch(() => {});
            }, 10000);
            return;
        }
    }

    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ticket_reason') {
            const reasonValue = interaction.values[0];
            let reasonText = 'Sonstiges';
            if (reasonValue === 'support') reasonText = 'Allgemeiner Support';
            if (reasonValue === 'report') reasonText = 'Nutzer melden';
            if (reasonValue === 'bug') reasonText = 'Bug Report';

            const ticketChannel = await interaction.guild.channels.create({
                name: `ticket-${interaction.user.username}`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        deny: [PermissionsBitField.Flags.ViewChannel],
                    },
                    {
                        id: interaction.user.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                    },
                ],
            });

            const embed = new EmbedBuilder()
                .setColor('#7c6bff')
                .setTitle('Ticket erstellt')
                .setDescription(`Hallo ${interaction.user}, dein Support-Ticket wurde geöffnet. Ein Moderator wird sich in Kürze um dein Anliegen kümmern.\n\n**Grund:** ${reasonText}`)
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('claim_ticket')
                        .setLabel('Ticket claimen')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('delete_ticket')
                        .setLabel('Ticket löschen')
                        .setStyle(ButtonStyle.Danger)
                );

            await ticketChannel.send({ embeds: [embed], components: [row] }).catch(() => {});
            await interaction.update({ content: `Dein Ticket wurde in ${ticketChannel} erstellt.`, components: [] }).catch(() => {});
            
            const logEmbed = new EmbedBuilder()
                .setColor('#7c6bff')
                .setTitle('Ticket geöffnet')
                .setDescription(`**User:** ${interaction.user}\n**Channel:** ${ticketChannel}\n**Grund:** ${reasonText}`)
                .setTimestamp();
            await sendLog(interaction.guild, settings, logEmbed);
            return;
        }
    }

    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'warn') {
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || 'Kein Grund angegeben';

        if (!target) return interaction.reply({ content: 'Nutzer konnte nicht gefunden werden.', ephemeral: true });

        if (!warnings.has(target.id)) warnings.set(target.id, []);
        warnings.get(target.id).push(reason);

        const count = warnings.get(target.id).length;
        const embed = new EmbedBuilder()
            .setColor('#f5c76b')
            .setTitle('Verwarnung erteilt')
            .setDescription(`${target} wurde verwarnt.\n\n**Grund:** ${reason}\n**Verwarnungen insgesamt:** ${count}`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] }).catch(() => {});

        const logEmbed = new EmbedBuilder()
            .setColor('#f5c76b')
            .setTitle('User verwarnt')
            .setDescription(`**User:** ${target}\n**Moderator:** ${interaction.user}\n**Grund:** ${reason}\n**Gesamt:** ${count}`)
            .setTimestamp();
        await sendLog(interaction.guild, settings, logEmbed);

        if (count >= 3 && target.kickable) {
            await target.kick('Automatische Eskalation nach 3 Verwarnungen').catch(() => {});
            const kickEmbed = new EmbedBuilder().setColor('#ff6f91').setTitle('Automod Eskalation').setDescription(`${target} wurde nach Erreichen von 3 Verwarnungen automatisch gekickt.`).setTimestamp();
            await interaction.channel.send({ embeds: [kickEmbed] }).catch(() => {});
            
            const logKick = new EmbedBuilder()
                .setColor('#ff6f91')
                .setTitle('Automod: User gekickt')
                .setDescription(`**User:** ${target}\n**Grund:** Automatische Eskalation nach 3 Verwarnungen`)
                .setTimestamp();
            await sendLog(interaction.guild, settings, logKick);
        }
    }

    if (commandName === 'kick') {
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || 'Kein Grund angegeben';

        if (!target) return interaction.reply({ content: 'Nutzer konnte nicht gefunden werden.', ephemeral: true });
        if (!target.kickable) return interaction.reply({ content: 'Dieser Nutzer kann nicht gekickt werden.', ephemeral: true });

        await target.kick(reason).catch(() => {});

        const embed = new EmbedBuilder().setColor('#ff6f91').setTitle('Nutzer gekickt').setDescription(`${target} wurde erfolgreich gekickt.\n\n**Grund:** ${reason}`).setTimestamp();
        await interaction.reply({ embeds: [embed] }).catch(() => {});
        
        const logEmbed = new EmbedBuilder()
            .setColor('#ff6f91')
            .setTitle('User gekickt')
            .setDescription(`**User:** ${target}\n**Moderator:** ${interaction.user}\n**Grund:** ${reason}`)
            .setTimestamp();
        await sendLog(interaction.guild, settings, logEmbed);
    }

    if (commandName === 'ban') {
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || 'Kein Grund angegeben';

        if (!target) return interaction.reply({ content: 'Nutzer konnte nicht gefunden werden.', ephemeral: true });
        if (!target.bannable) return interaction.reply({ content: 'Dieser Nutzer kann nicht gebannt werden.', ephemeral: true });

        await target.ban({ reason }).catch(() => {});

        const embed = new EmbedBuilder().setColor('#ff6f91').setTitle('Nutzer gebannt').setDescription(`${target} wurde erfolgreich gebannt.\n\n**Grund:** ${reason}`).setTimestamp();
        await interaction.reply({ embeds: [embed] }).catch(() => {});
        
        const logEmbed = new EmbedBuilder()
            .setColor('#ff6f91')
            .setTitle('User gebannt')
            .setDescription(`**User:** ${target}\n**Moderator:** ${interaction.user}\n**Grund:** ${reason}`)
            .setTimestamp();
        await sendLog(interaction.guild, settings, logEmbed);
    }

    if (commandName === 'ticket') {
        if (settings.tickets === false) {
            return interaction.reply({ content: 'Das Ticketsystem ist auf diesem Server derzeit deaktiviert.', ephemeral: true });
        }

        const menu = new StringSelectMenuBuilder()
            .setCustomId('ticket_reason')
            .setPlaceholder('Wähle einen Grund aus...')
            .addOptions(
                new StringSelectMenuOptionBuilder().setLabel('Allgemeiner Support').setValue('support'),
                new StringSelectMenuOptionBuilder().setLabel('Nutzer melden').setValue('report'),
                new StringSelectMenuOptionBuilder().setLabel('Bug Report').setValue('bug'),
                new StringSelectMenuOptionBuilder().setLabel('Sonstiges').setValue('other')
            );
        
        const row = new ActionRowBuilder().addComponents(menu);
        await interaction.reply({ content: 'Bitte wähle den Grund für dein Ticket:', components: [row], ephemeral: true }).catch(() => {});
    }
});

client.login(process.env.DISCORD_TOKEN);
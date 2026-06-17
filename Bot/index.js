require('dotenv').config();
const express = require('express');
const path = require('path');
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, ChannelType, ActivityType } = require('discord.js');

const app = express();
app.use(express.static(path.join(__dirname, 'Dashboard')));

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

client.once('clientReady', () => {
    console.log(`${client.user.tag} ist online.`);
    
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

    const messageContentLower = message.content.toLowerCase();
    const containsBadWord = badWords.some(word => messageContentLower.includes(word.toLowerCase()));
    
    if (containsBadWord) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            await message.delete().catch(() => {});
            const badWordEmbed = new EmbedBuilder()
                .setColor('#ff6f91')
                .setTitle('Automod')
                .setDescription(`${message.author}, achte auf deine Wortwahl!`)
                .setTimestamp();
            return message.channel.send({ embeds: [badWordEmbed] }).catch(() => {});
        }
    }

    const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9]+/i;
    if (inviteRegex.test(message.content)) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            await message.delete().catch(() => {});
            const warnEmbed = new EmbedBuilder()
                .setColor('#ff6f91')
                .setTitle('Automod')
                .setDescription(`${message.author}, Einladungslinks sind auf diesem Server nicht erlaubt.`)
                .setTimestamp();
            return message.channel.send({ embeds: [warnEmbed] }).catch(() => {});
        }
    }

    if (message.mentions.users.size > 5) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            await message.delete().catch(() => {});
            const mentionEmbed = new EmbedBuilder()
                .setColor('#ff6f91')
                .setTitle('Automod')
                .setDescription(`${message.author}, du hast zu viele Nutzer auf einmal erwähnt.`)
                .setTimestamp();
            return message.channel.send({ embeds: [mentionEmbed] }).catch(() => {});
        }
    }
});

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === 'warn') {
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || 'Kein Grund angegeben';

        if (!target) {
            return interaction.reply({ content: 'Nutzer konnte nicht gefunden werden.', ephemeral: true });
        }

        if (!warnings.has(target.id)) {
            warnings.set(target.id, []);
        }
        warnings.get(target.id).push(reason);

        const count = warnings.get(target.id).length;
        const embed = new EmbedBuilder()
            .setColor('#f5c76b')
            .setTitle('Verwarnung erteilt')
            .setDescription(`${target} wurde verwarnt.\n\n**Grund:** ${reason}\n**Verwarnungen insgesamt:** ${count}`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });

        if (count >= 3) {
            if (target.kickable) {
                await target.kick('Automatische Eskalation nach 3 Verwarnungen');
                const kickEmbed = new EmbedBuilder()
                    .setColor('#ff6f91')
                    .setTitle('Automod Eskalation')
                    .setDescription(`${target} wurde nach Erreichen von 3 Verwarnungen automatisch gekickt.`)
                    .setTimestamp();
                await interaction.channel.send({ embeds: [kickEmbed] });
            }
        }
    }

    if (commandName === 'kick') {
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || 'Kein Grund angegeben';

        if (!target) {
            return interaction.reply({ content: 'Nutzer konnte nicht gefunden werden.', ephemeral: true });
        }
        if (!target.kickable) {
            return interaction.reply({ content: 'Dieser Nutzer kann nicht gekickt werden.', ephemeral: true });
        }

        await target.kick(reason);

        const embed = new EmbedBuilder()
            .setColor('#ff6f91')
            .setTitle('Nutzer gekickt')
            .setDescription(`${target} wurde erfolgreich gekickt.\n\n**Grund:** ${reason}`)
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'ban') {
        const target = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || 'Kein Grund angegeben';

        if (!target) {
            return interaction.reply({ content: 'Nutzer konnte nicht gefunden werden.', ephemeral: true });
        }
        if (!target.bannable) {
            return interaction.reply({ content: 'Dieser Nutzer kann nicht gebannt werden.', ephemeral: true });
        }

        await target.ban({ reason });

        const embed = new EmbedBuilder()
            .setColor('#ff6f91')
            .setTitle('Nutzer gebannt')
            .setDescription(`${target} wurde erfolgreich gebannt.\n\n**Grund:** ${reason}`)
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    }

    if (commandName === 'ticket') {
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
            .setDescription(`Hallo ${interaction.user}, dein Support-Ticket wurde geöffnet. Ein Moderator wird sich in Kürze um dein Anliegen kümmern.`)
            .setTimestamp();

        await ticketChannel.send({ embeds: [embed] });
        await interaction.reply({ content: `Dein Ticket wurde in ${ticketChannel} erstellt.`, ephemeral: true });
    }
});

app.get('/api/status', (req, res) => {
    res.json({
        bot: client.user ? client.user.tag : 'Offline',
        servers: client.guilds.cache.size,
        users: client.guilds.cache.reduce((a, g) => a + g.memberCount, 0),
        ping: client.ws.ping
    });
});

app.listen(3000, () => {
    console.log('Dashboard läuft auf http://localhost:3000');
});

client.login(process.env.DISCORD_TOKEN);
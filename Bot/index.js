const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, ChannelType } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const PREFIX = '!';
const warnings = new Map();

client.once('ready', () => {
    console.log(`${client.user.tag} ist online.`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const inviteRegex = /(discord\.(gg|io|me|li)|discordapp\.com\/invite)\/[a-zA-Z0-9]+/i;
    if (inviteRegex.test(message.content)) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            await message.delete();
            const warnEmbed = new EmbedBuilder()
                .setColor('#ff6f91')
                .setTitle('Automod')
                .setDescription(`${message.author}, Einladungslinks sind auf diesem Server nicht erlaubt.`)
                .setTimestamp();
            return message.channel.send({ embeds: [warnEmbed] });
        }
    }

    if (message.mentions.users.size > 5) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            await message.delete();
            const mentionEmbed = new EmbedBuilder()
                .setColor('#ff6f91')
                .setTitle('Automod')
                .setDescription(`${message.author}, du hast zu viele Nutzer auf einmal erwähnt.`)
                .setTimestamp();
            return message.channel.send({ embeds: [mentionEmbed] });
        }
    }

    if (!message.content.startsWith(PREFIX)) return;

    const args = message.content.slice(PREFIX.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();

    if (command === 'warn') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
            return message.reply('Du hast keine Berechtigung, diesen Befehl auszuführen.');
        }
        const target = message.mentions.members.first();
        if (!target) return message.reply('Bitte erwähne einen Nutzer, den du verwarnen möchtest.');
        const reason = args.slice(1).join(' ') || 'Kein Grund angegeben';

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

        message.channel.send({ embeds: [embed] });

        if (count >= 3) {
            if (target.kickable) {
                await target.kick('Automatische Eskalation nach 3 Verwarnungen');
                const kickEmbed = new EmbedBuilder()
                    .setColor('#ff6f91')
                    .setTitle('Automod Eskalation')
                    .setDescription(`${target} wurde nach Erreichen von 3 Verwarnungen automatisch gekickt.`)
                    .setTimestamp();
                message.channel.send({ embeds: [kickEmbed] });
            }
        }
    }

    if (command === 'kick') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.KickMembers)) {
            return message.reply('Du hast keine Berechtigung, Mitglieder zu kicken.');
        }
        const target = message.mentions.members.first();
        if (!target) return message.reply('Bitte erwähne einen Nutzer, den du kicken möchtest.');
        if (!target.kickable) return message.reply('Dieser Nutzer kann nicht gekickt werden.');

        const reason = args.slice(1).join(' ') || 'Kein Grund angegeben';
        await target.kick(reason);

        const embed = new EmbedBuilder()
            .setColor('#ff6f91')
            .setTitle('Nutzer gekickt')
            .setDescription(`${target} wurde erfolgreich gekickt.\n\n**Grund:** ${reason}`)
            .setTimestamp();
        message.channel.send({ embeds: [embed] });
    }

    if (command === 'ban') {
        if (!message.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return message.reply('Du hast keine Berechtigung, Mitglieder zu bannen.');
        }
        const target = message.mentions.members.first();
        if (!target) return message.reply('Bitte erwähne einen Nutzer, den du bannen möchtest.');
        if (!target.bannable) return message.reply('Dieser Nutzer kann nicht gebannt werden.');

        const reason = args.slice(1).join(' ') || 'Kein Grund angegeben';
        await target.ban({ reason });

        const embed = new EmbedBuilder()
            .setColor('#ff6f91')
            .setTitle('Nutzer gebannt')
            .setDescription(`${target} wurde erfolgreich gebannt.\n\n**Grund:** ${reason}`)
            .setTimestamp();
        message.channel.send({ embeds: [embed] });
    }

    if (command === 'ticket') {
        const ticketChannel = await message.guild.channels.create({
            name: `ticket-${message.author.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: message.guild.roles.everyone.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: message.author.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
            ],
        });

        const embed = new EmbedBuilder()
            .setColor('#7c6bff')
            .setTitle('Ticket erstellt')
            .setDescription(`Hallo ${message.author}, dein Support-Ticket wurde geöffnet. Ein Moderator wird sich in Kürze um dein Anliegen kümmern.`)
            .setTimestamp();

        ticketChannel.send({ embeds: [embed] });
        message.reply(`Dein Ticket wurde in ${ticketChannel} erstellt.`);
    }
});

client.login('DEIN_BOT_TOKEN');
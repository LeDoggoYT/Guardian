require("dotenv").config();

const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");

const settingsPath = path.join(__dirname, "guildSettings.json");

function loadSettings() {
    if (!fs.existsSync(settingsPath)) {
        fs.writeFileSync(settingsPath, "{}");
    }

    return JSON.parse(fs.readFileSync(settingsPath, "utf8"));
}

function saveSettings(settings) {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 4));
}
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

app.use(session({
    secret: process.env.SESSION_SECRET || "guardian-secret",
    resave: false,
    saveUninitialized: false
}));

app.get("/login", (req, res) => {
    const params = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
        response_type: "code",
        scope: "identify guilds"
    });

    res.redirect(`https://discord.com/oauth2/authorize?${params.toString()}`);
});

app.get("/auth/discord/callback", async (req, res) => {
    const code = req.query.code;

    if (!code) return res.send("Kein Code erhalten.");

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            client_secret: process.env.DISCORD_CLIENT_SECRET,
            grant_type: "authorization_code",
            code,
            redirect_uri: process.env.DISCORD_REDIRECT_URI
        })
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
        console.log(tokenData);
        return res.send("Login fehlgeschlagen.");
    }

    req.session.accessToken = tokenData.access_token;
    res.redirect("/");
});

app.get("/api/me", async (req, res) => {
    if (!req.session.accessToken) {
        return res.json({ loggedIn: false });
    }

    const userRes = await fetch("https://discord.com/api/users/@me", {
        headers: {
            Authorization: `Bearer ${req.session.accessToken}`
        }
    });

    const user = await userRes.json();

    res.json({
        loggedIn: true,
        user
    });
});

app.get("/api/guilds", async (req, res) => {
    if (!req.session.accessToken) {
        return res.status(401).json({ error: "Nicht eingeloggt" });
    }

    const userGuildRes = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: {
            Authorization: `Bearer ${req.session.accessToken}`
        }
    });

    const userGuilds = await userGuildRes.json();

    const botGuildRes = await fetch("https://discord.com/api/users/@me/guilds", {
        headers: {
            Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`
        }
    });

    const botGuilds = await botGuildRes.json();

    const botGuildIds = new Set(
        Array.isArray(botGuilds) ? botGuilds.map(guild => guild.id) : []
    );

    const adminGuilds = userGuilds.filter(guild => {
        const permissions = BigInt(guild.permissions);
        const hasManageServer = (permissions & BigInt(0x20)) === BigInt(0x20);
        const hasAdmin = (permissions & BigInt(0x8)) === BigInt(0x8);

        return hasManageServer || hasAdmin;
    });

    const result = adminGuilds.map(guild => {
        const botIsOnServer = botGuildIds.has(guild.id);

        const inviteUrl = new URL("https://discord.com/oauth2/authorize");
        inviteUrl.searchParams.set("client_id", process.env.DISCORD_CLIENT_ID);
        inviteUrl.searchParams.set("permissions", process.env.BOT_INVITE_PERMISSIONS || "8");
        inviteUrl.searchParams.set("scope", "bot applications.commands");
        inviteUrl.searchParams.set("guild_id", guild.id);
        inviteUrl.searchParams.set("disable_guild_select", "true");

        return {
            id: guild.id,
            name: guild.name,
            icon: guild.icon,
            botInstalled: botIsOnServer,
            inviteUrl: inviteUrl.toString(),
            manageUrl: `/server/${guild.id}`
        };
    });

    res.json(result);
});
app.get("/api/server/:id/settings", (req, res) => {
    if (!req.session.accessToken) {
        return res.status(401).json({ error: "Nicht eingeloggt" });
    }

    const guildId = req.params.id;
    const settings = loadSettings();

    if (!settings[guildId]) {
        settings[guildId] = {
            automod: true,
            tickets: true,
            inviteBlocker: true,
            maxMentions: 5,
            logChannel: "",
            welcomeMessage: "Willkommen auf dem Server!"
        };

        saveSettings(settings);
    }

    res.json(settings[guildId]);
});

app.post("/api/server/:id/settings", express.json(), (req, res) => {
    if (!req.session.accessToken) {
        return res.status(401).json({ error: "Nicht eingeloggt" });
    }

    const guildId = req.params.id;
    const settings = loadSettings();

    settings[guildId] = {
        automod: Boolean(req.body.automod),
        tickets: Boolean(req.body.tickets),
        inviteBlocker: Boolean(req.body.inviteBlocker),
        maxMentions: Number(req.body.maxMentions) || 5,
        logChannel: req.body.logChannel || "",
        welcomeMessage: req.body.welcomeMessage || "Willkommen auf dem Server!"
    };

    saveSettings(settings);

    res.json({
        success: true,
        settings: settings[guildId]
    });
});
app.get("/logout", (req, res) => {
    req.session.destroy(() => {
        res.redirect("/");
    });
});

app.get("/server/:id", (req, res) => {
    res.sendFile(path.join(__dirname, "server.html"));
});

app.listen(PORT, () => {
    console.log(`Dashboard läuft auf http://localhost:${PORT}`);
});
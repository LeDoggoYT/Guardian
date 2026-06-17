const guildId = window.location.pathname.split("/").pop();

const serverIdText = document.getElementById("serverId");

const automod = document.getElementById("automod");
const tickets = document.getElementById("tickets");
const inviteBlocker = document.getElementById("inviteBlocker");
const maxMentions = document.getElementById("maxMentions");
const logChannel = document.getElementById("logChannel");
const welcomeMessage = document.getElementById("welcomeMessage");

const saveBtn = document.getElementById("saveBtn");
const saveStatus = document.getElementById("saveStatus");

serverIdText.textContent = `Server ID: ${guildId}`;

async function loadSettings() {
    const res = await fetch(`/api/server/${guildId}/settings`);
    const data = await res.json();

    automod.checked = data.automod;
    tickets.checked = data.tickets;
    inviteBlocker.checked = data.inviteBlocker;
    maxMentions.value = data.maxMentions;
    logChannel.value = data.logChannel;
    welcomeMessage.value = data.welcomeMessage;
}

saveBtn.addEventListener("click", async () => {
    const settings = {
        automod: automod.checked,
        tickets: tickets.checked,
        inviteBlocker: inviteBlocker.checked,
        maxMentions: Number(maxMentions.value),
        logChannel: logChannel.value,
        welcomeMessage: welcomeMessage.value
    };

    const res = await fetch(`/api/server/${guildId}/settings`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(settings)
    });

    const data = await res.json();

    if (data.success) {
        saveStatus.textContent = "Gespeichert!";
        setTimeout(() => {
            saveStatus.textContent = "";
        }, 2000);
    }
});

loadSettings();
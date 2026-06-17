const userInfo = document.getElementById("userInfo");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const serverList = document.getElementById("serverList");
const loginWall = document.getElementById("loginWall");
const overlayLogin = document.getElementById("overlayLogin");

async function loadMe() {
    const res = await fetch("/api/me");
    const data = await res.json();

    if (!data.loggedIn) {
        userInfo.textContent = "Nicht angemeldet";
        loginWall.classList.remove("hidden");
        loginBtn.classList.remove("hidden");
        logoutBtn.classList.add("hidden");
        return;
    }

    loginWall.classList.add("hidden");
    userInfo.textContent = `Angemeldet als ${data.user.username}`;
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");

    loadGuilds();
}

async function loadGuilds() {
    const res = await fetch("/api/guilds");
    const guilds = await res.json();

    console.log("Guilds:", guilds);

    serverList.innerHTML = "";

    if (!Array.isArray(guilds)) {
        serverList.innerHTML = "<p>Server konnten nicht geladen werden.</p>";
        return;
    }

    guilds.forEach(guild => {
        const icon = guild.icon
            ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`
            : "https://cdn.discordapp.com/embed/avatars/0.png";

const button = `<a class="btn small green" href="${guild.manageUrl}">Verwalten</a>`;

        const status = guild.botInstalled
            ? `<p class="installed">Guardian ist installiert</p>`
            : `<p>Guardian ist nicht installiert</p>`;

        const card = document.createElement("div");
        card.className = "server-card";

        card.innerHTML = `
            <img src="${icon}" alt="">
            <div>
                <h3>${guild.name}</h3>
                ${status}
            </div>
            ${button}
        `;

        serverList.appendChild(card);
    });
}

if (overlayLogin) {
    overlayLogin.addEventListener("click", () => {
        loginWall.classList.add("hidden");
    });
}

if (loginBtn) {
    loginBtn.addEventListener("click", () => {
        loginWall.classList.add("hidden");
    });
}

loadMe();
// =====================================
// MATH GAMES — ST ADMIN
// =====================================

const OWNER_LOGIN = "STAdmin";
const OWNER_PASSWORD = "STAdmin123";

const KEYS = {
    players: "math_games_player_data",
    users: "math_games_users",
    admins: "math_games_admins",
    products: "math_games_shop_items",
    promos: "math_games_promocodes",
    logs: "math_games_admin_activity",
    settings: "math_games_settings"
};

let editingLogin = null;

// =====================================
// STORAGE HELPERS
// =====================================

function readData(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value ?? fallback;
    } catch {
        return fallback;
    }
}

function saveData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getPlayers() {
    return readData(KEYS.players, {});
}

function getAdmins() {
    return readData(KEYS.admins, []);
}

function getProducts() {
    return readData(KEYS.products, []);
}

function getPromos() {
    return readData(KEYS.promos, []);
}

function getLogs() {
    return readData(KEYS.logs, []);
}

function getSettings() {
    return {
        maxGold: 100000000,
        maxXP: 100000000,
        maxXD: 1000000,
        maxLevel: 1000,
        maxPromoReward: 1000000,
        maxPromoUses: 100000,
        maxProductPrice: 100000000,
        maxProducts: 500,
        maxXpMultiplier: 10,
        maxGoldMultiplier: 10,
        xpMultiplier: 1,
        goldMultiplier: 1,
        boostHours: 24,
        maintenanceMode: false,
        ...readData(KEYS.settings, {})
    };
}

// Поддерживает как массив игроков, так и объект с логинами.
function getPlayerEntries() {
    const data = getPlayers();

    if (Array.isArray(data)) {
        return data.map((player, index) => ({
            login: String(player.login || player.username || index),
            data: player
        }));
    }

    return Object.entries(data).map(([login, player]) => ({
        login,
        data: player || {}
    }));
}

function savePlayerData(login, updatedPlayer) {
    const data = getPlayers();

    if (Array.isArray(data)) {
        const index = data.findIndex(player =>
            String(player.login || player.username) === login
        );

        if (index !== -1) {
            data[index] = { ...data[index], ...updatedPlayer };
        }
    } else {
        data[login] = {
            ...(data[login] || {}),
            ...updatedPlayer
        };
    }

    saveData(KEYS.players, data);
}

// =====================================
// LOGIN
// =====================================

function loginOwner() {
    const login = document.getElementById("login").value.trim();
    const password = document.getElementById("password").value;

    if (login === OWNER_LOGIN && password === OWNER_PASSWORD) {
        document.getElementById("loginScreen").style.display = "none";
        document.getElementById("adminApp").style.display = "flex";

        refreshAll();
        addLog("Вход владельца в ST Admin");
    } else {
        document.getElementById("loginError").textContent =
            "Неверный логин или пароль!";
    }
}

function logoutOwner() {
    document.getElementById("adminApp").style.display = "none";
    document.getElementById("loginScreen").style.display = "flex";

    document.getElementById("login").value = "";
    document.getElementById("password").value = "";
}

// =====================================
// NAVIGATION
// =====================================

const pageNames = {
    dashboard: "Главная",
    admins: "Администраторы",
    players: "Игроки",
    shop: "Магазин",
    promos: "Промокоды",
    limits: "Глобальные лимиты",
    logs: "Журнал действий"
};

function showPage(page) {
    document.querySelectorAll(".page").forEach(section => {
        section.classList.remove("active");
    });

    document.getElementById(page).classList.add("active");
    document.getElementById("pageTitle").textContent = pageNames[page];

    if (page === "admins") renderAdmins();
    if (page === "players") renderPlayers();
    if (page === "shop") renderShop();
    if (page === "promos") renderPromos();
    if (page === "limits") loadSettings();
    if (page === "logs") renderLogs();
}

// =====================================
// ACTIVITY LOG
// =====================================

function addLog(action) {
    const logs = getLogs();

    logs.unshift({
        action,
        date: new Date().toLocaleString("ru-RU"),
        role: "ST ADMIN"
    });

    saveData(KEYS.logs, logs.slice(0, 500));
}

function renderLogs() {
    const logs = getLogs();

    document.getElementById("logsList").innerHTML =
        logs.length
            ? logs.map(log => `
                <div class="item">
                    <div class="item-info">
                        <strong>${escapeHTML(log.action || "Действие")}</strong>
                        <small>${escapeHTML(log.date || "")}</small>
                    </div>
                    <span>👑</span>
                </div>
            `).join("")
            : "<p>Журнал пока пуст.</p>";
}

// =====================================
// ADMIN MANAGEMENT
// =====================================

function createAdmin() {
    const login = document.getElementById("newAdminLogin").value.trim();
    const password = document.getElementById("newAdminPassword").value;

    if (!login || !password) {
        alert("Заполни логин и пароль!");
        return;
    }

    if (login === OWNER_LOGIN) {
        alert("Этот логин зарезервирован!");
        return;
    }

    let admins = getAdmins();

    if (!Array.isArray(admins)) {
        admins = Object.entries(admins).map(([name, value]) => ({
            login: name,
            ...(typeof value === "object" && value ? value : {})
        }));
    }

    if (admins.some(admin => admin.login === login)) {
        alert("Такой администратор уже существует!");
        return;
    }

    const permissions = {
        players: document.getElementById("permPlayers").checked,
        shop: document.getElementById("permShop").checked,
        promos: document.getElementById("permPromos").checked,
        logs: document.getElementById("permLogs").checked
    };

    admins.push({
        login,
        password,
        role: "admin",
        permissions,
        createdAt: new Date().toISOString()
    });

    saveData(KEYS.admins, admins);

    document.getElementById("newAdminLogin").value = "";
    document.getElementById("newAdminPassword").value = "";

    document.querySelectorAll(".permissions input").forEach(input => {
        input.checked = false;
    });

    addLog("Создан администратор: " + login);
    renderAdmins();
    refreshDashboard();

    alert("Администратор создан!");
}

function renderAdmins() {
    let admins = getAdmins();

    if (!Array.isArray(admins)) {
        admins = Object.entries(admins).map(([login, value]) => ({
            login,
            ...(typeof value === "object" && value ? value : {})
        }));
    }

    document.getElementById("adminsList").innerHTML =
        admins.length
            ? admins.map(admin => `
                <div class="item">
                    <div class="item-info">
                        <strong>🛡️ ${escapeHTML(admin.login || "Без логина")}</strong>
                        <small>${permissionText(admin.permissions)}</small>
                    </div>
                    <div class="item-actions">
                        <button class="danger"
                            onclick="deleteAdmin('${escapeJS(admin.login)}')">
                            Удалить
                        </button>
                    </div>
                </div>
            `).join("")
            : "<p>Администраторов пока нет.</p>";
}

function permissionText(permissions = {}) {
    const names = [];

    if (permissions.players) names.push("Игроки");
    if (permissions.shop) names.push("Магазин");
    if (permissions.promos) names.push("Промокоды");
    if (permissions.logs) names.push("Журнал");

    return names.length ? names.join(" • ") : "Нет разрешений";
}

function deleteAdmin(login) {
    if (!confirm("Удалить администратора " + login + "?")) return;

    let admins = getAdmins();

    if (Array.isArray(admins)) {
        admins = admins.filter(admin => admin.login !== login);
    } else {
        delete admins[login];
    }

    saveData(KEYS.admins, admins);

    addLog("Удалён администратор: " + login);
    renderAdmins();
    refreshDashboard();
}

// =====================================
// PLAYER MANAGEMENT
// =====================================

function getValue(player, keys) {
    for (const key of keys) {
        if (player[key] !== undefined) return player[key];
    }
    return 0;
}

function renderPlayers() {
    const search = document.getElementById("playerSearch").value
        .trim().toLowerCase();

    const entries = getPlayerEntries().filter(entry =>
        entry.login.toLowerCase().includes(search)
    );

    document.getElementById("playersList").innerHTML =
        entries.length
            ? entries.map(({ login, data }) => `
                <div class="item">
                    <div class="item-info">
                        <strong>👤 ${escapeHTML(login)}</strong>
                        <small>
                            GOLD: ${Number(getValue(data, ["gold", "GOLD"])) || 0}
                            • XP: ${Number(getValue(data, ["xp", "XP"])) || 0}
                            • XD: ${Number(getValue(data, ["xd", "XD"])) || 0}
                            • LVL: ${Number(getValue(data, ["level", "lvl"])) || 1}
                        </small>
                    </div>
                    <button onclick="openPlayer('${escapeJS(login)}')">
                        Изменить
                    </button>
                </div>
            `).join("")
            : "<p>Игроки не найдены.</p>";
}

function openPlayer(login) {
    const entry = getPlayerEntries().find(item => item.login === login);
    if (!entry) return;

    const player = entry.data;

    editingLogin = login;

    document.getElementById("editingPlayer").textContent = login;
    document.getElementById("editGold").value =
        getValue(player, ["gold", "GOLD"]);
    document.getElementById("editXP").value =
        getValue(player, ["xp", "XP"]);
    document.getElementById("editXD").value =
        getValue(player, ["xd", "XD"]);
    document.getElementById("editLevel").value =
        getValue(player, ["level", "lvl"]) || 1;

    document.getElementById("playerModal").style.display = "flex";
}

function savePlayer() {
    if (!editingLogin) return;

    const settings = getSettings();
    const entry = getPlayerEntries().find(
        item => item.login === editingLogin
    );

    if (!entry) return;

    const values = {
        gold: readNumber("editGold", settings.maxGold),
        xp: readNumber("editXP", settings.maxXP),
        xd: readNumber("editXD", settings.maxXD),
        level: readNumber("editLevel", settings.maxLevel)
    };

    const updated = {
        ...entry.data,
        ...values
    };

    savePlayerData(editingLogin, updated);

    addLog("Изменены данные игрока: " + editingLogin);

    closeModal();
    renderPlayers();
    refreshDashboard();

    alert("Данные игрока сохранены!");
}

function readNumber(id, maximum) {
    const input = document.getElementById(id);
    const value = Number(input.value);

    if (!Number.isFinite(value) || value < 0) {
        throw new Error("Введи корректное неотрицательное число.");
    }

    return Math.min(Math.floor(value), maximum);
}

function closeModal() {
    document.getElementById("playerModal").style.display = "none";
    editingLogin = null;
}

// =====================================
// SHOP
// =====================================

function addProduct() {
    const name = document.getElementById("productName").value.trim();
    const price = Number(document.getElementById("productPrice").value);
    const icon = document.getElementById("productIcon").value.trim() || "🎁";

    const settings = getSettings();
    const products = getProducts();

    if (!name || !Number.isFinite(price) || price < 0) {
        alert("Введи название и правильную цену!");
        return;
    }

    if (products.length >= settings.maxProducts) {
        alert("Достигнут лимит товаров!");
        return;
    }

    if (price > settings.maxProductPrice) {
        alert("Цена выше глобального лимита!");
        return;
    }

    products.push({
        id: Date.now(),
        name,
        price,
        icon
    });

    saveData(KEYS.products, products);

    document.getElementById("productName").value = "";
    document.getElementById("productPrice").value = "";
    document.getElementById("productIcon").value = "";

    addLog("Добавлен товар: " + name);
    renderShop();
    refreshDashboard();
}

function renderShop() {
    const products = getProducts();

    document.getElementById("shopList").innerHTML =
        products.length
            ? products.map(product => `
                <div class="item">
                    <div class="item-info">
                        <strong>
                            ${escapeHTML(product.icon || "🎁")}
                            ${escapeHTML(product.name || "Товар")}
                        </strong>
                        <small>${Number(product.price) || 0} GOLD</small>
                    </div>
                    <button class="danger"
                        onclick="deleteProduct('${escapeJS(product.id)}')">
                        Удалить
                    </button>
                </div>
            `).join("")
            : "<p>Магазин пока пуст.</p>";
}

function deleteProduct(id) {
    if (!confirm("Удалить этот товар?")) return;

    const products = getProducts().filter(
        product => String(product.id) !== String(id)
    );

    saveData(KEYS.products, products);

    addLog("Удалён товар ID: " + id);
    renderShop();
    refreshDashboard();
}

// =====================================
// PROMO CODES
// =====================================

function addPromo() {
    const code = document.getElementById("promoCode").value
        .trim().toUpperCase();

    const reward = Number(document.getElementById("promoReward").value);
    const uses = Number(document.getElementById("promoUses").value);

    const settings = getSettings();
    const promos = getPromos();

    if (!code || !Number.isFinite(reward) || !Number.isFinite(uses)
        || reward < 0 || uses < 1) {
        alert("Проверь данные промокода!");
        return;
    }

    if (reward > settings.maxPromoReward) {
        alert("Награда выше глобального лимита!");
        return;
    }

    if (uses > settings.maxPromoUses) {
        alert("Количество активаций выше лимита!");
        return;
    }

    if (promos.some(promo =>
        String(promo.code).toUpperCase() === code
    )) {
        alert("Такой промокод уже существует!");
        return;
    }

    promos.push({
        code,
        reward,
        uses,
        used: 0,
        usedBy: [],
        active: true
    });

    saveData(KEYS.promos, promos);

    document.getElementById("promoCode").value = "";
    document.getElementById("promoReward").value = "";
    document.getElementById("promoUses").value = "";

    addLog("Создан промокод: " + code);
    renderPromos();
    refreshDashboard();
}

function renderPromos() {
    const promos = getPromos();

    document.getElementById("promosList").innerHTML =
        promos.length
            ? promos.map(promo => `
                <div class="item">
                    <div class="item-info">
                        <strong>🎁 ${escapeHTML(promo.code || "")}</strong>
                        <small>
                            Награда: ${Number(promo.reward) || 0} GOLD
                            • Использовано: ${Number(promo.used) || 0}
                            / ${Number(promo.uses) || 0}
                            • ${promo.active === false ? "Выключен" : "Активен"}
                        </small>
                    </div>
                    <div class="item-actions">
                        <button class="secondary"
                            onclick="togglePromo('${escapeJS(promo.code)}')">
                            Вкл./Выкл.
                        </button>
                        <button class="danger"
                            onclick="deletePromo('${escapeJS(promo.code)}')">
                            Удалить
                        </button>
                    </div>
                </div>
            `).join("")
            : "<p>Промокодов пока нет.</p>";
}

function togglePromo(code) {
    const promos = getPromos();

    const promo = promos.find(item =>
        String(item.code).toUpperCase() === code.toUpperCase()
    );

    if (!promo) return;

    promo.active = promo.active === false;
    saveData(KEYS.promos, promos);

    addLog("Изменён статус промокода: " + code);
    renderPromos();
}

function deletePromo(code) {
    if (!confirm("Удалить промокод " + code + "?")) return;

    const promos = getPromos().filter(
        promo => String(promo.code).toUpperCase() !== code.toUpperCase()
    );

    saveData(KEYS.promos, promos);

    addLog("Удалён промокод: " + code);
    renderPromos();
    refreshDashboard();
}

// =====================================
// GLOBAL SETTINGS
// =====================================

const settingFields = [
    "maxGold",
    "maxXP",
    "maxXD",
    "maxLevel",
    "maxPromoReward",
    "maxPromoUses",
    "maxProductPrice",
    "maxProducts",
    "maxXpMultiplier",
    "maxGoldMultiplier",
    "xpMultiplier",
    "goldMultiplier",
    "boostHours"
];

function loadSettings() {
    const settings = getSettings();

    settingFields.forEach(key => {
        document.getElementById(key).value = settings[key];
    });

    document.getElementById("maintenanceMode").checked =
        settings.maintenanceMode === true;
}

function saveSettings() {
    const settings = getSettings();

    const next = { ...settings };

    for (const key of settingFields) {
        const value = Number(document.getElementById(key).value);

        if (!Number.isFinite(value) || value < 0) {
            alert("Проверь значение: " + key);
            return;
        }

        next[key] = value;
    }

    const integerFields = [
        "maxGold", "maxXP", "maxXD", "maxLevel",
        "maxPromoReward", "maxPromoUses", "maxProductPrice",
        "maxProducts", "boostHours"
    ];

    integerFields.forEach(key => {
        next[key] = Math.floor(next[key]);
    });

    if (next.xpMultiplier > next.maxXpMultiplier) {
        alert("Множитель XP выше своего лимита!");
        return;
    }

    if (next.goldMultiplier > next.maxGoldMultiplier) {
        alert("Множитель GOLD выше своего лимита!");
        return;
    }

    next.maintenanceMode =
        document.getElementById("maintenanceMode").checked;

    saveData(KEYS.settings, next);

    addLog("Изменены глобальные настройки");

    document.getElementById("settingsMessage").textContent =
        "Настройки сохранены!";
    document.getElementById("maintenanceStatus").textContent =
        "Режим обслуживания: " +
        (next.maintenanceMode ? "включён" : "выключен");
}

// =====================================
// DASHBOARD
// =====================================

function refreshDashboard() {
    document.getElementById("playersCount").textContent =
        getPlayerEntries().length;

    document.getElementById("adminsCount").textContent =
        Array.isArray(getAdmins())
            ? getAdmins().length
            : Object.keys(getAdmins()).length;

    document.getElementById("productsCount").textContent =
        getProducts().length;

    document.getElementById("promosCount").textContent =
        getPromos().length;

    const settings = getSettings();

    document.getElementById("maintenanceStatus").textContent =
        "Режим обслуживания: " +
        (settings.maintenanceMode ? "включён" : "выключен");
}

function refreshAll() {
    refreshDashboard();
    renderAdmins();
    renderPlayers();
    renderShop();
    renderPromos();
    renderLogs();
}

// =====================================
// SAFE TEXT HELPERS
// =====================================

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function escapeJS(value) {
    return String(value ?? "").replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
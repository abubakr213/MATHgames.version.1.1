const ADMIN_LOGIN = "Abubakr";
const ADMIN_PASSWORD = "adminmin";

const KEYS = {
    users: "math_games_users",
    playerData: "math_games_player_data",
    shop: "math_games_shop_items",
    promos: "math_games_promocodes",
    logs: "math_games_admin_activity"
};

const $ = id => document.getElementById(id);

function read(key, fallback) {
    try {
        return JSON.parse(localStorage.getItem(key)) ?? fallback;
    } catch {
        return fallback;
    }
}

function save(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function getUsers() {
    const data = read(KEYS.users, []);

    if (Array.isArray(data)) {
        return data;
    }

    return Object.entries(data || {}).map(([login, user]) => ({
        ...user,
        login
    }));
}

function getLogin(user, index) {
    return user.login || user.username || user.name || `player_${index + 1}`;
}

function getPlayerData(login, user = {}) {
    const all = read(KEYS.playerData, {});
    const data = all[login] || user.data || {};

    return {
        gold: Number(data.gold ?? user.gold ?? 0),
        xp: Number(data.xp ?? user.xp ?? 0),
        xd: Number(data.xd ?? user.xd ?? 0),
        level: Number(data.level ?? user.level ?? 1)
    };
}

function logAction(message) {
    const logs = read(KEYS.logs, []);

    logs.unshift({
        message,
        date: new Date().toLocaleString("ru-RU")
    });

    save(KEYS.logs, logs.slice(0, 100));
}

function showDashboard() {
    $("loginScreen").classList.add("hidden");
    $("dashboard").classList.remove("hidden");
    renderAll();
}

$("loginForm").addEventListener("submit", event => {
    event.preventDefault();

    if (
        $("adminLogin").value === ADMIN_LOGIN &&
        $("adminPassword").value === ADMIN_PASSWORD
    ) {
        sessionStorage.setItem("math_admin_session", "true");
        showDashboard();
    } else {
        $("loginError").textContent = "Неверный логин или пароль";
    }
});

if (sessionStorage.getItem("math_admin_session") === "true") {
    showDashboard();
}

$("logout").onclick = () => {
    sessionStorage.removeItem("math_admin_session");
    location.reload();
};

/* NAVIGATION */

const titles = {
    overview: "Обзор",
    players: "Игроки",
    shop: "Магазин",
    promos: "Промокоды",
    logs: "Журнал"
};

document.querySelectorAll("[data-page]").forEach(button => {
    button.onclick = () => {
        const page = button.dataset.page;

        document.querySelectorAll(".page").forEach(section => {
            section.classList.add("hidden");
        });

        $(page).classList.remove("hidden");

        document.querySelectorAll("[data-page]").forEach(item => {
            item.classList.toggle("active", item === button);
        });

        $("pageTitle").textContent = titles[page];
    };
});

/* PLAYERS */

function savePlayer(login, values) {
    const users = getUsers();
    const index = users.findIndex(
        (user, i) => getLogin(user, i) === login
    );

    const allData = read(KEYS.playerData, {});
    allData[login] = {
        ...(allData[login] || {}),
        ...values
    };

    save(KEYS.playerData, allData);

    if (index !== -1) {
        users[index] = {
            ...users[index],
            ...values,
            data: {
                ...(users[index].data || {}),
                ...values
            }
        };

        // Сохраняем в исходном формате: массив остаётся массивом,
        // объект остаётся объектом.
        const original = read(KEYS.users, []);
        if (Array.isArray(original)) {
            original[index] = users[index];
            save(KEYS.users, original);
        } else {
            original[login] = {
                ...original[login],
                ...values,
                data: {
                    ...(original[login]?.data || {}),
                    ...values
                }
            };
            save(KEYS.users, original);
        }
    }
}

function renderPlayers(search = "") {
    const table = $("playersTable");
    table.innerHTML = "";

    getUsers().forEach((user, index) => {
        const login = getLogin(user, index);

        if (!login.toLowerCase().includes(search.toLowerCase())) {
            return;
        }

        const data = getPlayerData(login, user);
        const row = document.createElement("tr");

        row.innerHTML = `
            <td>${escapeHTML(login)}</td>
            <td>${data.gold}</td>
            <td>${data.xp}</td>
            <td>${data.xd}</td>
            <td>${data.level}</td>
            <td><button data-edit="${escapeHTML(login)}">Изменить</button></td>
        `;

        table.appendChild(row);
    });

    table.querySelectorAll("[data-edit]").forEach(button => {
        button.onclick = () => openEdit(button.dataset.edit);
    });
}

$("playerSearch").oninput = event => {
    renderPlayers(event.target.value);
};

function openEdit(login) {
    const user = getUsers().find(
        (item, index) => getLogin(item, index) === login
    ) || {};

    const data = getPlayerData(login, user);

    $("editLogin").value = login;
    $("editGold").value = data.gold;
    $("editXP").value = data.xp;
    $("editXD").value = data.xd;
    $("editLevel").value = data.level;

    $("editModal").classList.remove("hidden");
}

$("closeModal").onclick = () => {
    $("editModal").classList.add("hidden");
};

$("editForm").onsubmit = event => {
    event.preventDefault();

    const login = $("editLogin").value;

    savePlayer(login, {
        gold: Math.max(0, Number($("editGold").value)),
        xp: Math.max(0, Number($("editXP").value)),
        xd: Math.max(0, Number($("editXD").value)),
        level: Math.max(1, Number($("editLevel").value))
    });

    logAction("Изменены данные игрока: " + login);

    $("editModal").classList.add("hidden");
    renderAll();
};

/* SHOP */

$("productForm").onsubmit = event => {
    event.preventDefault();

    const products = read(KEYS.shop, []);

    products.push({
        id: Date.now(),
        name: $("productName").value.trim(),
        price: Number($("productPrice").value),
        category: $("productCategory").value.trim(),
        icon: $("productIcon").value.trim() || "🎁"
    });

    save(KEYS.shop, products);
    logAction("Добавлен товар: " + $("productName").value);

    event.target.reset();
    $("productIcon").value = "🎁";

    renderAll();
};

function renderProducts() {
    const products = read(KEYS.shop, []);
    const container = $("productsList");

    container.innerHTML = "";

    if (!products.length) {
        container.textContent = "Товаров пока нет.";
        return;
    }

    products.forEach((product, index) => {
        const item = document.createElement("div");
        item.className = "item";

        item.innerHTML = `
            <div>
                ${escapeHTML(product.icon || "🎁")}
                <b>${escapeHTML(product.name)}</b>
                <small>${escapeHTML(product.category || "")} · ${Number(product.price) || 0} GOLD</small>
            </div>
            <button data-delete="${index}">Удалить</button>
        `;

        container.appendChild(item);
    });

    container.querySelectorAll("[data-delete]").forEach(button => {
        button.onclick = () => {
            const products = read(KEYS.shop, []);
            const removed = products.splice(Number(button.dataset.delete), 1)[0];

            save(KEYS.shop, products);
            logAction("Удалён товар: " + removed.name);
            renderAll();
        };
    });
}

/* PROMOCODES */

$("promoForm").onsubmit = event => {
    event.preventDefault();

    const promos = read(KEYS.promos, []);
    const code = $("promoCode").value.trim().toUpperCase();

    if (promos.some(promo =>
        String(promo.code || promo).toUpperCase() === code
    )) {
        alert("Такой промокод уже существует");
        return;
    }

    promos.push({
        code,
        reward: Number($("promoReward").value),
        uses: Number($("promoLimit").value),
        used: 0,
        active: true
    });

    save(KEYS.promos, promos);
    logAction("Создан промокод: " + code);

    event.target.reset();
    $("promoLimit").value = 1;

    renderAll();
};

function renderPromos() {
    const promos = read(KEYS.promos, []);
    const container = $("promosList");

    container.innerHTML = "";

    if (!promos.length) {
        container.textContent = "Промокодов пока нет.";
        return;
    }

    promos.forEach((promo, index) => {
        const item = document.createElement("div");
        item.className = "item";

        item.innerHTML = `
            <div>
                <b>${escapeHTML(promo.code || promo)}</b>
                <small>${Number(promo.reward) || 0} GOLD · лимит: ${Number(promo.uses) || 1}</small>
            </div>
            <button data-delete="${index}">Удалить</button>
        `;

        container.appendChild(item);
    });

    container.querySelectorAll("[data-delete]").forEach(button => {
        button.onclick = () => {
            const promos = read(KEYS.promos, []);
            const removed = promos.splice(Number(button.dataset.delete), 1)[0];

            save(KEYS.promos, promos);
            logAction("Удалён промокод: " + (removed.code || removed));
            renderAll();
        };
    });
}

/* LOGS */

function renderLogs() {
    const logs = read(KEYS.logs, []);
    const container = $("logsList");

    container.innerHTML = "";

    if (!logs.length) {
        container.textContent = "Действий пока нет.";
        return;
    }

    logs.forEach(log => {
        const item = document.createElement("div");
        item.className = "item";

        item.innerHTML = `
            <div>
                ${escapeHTML(log.message || "")}
                <small>${escapeHTML(log.date || "")}</small>
            </div>
        `;

        container.appendChild(item);
    });
}

/* UPDATE */

function renderAll() {
    $("playerCount").textContent = getUsers().length;
    $("productCount").textContent = read(KEYS.shop, []).length;
    $("promoCount").textContent = read(KEYS.promos, []).length;

    renderPlayers($("playerSearch").value);
    renderProducts();
    renderPromos();
    renderLogs();
}

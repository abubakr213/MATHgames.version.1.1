
const $ = id => document.getElementById(id);

const USERS_KEY = "math_games_users";
const SESSION_KEY = "math_games_session";

let recoveryUser = null;

const translations = {
    ru: {
        title: "Добро пожаловать!",
        subtitle: "Войдите в свой аккаунт Math Games",
        login: "Войти",
        register: "Регистрация",
        username: "Имя пользователя",
        password: "Пароль",
        usernamePlaceholder: "Введите имя пользователя",
        passwordPlaceholder: "Введите пароль",
        registerName: "Придумайте имя",
        registerPassword: "Придумайте пароль",
        repeatPassword: "Повторите пароль",
        create: "Создать аккаунт",
        forgot: "Забыли пароль?",
        recovery: "Восстановление аккаунта",
        continue: "Продолжить",
        newPassword: "Новый пароль",
        save: "Сохранить",
        empty: "Заполните все поля.",
        wrong: "Неверное имя пользователя или пароль.",
        exists: "Это имя уже занято.",
        reserved: "Это имя зарезервировано.",
        short: "Пароль должен содержать минимум 4 символа.",
        mismatch: "Пароли не совпадают.",
        success: "Аккаунт успешно создан!",
        notFound: "Пользователь не найден.",
        passwordChanged: "Пароль успешно изменён!",
        admin: "Открытие панели администратора..."
    },

    uz: {
        title: "Xush kelibsiz!",
        subtitle: "Math Games hisobingizga kiring",
        login: "Kirish",
        register: "Ro‘yxatdan o‘tish",
        username: "Foydalanuvchi nomi",
        password: "Parol",
        usernamePlaceholder: "Foydalanuvchi nomini kiriting",
        passwordPlaceholder: "Parolni kiriting",
        registerName: "Yangi nom yarating",
        registerPassword: "Yangi parol yarating",
        repeatPassword: "Parolni takrorlang",
        create: "Hisob yaratish",
        forgot: "Parolni unutdingizmi?",
        recovery: "Hisobni tiklash",
        continue: "Davom etish",
        newPassword: "Yangi parol",
        save: "Saqlash",
        empty: "Barcha maydonlarni to‘ldiring.",
        wrong: "Login yoki parol noto‘g‘ri.",
        exists: "Bu nom band.",
        reserved: "Bu nom band qilingan.",
        short: "Parol kamida 4 ta belgidan iborat bo‘lsin.",
        mismatch: "Parollar mos kelmadi.",
        success: "Hisob muvaffaqiyatli yaratildi!",
        notFound: "Foydalanuvchi topilmadi.",
        passwordChanged: "Parol muvaffaqiyatli o‘zgartirildi!",
        admin: "Administrator paneli ochilmoqda..."
    }
};

let currentLanguage = localStorage.getItem("math_games_language") || "ru";

function getUsers() {
    return JSON.parse(localStorage.getItem(USERS_KEY) || "[]");
}

function saveUsers(users) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function showMessage(id, message, success = false) {
    const element = $(id);
    element.textContent = message;
    element.style.color = success ? "#4ade80" : "#f87171";
}

function translatePage() {
    const t = translations[currentLanguage];

    $("title").textContent = t.title;
    $("subtitle").textContent = t.subtitle;

    $("loginTab").textContent = t.login;
    $("registerTab").textContent = t.register;
    $("loginLabel").textContent = t.username;
    $("passwordLabel").textContent = t.password;
    $("loginUsername").placeholder = t.usernamePlaceholder;
    $("loginPassword").placeholder = t.passwordPlaceholder;
    $("loginButton").textContent = t.login;
    $("forgotButton").textContent = t.forgot;

    $("registerNameLabel").textContent = t.username;
    $("registerPasswordLabel").textContent = t.password;
    $("repeatPasswordLabel").textContent = t.repeatPassword;
    $("registerUsername").placeholder = t.registerName;
    $("registerPassword").placeholder = t.registerPassword;
    $("repeatPassword").placeholder = t.repeatPassword;
    $("registerButton").textContent = t.create;

    $("recoveryTitle").textContent = t.recovery;
    $("recoveryNameLabel").textContent = t.username;
    $("recoveryButton").textContent = t.continue;

    $("newPasswordTitle").textContent = t.newPassword;
    $("newPasswordLabel").textContent = t.newPassword;
    $("repeatNewPasswordLabel").textContent = t.repeatPassword;
    $("savePasswordButton").textContent = t.save;

    document.documentElement.lang = currentLanguage;
    $("languageSelect").value = currentLanguage;
}

function showForm(formId) {
    ["loginForm", "registerForm", "recoveryForm", "newPasswordForm"]
        .forEach(id => $(id).classList.add("hidden"));

    $(formId).classList.remove("hidden");
    $("loginMessage").textContent = "";
    $("registerMessage").textContent = "";
    $("recoveryMessage").textContent = "";
    $("newPasswordMessage").textContent = "";
}

function setTab(active) {
    $("loginTab").classList.toggle("active", active === "login");
    $("registerTab").classList.toggle("active", active === "register");
}

$("languageSelect").addEventListener("change", event => {
    currentLanguage = event.target.value;
    localStorage.setItem("math_games_language", currentLanguage);
    translatePage();
});

$("loginTab").addEventListener("click", () => {
    showForm("loginForm");
    setTab("login");
});

$("registerTab").addEventListener("click", () => {
    showForm("registerForm");
    setTab("register");
});

// KIRISH
$("loginForm").addEventListener("submit", event => {
    event.preventDefault();

    const t = translations[currentLanguage];
    const username = $("loginUsername").value.trim();
    const password = $("loginPassword").value;

    if (!username) {
        showMessage("loginMessage", t.empty);
        return;
    }

    // Maxsus admin kirishi
    if (username === "AdMIN") {
        window.location.href = "admin.html";
        return;
    }

    if (!password) {
        showMessage("loginMessage", t.empty);
        return;
    }

    const users = getUsers();
    const user = users.find(u => u.username === username);

    if (!user || user.password !== password) {
        showMessage("loginMessage", t.wrong);
        return;
    }

    localStorage.setItem(SESSION_KEY, JSON.stringify({
        username: user.username
    }));

    window.location.href = "index.html";
});

// RO‘YXATDAN O‘TISH
$("registerForm").addEventListener("submit", event => {
    event.preventDefault();

    const t = translations[currentLanguage];
    const username = $("registerUsername").value.trim();
    const password = $("registerPassword").value;
    const repeat = $("repeatPassword").value;

    if (!username || !password || !repeat) {
        showMessage("registerMessage", t.empty);
        return;
    }

    if (username.toLowerCase() === "admin") {
        showMessage("registerMessage", t.reserved);
        return;
    }

    if (password.length < 4) {
        showMessage("registerMessage", t.short);
        return;
    }

    if (password !== repeat) {
        showMessage("registerMessage", t.mismatch);
        return;
    }

    const users = getUsers();

    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
        showMessage("registerMessage", t.exists);
        return;
    }

    users.push({
        username,
        password,
        gold: 100,
        xp: 0,
        xd: 0,
        level: 1
    });

    saveUsers(users);

    showMessage("registerMessage", t.success, true);
    $("registerForm").reset();
});

// PAROLNI TIKLASH
$("forgotButton").addEventListener("click", () => {
    showForm("recoveryForm");
    setTab("");
});

$("recoveryForm").addEventListener("submit", event => {
    event.preventDefault();

    const t = translations[currentLanguage];
    const username = $("recoveryUsername").value.trim();

    const user = getUsers().find(u => u.username === username);

    if (!user) {
        showMessage("recoveryMessage", t.notFound);
        return;
    }

    recoveryUser = username;
    showForm("newPasswordForm");
});

$("newPasswordForm").addEventListener("submit", event => {
    event.preventDefault();

    const t = translations[currentLanguage];
    const password = $("newPassword").value;
    const repeat = $("repeatNewPassword").value;

    if (password.length < 4) {
        showMessage("newPasswordMessage", t.short);
        return;
    }

    if (password !== repeat) {
        showMessage("newPasswordMessage", t.mismatch);
        return;
    }

    const users = getUsers();
    const user = users.find(u => u.username === recoveryUser);

    if (!user) {
        showMessage("newPasswordMessage", t.notFound);
        return;
    }

    user.password = password;
    saveUsers(users);

    showMessage("newPasswordMessage", t.passwordChanged, true);

    recoveryUser = null;

    setTimeout(() => {
        showForm("loginForm");
        setTab("login");
    }, 1000);
});

translatePage();
showForm("loginForm");
setTab("login");

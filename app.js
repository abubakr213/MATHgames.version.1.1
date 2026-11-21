(() => {
  "use strict";

  const USERS_KEY = "math_games_users";
  const ACTIVE_KEY = "math_games_active_login";

  const $ = id => document.getElementById(id);

  function read(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value ?? fallback;
    } catch {
      return fallback;
    }
  }

  function getUsers() {
    const data = read(USERS_KEY, []);
    return Array.isArray(data) ? data : Object.values(data);
  }

  let users = getUsers();
  const activeLogin = localStorage.getItem(ACTIVE_KEY);

  let user = users.find(u => u.login === activeLogin);

  if (!user) {
    location.href = "login.html";
    return;
  }

  let language = localStorage.getItem("math_games_language") || "ru";
  let currentSubject = "Арифметика";
  let currentLevel = user.level || 1;
  let questions = [];
  let questionIndex = 0;
  let correctNow = 0;
  let answered = false;
  let gameStarted = 0;
  let timer = null;

  const translations = {
    ru: {
      home: "Главная",
      levels: "Уровни",
      adventure: "Приключения",
      ranking: "Рейтинг",
      profile: "Профиль",
      statistics: "Статистика",
      shop: "Магазин",
      welcome: "С возвращением!"
    },
    uz: {
      home: "Bosh sahifa",
      levels: "Darajalar",
      adventure: "Sarguzasht",
      ranking: "Reyting",
      profile: "Profil",
      statistics: "Statistika",
      shop: "Do‘kon",
      welcome: "Qaytganingiz bilan!"
    }
  };

  function save() {
    users = getUsers();

    const index = users.findIndex(u => u.login === user.login);

    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }

    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    localStorage.setItem("math_games_player_data", JSON.stringify(user));
  }

  function showToast(message) {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => toast.classList.remove("show"), 2500);
  }

  function getRank(level) {
    if (level >= 301) return "MASTER";
    if (level >= 51) return "PRO";
    return "NOOB";
  }

  function updateDashboard() {
    $("gold").textContent = Number(user.gold || 0).toLocaleString();
    $("xp").textContent = Number(user.xp || 0).toLocaleString();
    $("xd").textContent = user.xd || 0;
    $("streak").textContent = user.streak || 0;
    $("completed").textContent = (user.completed || []).length;

    $("sideName").textContent = user.username;
    $("sideRank").textContent =
      `${getRank(user.level)} · Уровень ${user.level}`;

    $("avatarMini").textContent =
      user.avatar || user.username.charAt(0).toUpperCase();

    $("welcomeName").textContent =
      `${user.username}, продолжай развиваться!`;

    $("profileName").textContent = user.username;
    $("profileLogin").textContent = "@" + user.login;

    $("profileAvatar").textContent =
      user.avatar || user.username.charAt(0).toUpperCase();

    $("newName").value = user.username;
    $("newLogin").value = user.login;

    $("statLevel").textContent = user.level || 1;
    $("statXP").textContent = user.xp || 0;
    $("statCorrect").textContent = user.correct || 0;
    $("statCompleted").textContent = (user.completed || []).length;

    renderSubjects();
    renderLevels();
    renderRanking();
    renderShop();
    applyLanguage();
  }

  function applyLanguage() {
    const dict = translations[language];

    document.documentElement.lang = language;
    $("language").value = language;

    document.querySelectorAll(".nav").forEach(button => {
      const page = button.dataset.page;
      const label = dict[page];

      if (label) {
        const icon = button.textContent.trim().split(" ")[0];
        button.textContent = icon + " " + label;
      }
    });

    const welcome = document.querySelector(".welcome h1");
    welcome.textContent = dict.welcome;
  }

  function renderSubjects() {
    const subjects = [
      ["➕", "Арифметика", "Сложение, вычитание, умножение и деление", 1],
      ["𝑥", "Алгебра", "Уравнения и выражения", 75],
      ["📐", "Геометрия", "Фигуры, углы и площади", 125],
      ["🧠", "Логика", "Задачи на мышление", 150],
      ["📝", "Тесты", "Проверь свои знания", 100]
    ];

    $("subjectGrid").innerHTML = subjects.map(item => {
      const [icon, name, description, unlock] = item;
      const locked = user.level < unlock;

      return `
        <button class="subject-card ${locked ? "locked" : ""}"
          data-subject="${name}" ${locked ? "disabled" : ""}>
          <span class="subject-icon">${icon}</span>
          <h3>${name} ${locked ? "🔒" : ""}</h3>
          <p>${locked ? `Откроется на уровне ${unlock}` : description}</p>
        </button>
      `;
    }).join("");

    document.querySelectorAll("[data-subject]").forEach(button => {
      button.onclick = () => startGame(button.dataset.subject);
    });
  }

  function renderLevels() {
    const maxLevel = Math.min(
      1000,
      Math.max(20, Math.ceil((user.level || 1) / 10) * 10)
    );

    $("levelGrid").innerHTML = Array.from(
      { length: maxLevel },
      (_, index) => index + 1
    ).map(level => {
      const done = (user.completed || []).includes(level);

      return `
        <button class="level ${done ? "done" : ""}"
          data-level="${level}" ${level > user.level ? "disabled" : ""}>
          ${level} ${done ? "✓" : ""}
        </button>
      `;
    }).join("");

    document.querySelectorAll("[data-level]").forEach(button => {
      button.onclick = () => {
        startGame("Арифметика", Number(button.dataset.level));
      };
    });
  }

  function renderRanking() {
    const sorted = [...getUsers()].sort(
      (a, b) => Number(b.xp || 0) - Number(a.xp || 0)
    );

    $("rankingRows").innerHTML = sorted.map((player, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHTML(player.username || player.login)}</td>
        <td>${player.level || 1}</td>
        <td>${Number(player.xp || 0).toLocaleString()}</td>
        <td>${player.xd || 0}</td>
      </tr>
    `).join("");
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

  const products = [
    ["🧊", "Freeze", "Защита серии дней", 250],
    ["🌟", "Золотой аватар", "Украшение профиля", 500],
    ["📦", "Набор заданий", "Дополнительная практика", 350],
    ["⚡", "2X GOLD", "Удвоение GOLD на 1 час", 700],
    ["🚀", "2X XP", "Удвоение XP на 1 час", 700]
  ];

  function renderShop() {
    $("shopGrid").innerHTML = products.map((item, index) => `
      <article class="shop-item">
        <div class="emoji">${item[0]}</div>
        <h3>${item[1]}</h3>
        <p>${item[2]}</p>
        <button class="primary" data-buy="${index}">
          🪙 ${item[3]} GOLD
        </button>
      </article>
    `).join("");

    document.querySelectorAll("[data-buy]").forEach(button => {
      button.onclick = () => buyProduct(Number(button.dataset.buy));
    });
  }

  function buyProduct(index) {
    const item = products[index];

    if (user.gold < item[3]) {
      showToast("Недостаточно GOLD!");
      return;
    }

    user.gold -= item[3];
    user.inventory = user.inventory || [];

    user.inventory.push({
      name: item[1],
      boughtAt: Date.now(),
      expires: index >= 3 ? Date.now() + 3600000 : null
    });

    save();
    updateDashboard();
    showToast("Покупка успешна!");
  }

  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function makeQuestion(subject) {
    let a = randomInt(2, 30);
    let b = randomInt(2, 15);
    let answer;
    let question;

    if (subject === "Арифметика" || subject === "Тесты") {
      const operation = randomInt(0, 3);

      if (operation === 0) {
        answer = a + b;
        question = `${a} + ${b} = ?`;
      } else if (operation === 1) {
        if (a < b) [a, b] = [b, a];
        answer = a - b;
        question = `${a} − ${b} = ?`;
      } else if (operation === 2) {
        answer = a * b;
        question = `${a} × ${b} = ?`;
      } else {
        answer = a;
        question = `${a * b} ÷ ${b} = ?`;
      }
    } else if (subject === "Алгебра") {
      answer = a;
      question = `x + ${b} = ${a + b}. Найди x`;
    } else if (subject === "Геометрия") {
      answer = a * b;
      question = `Площадь прямоугольника ${a} × ${b} равна?`;
    } else {
      answer = a + b;
      question = `У Маши было ${a} яблок. Ей дали ещё ${b}. Сколько стало?`;
    }

    const options = new Set([answer]);

    while (options.size < 4) {
      const wrong = answer + randomInt(-10, 10);
      if (wrong !== answer) options.add(wrong);
    }

    return {
      question,
      answer,
      options: [...options].sort(() => Math.random() - 0.5)
    };
  }

  function startGame(subject, level = user.level) {
    currentSubject = subject;
    currentLevel = level;

    questions = Array.from(
      { length: 10 },
      () => makeQuestion(subject)
    );

    questionIndex = 0;
    correctNow = 0;
    gameStarted = Date.now();

    showPage("game");
    $("gameSubject").textContent = subject.toUpperCase();

    clearInterval(timer);

    timer = setInterval(() => {
      const seconds = Math.floor((Date.now() - gameStarted) / 1000);
      const minutes = Math.floor(seconds / 60);
      const rest = seconds % 60;

      $("gameTimer").textContent =
        `⏱ ${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
    }, 1000);

    showQuestion();
  }

  function showQuestion() {
    answered = false;

    const item = questions[questionIndex];

    $("gameProgress").textContent =
      `Вопрос ${questionIndex + 1} / ${questions.length}`;

    $("question").textContent = item.question;
    $("answerMessage").textContent = "";
    $("nextQuestion").disabled = true;

    $("nextQuestion").textContent =
      questionIndex === 9 ? "Завершить →" : "Следующий вопрос →";

    $("answerOptions").innerHTML = item.options.map(number => `
      <button class="answer" data-answer="${number}">
        ${number}
      </button>
    `).join("");

    document.querySelectorAll("[data-answer]").forEach(button => {
      button.onclick = () => checkAnswer(
        Number(button.dataset.answer),
        button
      );
    });
  }

  function checkAnswer(value, button) {
    if (answered) return;
    answered = true;

    const correctAnswer = questions[questionIndex].answer;

    if (value === correctAnswer) {
      correctNow++;
      button.classList.add("correct");
      $("answerMessage").textContent = "Верно!";
    } else {
      button.classList.add("wrong");
      $("answerMessage").textContent =
        `Правильный ответ: ${correctAnswer}`;
    }

    document.querySelectorAll("[data-answer]").forEach(option => {
      if (Number(option.dataset.answer) === correctAnswer) {
        option.classList.add("correct");
      }
    });

    $("nextQuestion").disabled = false;
  }

  $("nextQuestion").onclick = () => {
    if (!answered) return;

    if (questionIndex < 9) {
      questionIndex++;
      showQuestion();
    } else {
      finishGame();
    }
  };

  function hasActiveBoost(name) {
    return (user.inventory || []).some(item =>
      item.name.includes(name) &&
      item.expires &&
      item.expires > Date.now()
    );
  }

  function finishGame() {
    clearInterval(timer);

    const alreadyCompleted =
      (user.completed || []).includes(currentLevel);

    user.correct = (user.correct || 0) + correctNow;

    let earnedXP = correctNow * 5;
    let earnedGold = Math.max(10, 10 + correctNow * 7);

    if (!alreadyCompleted) {
      user.completed = user.completed || [];
      user.completed.push(currentLevel);
      earnedXP += 10;

      user.level = Math.min(
        1000,
        Math.max(user.level || 1, currentLevel + 1)
      );
    }

    if (hasActiveBoost("2X XP")) earnedXP *= 2;
    if (hasActiveBoost("2X GOLD")) earnedGold *= 2;

    const oldXD = Math.floor((user.xp || 0) / 100);

    user.xp = (user.xp || 0) + earnedXP;
    user.gold = (user.gold || 0) + earnedGold;

    const newXD = Math.floor(user.xp / 100);
    user.xd = (user.xd || 0) + Math.max(0, newXD - oldXD);

    save();
    updateDashboard();

    $("question").textContent = `Результат: ${correctNow} из 10`;

    $("answerOptions").innerHTML = `
      <div class="notice full">
        Награда: +${earnedXP} XP · +${earnedGold} GOLD
        ${alreadyCompleted ? "" : "<br>Новый уровень открыт!"}
      </div>
    `;

    $("answerMessage").textContent = "Результат сохранён.";
    $("nextQuestion").textContent = "На главную";

    $("nextQuestion").onclick = () => {
      $("nextQuestion").onclick = nextQuestionHandler;
      showPage("home");
    };
  }

  function nextQuestionHandler() {
    if (!answered) return;

    if (questionIndex < 9) {
      questionIndex++;
      showQuestion();
    } else {
      finishGame();
    }
  }

  function showPage(pageId) {
    document.querySelectorAll(".page").forEach(page => {
      page.classList.toggle("active", page.id === pageId);
    });

    document.querySelectorAll(".nav").forEach(button => {
      button.classList.toggle(
        "active",
        button.dataset.page === pageId
      );
    });

    if (pageId !== "game") clearInterval(timer);
  }

  document.querySelectorAll(".nav").forEach(button => {
    button.onclick = () => showPage(button.dataset.page);
  });

  $("themeBtn").onclick = () => {
    document.body.classList.toggle("dark");

    localStorage.setItem(
      "math_games_theme",
      document.body.classList.contains("dark") ? "dark" : "light"
    );
  };

  if (localStorage.getItem("math_games_theme") === "dark") {
    document.body.classList.add("dark");
  }

  $("language").onchange = () => {
    language = $("language").value;
    localStorage.setItem("math_games_language", language);
    applyLanguage();
  };

  $("logoutBtn").onclick = () => {
    localStorage.removeItem(ACTIVE_KEY);
    location.href = "login.html";
  };

  $("backFromGame").onclick = () => {
    clearInterval(timer);
    showPage("home");
  };

  $("profileForm").onsubmit = event => {
    event.preventDefault();

    const password = $("profileCurrentPassword").value;
    const newLogin = $("newLogin").value.trim().toLowerCase();

    if (password !== user.password) {
      $("profileMessage").textContent = "Неверный текущий пароль.";
      return;
    }

    if (newLogin.length < 3) {
      $("profileMessage").textContent = "Логин слишком короткий.";
      return;
    }

    users = getUsers();

    if (newLogin !== user.login &&
        users.some(u => u.login === newLogin)) {
      $("profileMessage").textContent = "Этот логин уже занят.";
      return;
    }

    const oldLogin = user.login;

    user.username = $("newName").value.trim();
    user.login = newLogin;

    localStorage.setItem(ACTIVE_KEY, newLogin);
    $("profileCurrentPassword").value = "";

    save();
    updateDashboard();

    $("profileMessage").textContent = "Профиль обновлён.";
  };

  $("passwordForm").onsubmit = event => {
    event.preventDefault();

    if ($("oldPassword").value !== user.password) {
      $("profileMessage").textContent = "Старый пароль неверный.";
      return;
    }

    if ($("newPassword").value !== $("repeatPassword").value) {
      $("profileMessage").textContent = "Пароли не совпадают.";
      return;
    }

    user.password = $("newPassword").value;

    save();
    event.target.reset();

    $("profileMessage").textContent = "Пароль успешно изменён.";
  };

  document.querySelectorAll("[data-area]").forEach(button => {
    button.onclick = () => {
      const area = button.dataset.area;
      $("adventureMessage").textContent =
        area === "mountains"
          ? "Ты выбрал Mountains!"
          : "Ты выбрал Magic Forest!";

      showPage("adventure");
    };
  });

  updateDashboard();
})();

// ==================================
// MATH GAMES — LEVEL SYSTEM
// ==================================

const MAX_LEVEL = 1000;

// Получение информации об уровне
function getLevelInfo(level) {
    let category;
    let startLevel;

    if (level <= 200) {
        category = "Арифметика";
        startLevel = 1;
    } else if (level <= 400) {
        category = "Алгебра";
        startLevel = 201;
    } else if (level <= 600) {
        category = "Геометрия";
        startLevel = 401;
    } else if (level <= 800) {
        category = "Смешанные тесты";
        startLevel = 601;
    } else {
        category = "Логика";
        startLevel = 801;
    }

    const progress = level - startLevel + 1;

    return {
        level,
        category,
        progress,
        specialTest: level % 50 === 0,
        bossTest: level % 100 === 0
    };
}

// Случайное целое число
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ==================================
// GENERATOR
// ==================================

function generateLevelQuestion(level) {
    const info = getLevelInfo(level);

    const difficulty = Math.max(
        1,
        Math.floor((info.progress - 1) / 10) + 1
    );

    let question;
    let answer;

    // 1. АРИФМЕТИКА
    function arithmetic() {
        const max = 10 + difficulty * 15;
        const a = randomInt(1, max);
        const b = randomInt(1, max);

        const operations = ["+", "-", "*", "/"];
        const op = operations[randomInt(0, 3)];

        if (op === "+") {
            question = `${a} + ${b}`;
            answer = a + b;
        }

        if (op === "-") {
            question = `${a + b} - ${b}`;
            answer = a;
        }

        if (op === "*") {
            question = `${a} × ${b}`;
            answer = a * b;
        }

        if (op === "/") {
            question = `${a * b} ÷ ${b}`;
            answer = a;
        }

        if (difficulty >= 5) {
            const c = randomInt(2, 10);
            question = `(${a} + ${b}) × ${c}`;
            answer = (a + b) * c;
        }
    }

    // 2. АЛГЕБРА
    function algebra() {
        const x = randomInt(2, 20 + difficulty * 5);
        const a = randomInt(2, 5 + difficulty);
        const b = randomInt(1, 30 + difficulty * 5);
        const c = a * x + b;

        question = `Найди x: ${a}x + ${b} = ${c}`;
        answer = x;

        if (difficulty >= 5) {
            question = `Найди x: ${a}x - ${b} = ${a * x - b}`;
            answer = x;
        }
    }

    // 3. ГЕОМЕТРИЯ
    function geometry() {
        const a = randomInt(2, 10 + difficulty * 3);
        const b = randomInt(2, 10 + difficulty * 3);

        if (difficulty < 5) {
            question = `Найди площадь прямоугольника: ${a} × ${b}`;
            answer = a * b;
        } else if (difficulty < 10) {
            question = `Периметр прямоугольника со сторонами ${a} и ${b}?`;
            answer = 2 * (a + b);
        } else {
            const side = randomInt(2, 10 + difficulty);
            question = `Найди площадь квадрата со стороной ${side}`;
            answer = side * side;
        }
    }

    // 4. СМЕШАННЫЕ ТЕСТЫ
    function mixed() {
        const types = [
            arithmetic,
            algebra,
            geometry
        ];

        types[randomInt(0, types.length - 1)]();
    }

    // 5. ЛОГИКА
    function logic() {
        const start = randomInt(1, 20 + difficulty * 5);
        const step = randomInt(2, 5 + difficulty);

        question =
            `${start}, ${start + step}, ${start + step * 2}, ` +
            `${start + step * 3}, ?`;

        answer = start + step * 4;

        if (difficulty >= 10) {
            const a = randomInt(2, 10 + difficulty);
            const b = randomInt(2, 10 + difficulty);

            question = `Если ${a} → ${a * a}, то ${b} → ?`;
            answer = b * b;
        }
    }

    // Выбор направления
    if (info.category === "Арифметика") {
        arithmetic();
    } else if (info.category === "Алгебра") {
        algebra();
    } else if (info.category === "Геометрия") {
        geometry();
    } else if (info.category === "Смешанные тесты") {
        mixed();
    } else {
        logic();
    }

    return {
        level,
        category: info.category,
        question,
        answer,
        difficulty,
        timeLimit: Math.max(10, 60 - difficulty),
        specialTest: info.specialTest,
        bossTest: info.bossTest
    };
}
function activatePromo() {
    const input = document.getElementById("promoInput");
    const message = document.getElementById("promoMessage");

    const code = input.value.trim().toUpperCase();

    if (!code) {
        message.textContent = "Введи промокод!";
        return;
    }

    const promos = JSON.parse(
        localStorage.getItem("math_games_promocodes") || "[]"
    );

    const login = localStorage.getItem("math_games_active_login");

    if (!login) {
        message.textContent = "Сначала войди в аккаунт!";
        return;
    }

    const promo = promos.find(p =>
        String(p.code || "").toUpperCase() === code
    );

    if (!promo || promo.active === false) {
        message.textContent = "Промокод не найден!";
        return;
    }

    if ((Number(promo.used) || 0) >= Number(promo.uses || 1)) {
        message.textContent = "Лимит активаций исчерпан!";
        return;
    }

    const usedBy = promo.usedBy || [];

    if (usedBy.includes(login)) {
        message.textContent = "Ты уже использовал этот промокод!";
        return;
    }

    const playerData = JSON.parse(
        localStorage.getItem("math_games_player_data") || "{}"
    );

    if (!playerData[login]) {
        playerData[login] = {};
    }

    playerData[login].gold =
        (Number(playerData[login].gold) || 0) +
        (Number(promo.reward) || 0);

    promo.used = (Number(promo.used) || 0) + 1;
    promo.usedBy = [...usedBy, login];

    localStorage.setItem(
        "math_games_player_data",
        JSON.stringify(playerData)
    );

    localStorage.setItem(
        "math_games_promocodes",
        JSON.stringify(promos)
    );

    message.textContent =
        `Успешно! Получено ${promo.reward} GOLD 🎉`;

    input.value = "";
}

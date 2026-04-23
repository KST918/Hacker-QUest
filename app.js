const output = document.getElementById("output");
const input = document.getElementById("input");

let currentUser = null;
let defaultTasks = [];
let tasks = [];
let progress = {
  currentTask: 0,
  level: 0
};
const levels = ["Гість", "Хакер", "Суперхакер", "Адмін (Root)"];

function writeLine(text, type = "normal") {
  const line = document.createElement("div");
  line.className = `line ${type}`;
  line.textContent = text;
  output.appendChild(line);
  output.scrollTop = output.scrollHeight;
}

function updatePrompt() {
  const promptEl = document.querySelector(".prompt");
  if (promptEl) {
    promptEl.textContent = `${currentUser || "гість"}@консоль:~$`;
  }
}

function getProgressKey(name) {
  return `hackQuestProgress_${name}`;
}

function getTasksKey(name) {
  return `hackQuestTasks_${name}`;
}

function saveCurrentUser() {
  if (currentUser) {
    localStorage.setItem("hackQuestCurrentUser", currentUser);
  }
}

function loadCurrentUser() {
  const savedUser = localStorage.getItem("hackQuestCurrentUser");
  if (savedUser) {
    currentUser = savedUser;
  }
  updatePrompt();
}

function saveUserState() {
  if (!currentUser) return;
  localStorage.setItem(getProgressKey(currentUser), JSON.stringify(progress));
  localStorage.setItem(getTasksKey(currentUser), JSON.stringify(tasks));
}

function stableHash(text) {
  let hash = 0;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

function wordToNumber(word) {
  const numberMap = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
    "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20,
    "thirty": 30, "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70,
    "eighty": 80, "ninety": 90, "hundred": 100, "thousand": 1000
  };
  return numberMap[word.toLowerCase()] !== undefined ? numberMap[word.toLowerCase()] : null;
}

function buildUserTasks(name) {
  const userTasks = defaultTasks.map(task => ({ ...task }));
  userTasks.sort((a, b) => {
    const keyA = stableHash(`${name}:${a.title}`);
    const keyB = stableHash(`${name}:${b.title}`);
    return keyA - keyB;
  });
  return userTasks;
}

function shouldRefreshTasks(savedTasks) {
  if (!Array.isArray(savedTasks)) return true;
  if (savedTasks.length !== defaultTasks.length) return true;

  const defaultByCode = new Map(defaultTasks.map(task => [task.code.toLowerCase(), task]));
  return savedTasks.some(task => {
    if (!task || !task.code) return true;
    const defaultTask = defaultByCode.get(task.code.toLowerCase());
    return !defaultTask || task.title !== defaultTask.title || task.hint !== defaultTask.hint;
  });
}

function loadUserState() {
  if (!currentUser) return false;

  const savedTasks = localStorage.getItem(getTasksKey(currentUser));
  if (savedTasks) {
    tasks = JSON.parse(savedTasks);
    if (shouldRefreshTasks(tasks)) {
      tasks = buildUserTasks(currentUser);
      localStorage.setItem(getTasksKey(currentUser), JSON.stringify(tasks));
      writeLine("Оновлено список завдань для поточного користувача.", "success");
    }
  } else {
    tasks = buildUserTasks(currentUser);
    localStorage.setItem(getTasksKey(currentUser), JSON.stringify(tasks));
  }

  const savedProgress = localStorage.getItem(getProgressKey(currentUser));
  if (savedProgress) {
    progress = JSON.parse(savedProgress);
  } else {
    progress = { currentTask: 0, level: 0 };
    localStorage.setItem(getProgressKey(currentUser), JSON.stringify(progress));
  }

  return true;
}

function showWelcome() {
  if (!currentUser) {
    writeLine("Ласкаво просимо до інтерактивного веб-квесту в стилі терміналу.");
    writeLine("Введіть login <ім'я>, щоб почати зі своїм прогресом.");
    writeLine("Наприклад: login Олексій");
    writeLine("Введіть help, щоб побачити команди.");
    return;
  }

  writeLine(`Користувач: ${currentUser}`);
  writeLine("Ласкаво просимо до інтерактивного веб-квесту в стилі терміналу.");
  writeLine("Кожен гість стає хакером і йде до рівня Root.");
  writeLine("Введіть help, щоб побачити доступні команди.");
  writeLine(`Поточний рівень: ${levels[progress.level]}`);
  if (progress.currentTask < tasks.length) {
    writeLine(`Завдання ${progress.currentTask + 1}: ${tasks[progress.currentTask].title}`);
  } else {
    writeLine("Усі завдання пройдені. Ви досягли Root!", "success");
  }
}

function showHelp() {
  writeLine("Доступні команди:");
  writeLine("login <ім'я> — почати під своїм ім'ям");
  writeLine("logout — вийти з поточного акаунта");
  writeLine("help — показати список команд");
  writeLine("status — поточний рівень і прогрес");
  writeLine("tasks — показати всі завдання");
  writeLine("hint — отримати підказку для поточного завдання");
  writeLine("code <ключ> — ввести знайдений код");
  writeLine("reset — почати заново для поточного користувача");
}

function showStatus() {
  if (!currentUser) {
    writeLine("Спочатку увійдіть: login <ім'я>");
    return;
  }
  writeLine(`Користувач: ${currentUser}`);
  writeLine(`Рівень: ${levels[progress.level]}`);
  writeLine(`Пройдено завдань: ${progress.currentTask}/${tasks.length}`);
  if (progress.currentTask < tasks.length) {
    writeLine(`Наступне завдання: ${tasks[progress.currentTask].title}`);
  }
}

function showTasks() {
  if (!currentUser) {
    writeLine("Спочатку увійдіть: login <ім'я>");
    return;
  }
  if (tasks.length === 0) {
    writeLine("Немає доступних завдань. Можливо, список ще не завантажений або data.json порожній.", "error");
    return;
  }
  tasks.forEach((task, index) => {
    const status = index < progress.currentTask ? "✓" : (index === progress.currentTask ? ">" : " ");
    writeLine(`${status} ${index + 1}. ${task.title}`);
  });
}

function loginUser(name) {
  const userName = name.trim();
  if (!userName) {
    writeLine("Введіть ім'я після login, наприклад: login Anna");
    return;
  }

  currentUser = userName;
  updatePrompt();
  saveCurrentUser();
  if (!loadUserState()) {
    writeLine("Не вдалося завантажити дані користувача.", "error");
    return;
  }

  writeLine(`Вхід виконано як ${currentUser}`, "success");
  showStatus();
}

function logoutUser() {
  if (!currentUser) {
    writeLine("Ви ще не увійшли.");
    return;
  }
  writeLine(`Користувач ${currentUser} вийшов.`, "success");
  currentUser = null;
  tasks = [];
  progress = { currentTask: 0, level: 0 };
  localStorage.removeItem("hackQuestCurrentUser");
  updatePrompt();
  writeLine("Введіть login <ім'я>, щоб почати знову.");
}

function resetQuest() {
  if (!currentUser) {
    writeLine("Спочатку увійдіть: login <ім'я>");
    return;
  }
  progress = { currentTask: 0, level: 0 };
  saveUserState();
  writeLine("Прогрес скинуто. Починаємо заново.", "success");
  showStatus();
}

function completeTask() {
  progress.currentTask += 1;
  progress.level = Math.min(progress.level + 1, levels.length - 1);
  saveUserState();
  writeLine("Код вірний! Завдання виконано.", "success");
  writeLine(`Ви переходите на рівень: ${levels[progress.level]}`);
  if (progress.currentTask < tasks.length) {
    writeLine(`Наступне завдання: ${tasks[progress.currentTask].title}`);
  } else {
    writeLine("Вітаємо! Ви стали Адміном (Root).", "success");
  }
}

function handleCommand(raw) {
  const command = raw.trim();
  if (!command) return;
  writeLine(`${currentUser || "гість"}@консоль:~$ ${command}`, "command");

  const parts = command.split(" ");
  const main = parts[0].toLowerCase();

  if (main === "login" || main === "name") {
    const name = parts.slice(1).join(" ");
    loginUser(name);
    return;
  }

  switch (main) {
    case "help":
      showHelp();
      break;
    case "logout":
      logoutUser();
      break;
    case "status":
      showStatus();
      break;
    case "tasks":
      showTasks();
      break;
    case "code":
      if (!currentUser) {
        writeLine("Спочатку увійдіть: login <ім'я>");
        break;
      }
      if (parts.length < 2) {
        writeLine("Використайте: code <ключ>");
        break;
      }
      const key = parts.slice(1).join(" ").trim();
      if (progress.currentTask >= tasks.length) {
        writeLine("Ви вже завершили всі завдання.");
        break;
      }
      
      const task = tasks[progress.currentTask];
      let isCorrect = false;
      
      // Якщо це діапазон
      if (task.codeMin && task.codeMax) {
        const userNumber = wordToNumber(key);
        if (userNumber !== null) {
          const minNum = wordToNumber(task.codeMin);
          const maxNum = wordToNumber(task.codeMax);
          isCorrect = userNumber >= minNum && userNumber <= maxNum;
        }
      } else if (task.code) {
        // Якщо це рядок
        isCorrect = key.toLowerCase() === task.code.toLowerCase();
      }
      
      if (isCorrect) {
        completeTask();
      } else {
        writeLine("Невірний код. Спробуйте ще раз.", "error");
        writeLine(`Підказка: ${task.hint}`);
      }
      break;
    case "hint":
      if (!currentUser) {
        writeLine("Спочатку увійдіть: login <ім'я>");
        break;
      }
      if (progress.currentTask >= tasks.length) {
        writeLine("Ви вже завершили всі завдання.");
        break;
      }
      const hintTask = tasks[progress.currentTask];
      writeLine(`Підказка: ${hintTask.hint}`, "hint");
      break;
    case "reset":
      resetQuest();
      break;
    default:
      writeLine(`Невідома команда: ${main}. Введіть help.`, "error");
  }
}

input.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    handleCommand(input.value);
    input.value = "";
  }
});

async function loadTasks() {
  try {
    const response = await fetch("data.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    defaultTasks = await response.json();
  } catch (error) {
    defaultTasks = [];
    writeLine("Помилка завантаження завдань: data.json недоступний.", "error");
    writeLine("Перевірте, що сайт запущено з сервера і файл знаходиться в корені.", "error");
  }
}

(async function() {
  await loadTasks();
  loadCurrentUser();
  if (currentUser) {
    loadUserState();
  }
  showWelcome();
  input.focus();
})();

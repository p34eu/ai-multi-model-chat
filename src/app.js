// ===============================
// GLOBAL STATE
// ===============================
let models = []; // [{id, created, owner}]
let answers = {}; // modelId -> { text, time }
let lastQuestion = "";
let selectedModel = null;
let history = JSON.parse(localStorage.getItem("chatHistory")) || []; // [{ question, answersSnapshot }]
let currentLanguage = localStorage.getItem("language") || "bg"; // 'bg' or 'en'
let collapsedProviders = JSON.parse(localStorage.getItem("collapsedProviders")) || {}; // provider -> boolean
let collapsedFailedGroups = JSON.parse(localStorage.getItem("collapsedFailedGroups")) || {}; // failed group -> boolean
let providerStatus = {}; // provider status from backend
let modelStatuses = {}; // modelId -> { status, timestamp }
let selectedModels = JSON.parse(localStorage.getItem("selectedModels")) || []; // array of model IDs to send to
let hiddenModels = JSON.parse(localStorage.getItem("hiddenModels")) || []; // array of model IDs user marked as not interested
let hiddenProviders = JSON.parse(localStorage.getItem("hiddenProviders")) || []; // array of provider names to hide completely
let successfulModels = []; // array of model IDs that responded successfully in the last query
let failedModelsList = []; // array of permanently failed model IDs from server
let isResultsView = false; // Track if we're showing results
let isSidebarCollapsed = false;
let hasMobileInit = false;
let resultsSort = localStorage.getItem('resultsSort') || 'time'; // 'name' or 'time' - persisted preference
let currentChatModel = null; // model ID for chat mode
let chatHistories = {}; // modelId -> [{role, content, time?}]
let isChatLoading = false; // loading state for chat requests
let currentTheme = localStorage.getItem('theme') || 'dark'; // Available: 'dark', 'light', 'blue', 'ocean', 'sunset', 'nature', 'purple'
const availableThemes = ['dark', 'light', 'blue', 'ocean', 'sunset', 'nature', 'purple'];

// Check if on mobile device
function isMobile() {
  return window.innerWidth <= 768;
}

// ===============================
// TRANSLATIONS
// ===============================

const translations = {
  bg: {
    messagePlaceholder: "Задай вопрос...",
    sendButton: "Изпрати",
    ask: "Попитай",
    models: "Модели",
    history: "История",
    failedModels: "Неработещи модели",
    refreshFailed: "Освежи неработещи модели",
    restoreModel: "Възстанови модел",
    typing: "Пише...",
    comparisonTitle: "Сравнение на отговори",
    clearResults: "Очисти резултати",
    modelInfo: "Информация за модела",
    responseTime: "Време за отговор",
    question: "Въпрос",
    noResponse: "Този модел не е отговорил.",
    loaded1: "Заредени ",
    loaded2: " модела от ",
    loaded3: " доставчици",
    forcedSuffix: "(принудително)",
    openQuestionModal: "Нов въпрос",
    questionSentWait: "Въпросът е изпратен — моля изчакайте отговорите",
    sortBy: "Сортиране по",
    sortName: "Име",
    sortTime: "Време",
    of: "от",
    models: "Модели",
    successfulResponses: "успешни отговори",
    failedResponses: "неработещи отговори",
    replyBtn: "Отговори",
    clearAllFailed: "Очисти всички неработещи модели",
    allFailedCleared: "Всички неработещи модели бяха очистени",
    selectSuccessfulNoResults: "Няма успешни модели за избор",
    failedGroup_quota_exceeded: "Квота превишена",
    failedGroup_timeout: "Timeout",
    failedGroup_network_error: "Мрежна грешка",
    failedGroup_api_error: "API грешка",
    failedGroup_internal_error: "Вътрешна грешка",
    failedGroup_user_deselect: "Премахнати от потребител",
    failedGroup_unknown: "Неизвестно",
    showModel: "Покажи модел",
    hideModel: "Скрий модел",
    chatPlaceholder: "Пиши съобщение...",
    resetCacheSuccess: "Кешът е успешно очищен",
    noModelsSelected: "Моля, избери поне един модел",
    removeModel: "Премахни модел",
    removeModelConfirm: "Да добавя ли този модел към неработещите?",
    removeModelDone: "Моделът беше добавен към неработещите",
    themeDark: "Тъмна",
    themeLight: "Светла",
    themeBlue: "Синя",
    themeOcean: "Океан",
    themeSunset: "Залез",
    themeNature: "Природа",
    themePurple: "Лилава"
  },
  en: {
    messagePlaceholder: "Ask a question...",
    sendButton: "Send",
    ask: "Ask",
    models: "Models",
    history: "History",
    failedModels: "Failed Models",
    refreshFailed: "Refresh failed models",
    restoreModel: "Restore model",
    typing: "Typing...",
    comparisonTitle: "Comparison of responses",
    clearResults: "Clear results",
    modelInfo: "Model info",
    responseTime: "Response Time",
    question: "Question",
    noResponse: "This model did not respond.",
    loaded1: "Loaded ",
    loaded2: " models from ",
    loaded3: " providers",
    forcedSuffix: "(forced)",
    openQuestionModal: "New question",
    sortBy: "Sort by",
    sortName: "Name",
    sortTime: "Time",
    of: "of",
    models: "Models",
    successfulResponses: "successful responses",
    failedResponses: "failed responses",
    replyBtn: "Reply",
    clearAllFailed: "Clear all failed models",
    allFailedCleared: "All failed models have been cleared",
    selectSuccessfulNoResults: "No successful models to select",
    failedGroup_quota_exceeded: "Quota exceeded",
    failedGroup_timeout: "Timeout",
    failedGroup_network_error: "Network error",
    failedGroup_api_error: "API error",
    failedGroup_internal_error: "Internal error",
    failedGroup_user_deselect: "Deselected by user",
    failedGroup_unknown: "Unknown",
    showModel: "Show model",
    hideModel: "Hide model",
    chatPlaceholder: "Type a message...",
    resetCacheSuccess: "Cache successfully cleared",
    noModelsSelected: "Please select at least one model",
    removeModel: "Remove model",
    removeModelConfirm: "Add this model to failed models?",
    removeModelDone: "Model added to failed models",
    themeDark: "Dark",
    themeLight: "Light",
    themeBlue: "Blue",
    themeOcean: "Ocean",
    themeSunset: "Sunset",
    themeNature: "Nature",
    themePurple: "Purple"
  }
};

function t(key) {
  const lang = translations[currentLanguage] || translations.en;
  return lang[key] || key;
}

function updateLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem("language", lang);
  applyTranslations();
}

function applyTranslations() {

// Initialize collapsed providers for mobile
if (Object.keys(collapsedProviders).length === 0 && isMobile()) {
  // Will be set after models are loaded
}

  // Update placeholders
  document.querySelector("#message").placeholder = t("messagePlaceholder");

  // Update section headers

  document.querySelectorAll('span[data-i18n="models"]').forEach((el) => {
    el.textContent = t("models");
  });
  document.querySelectorAll('span[data-i18n="history"]').forEach((el) => {
    el.textContent = t("history");
  });
  document.querySelectorAll('span[data-i18n="failedModels"]').forEach((el) => {
    el.textContent = t("failedModels");
  });

  // Refresh failed models button title and label
  const refreshBtn = document.getElementById("refreshFailedBtn");
  if (refreshBtn) {
    refreshBtn.title = t("refreshFailed");
    refreshBtn.textContent = "⟳";
  }

  const restoreBtn = document.getElementById("restoreSelectedFailedBtn");
  if (restoreBtn) {
    // Ensure label shows selected count when applicable
    restoreBtn.textContent = selectedFailedModels.length > 0
      ? `${t("restoreModel")} (${selectedFailedModels.length})`
      : t("restoreModel");
  }
  // Update typing indicator
  const typingText = document.querySelector("#typingText");
  if (typingText) {
    typingText.textContent = t("typing");
  }

  // Update comparison title if exists
  const comparisonTitle = document.querySelector("#comparisonTable h3");
  if (comparisonTitle) {
    comparisonTitle.textContent = t("comparisonTitle");
  }
  if (resultsPanelTitleEl) {
    resultsPanelTitleEl.textContent = t("comparisonTitle");
  }
  if (clearResultsBtnEl) {
    clearResultsBtnEl.title = t("clearResults");
  }

  // Update selected model info
  const selectedModelInfo = document.querySelector("#selectedModelInfo h2");
  if (selectedModelInfo) {
    selectedModelInfo.textContent = t("modelInfo");
  }

  const modelDetails = document.querySelectorAll(
    "#selectedModelInfo .modelDetails div"
  );
  if (modelDetails.length >= 3) {
    modelDetails[0].innerHTML = modelDetails[0].innerHTML.replace(
      "Актуален към:",
      t("responseTime") + ":"
    );
    modelDetails[1].innerHTML = modelDetails[1].innerHTML.replace(
      "Време за отговор:",
      t("responseTime") + ":"
    );
    modelDetails[2].innerHTML = modelDetails[2].innerHTML.replace(
      "Въпрос:",
      t("question") + ":"
    );

  //     ? `Заредени ${models.length} модела от ${allProviders.length} доставчици`
      //: `Loaded ${models.length} models from ${allProviders.length} providers`;
  
  }

  // Update no response message
  const noResponseEl = document.querySelector("#selectedModelAnswer");
  if (
    noResponseEl &&
    noResponseEl.textContent === "Този модел не е отговорил."
  ) {
    noResponseEl.textContent = t("noResponse");
  }

    const modelsCountEl = document.getElementById("modelsCount");
  if (modelsCountEl) {
     const allProviders = Object.keys(providerStatus);
    modelsCountEl.textContent = `${t("loaded1")}${models.length}${t("loaded2")}${allProviders.length}${t("loaded3")}`;
  }
  // Keep models sort buttons in sync when models are loaded
  try { updateModelsSortButtons(); } catch (e) {}

  // Update button states with proper translations and model counts
  try { updateQuestionButtonState(); } catch (e) {}
}

// ===============================
// DOM
// ===============================
const modelListEl = document.getElementById("modelList");
const historyListEl = document.getElementById("historyList");
const failedModelsListEl = document.getElementById("failedModelsList");
const messageInput = document.getElementById("message");
const sendBtn = document.getElementById("sendBtn");
const typingIndicator = document.getElementById("typingIndicator");
const selectedModelInfoEl = document.getElementById("selectedModelInfo");
const selectedModelAnswerEl = document.getElementById("selectedModelAnswer");
const comparisonTableEl = document.getElementById("comparisonTable");
const resultsPanelEl = document.getElementById("resultsPanel");
const resultsPanelContentEl = document.getElementById("resultsPanelContent");
const resultsPanelTitleEl = document.getElementById("resultsPanelTitle");
const clearResultsBtnEl = document.getElementById("clearResultsBtn");
const toggleResultsPanelBtn = document.getElementById("toggleResultsPanelBtn");
const chatPanelEl = document.getElementById("chatPanel");

// ===============================
// HELPERS
// ===============================
const modelIcons = {
  llama: "🦙",
  gemma: "💎",
  qwen: "🐉",
  mixtral: "🌪️",
  default: "🤖",
};

function getModelIcon(id) {
  const icons = {
    llama: `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#8B4513"/></svg>`,
    gemma: `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#FFD700"/></svg>`,
    qwen: `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#FF4500"/></svg>`,
    mixtral: `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#00CED1"/></svg>`,
    gpt: `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#10a37f"/></svg>`,
    claude: `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#d97706"/></svg>`,
    gemini: `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#4285f4"/></svg>`,
    deepseek: `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#6366f1"/></svg>`,
    openrouter: `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#f97316"/></svg>`,
    huggingface: `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#ffd700"/></svg>`,
    default: `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#3b82f6"/></svg>`,
  };

  if (!id || typeof id !== "string") return icons.default;

  // Remove provider prefixes for icon detection
  const cleanId = id
    .toLowerCase()
    .replace(/^openai-/, "")
    .replace(/^anthropic-/, "")
    .replace(/^google-/, "")
    .replace(/^deepseek-/, "")
    .replace(/^openrouter-/, "")
    .replace(/^huggingface-/, "");

  if (cleanId.includes("llama")) return icons.llama;
  if (cleanId.includes("gemma")) return icons.gemma;
  if (cleanId.includes("qwen")) return icons.qwen;
  if (cleanId.includes("mixtral")) return icons.mixtral;
  if (cleanId.includes("gpt")) return icons.gpt;
  if (cleanId.includes("claude")) return icons.claude;
  if (cleanId.includes("gemini")) return icons.gemini;
  if (cleanId.includes("deepseek")) return icons.deepseek;
  if (cleanId.includes("openrouter")) return icons.openrouter;
  if (cleanId.includes("hugging") || cleanId.includes("hf")) return icons.huggingface;
  return icons.default;
}

function formatCreated(created) {
  if (!created || typeof created !== "number") return "няма данни";
  return new Date(created * 1000).toLocaleDateString("bg-BG");
}

function groupModels(models) {
  const groups = {
    Llama: [],
    Gemma: [],
    Qwen: [],
    Mixtral: [],
    Other: [],
  };

  models.forEach((m) => {
    const id = m.id.toLowerCase();
    if (id.includes("llama")) groups.Llama.push(m);
    else if (id.includes("gemma")) groups.Gemma.push(m);
    else if (id.includes("qwen")) groups.Qwen.push(m);
    else if (id.includes("mixtral")) groups.Mixtral.push(m);
    else groups.Other.push(m);
  });

  return groups;
}

function getSpeedClass(time) {
  if (time < 800) return "speedFast";
  if (time < 2000) return "speedMedium";
  return "speedSlow";
}

function parseMarkdown(text) {
  if (!text) return "";

  // Escape HTML first
  text = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold: **text** or __text__
  text = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__(.*?)__/g, "<strong>$1</strong>");

  // Italic: *text* or _text_
  text = text.replace(/\*(.*?)\*/g, "<em>$1</em>");
  text = text.replace(/_(.*?)_/g, "<em>$1</em>");

  // Inline code: `text`
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Code blocks: ```text```
  text = text.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");

  // Headers: # ## ###
  text = text.replace(/^### (.*$)/gm, "<h3>$1</h3>");
  text = text.replace(/^## (.*$)/gm, "<h2>$1</h2>");
  text = text.replace(/^# (.*$)/gm, "<h1>$1</h1>");

  // Line breaks
  text = text.replace(/\n/g, "<br>");

  return text;
}

function parseMarkdownTable(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return null; // Return null if not a table

  // Find table start: line starting with | followed by separator line
  let tableStart = -1;
  for (let i = 0; i < lines.length - 1; i++) {
    if (
      lines[i].startsWith("|") &&
      lines[i + 1].includes("---") &&
      lines[i + 1].includes("|")
    ) {
      tableStart = i;
      break;
    }
  }
  if (tableStart === -1) return null;

  // Find table end: next non-table line or end
  let tableEnd = tableStart + 2;
  for (let i = tableStart + 2; i < lines.length; i++) {
    if (!lines[i].startsWith("|")) {
      tableEnd = i;
      break;
    } else {
      tableEnd = i + 1;
    }
  }

  const tableLines = lines.slice(tableStart, tableEnd);
  if (tableLines.length < 2) return null;

  const headers = tableLines[0]
    .split("|")
    .slice(1, -1)
    .map((h) => h.trim());
  const rows = [];

  for (let i = 2; i < tableLines.length; i++) {
    if (tableLines[i].trim() === "") continue;
    const cells = tableLines[i]
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length === headers.length) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) return null;

  // Create table element
  const table = document.createElement("table");
  table.className = "markdown-table";

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headers.forEach((h) => {
    const th = document.createElement("th");
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  rows.forEach((rowData) => {
    const row = document.createElement("tr");
    rowData.forEach((cellData) => {
      const td = document.createElement("td");
      td.textContent = cellData;
      row.appendChild(td);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  return table;
}

// ===============================
// LOAD FAILED MODELS
// ===============================
async function loadFailedModels() {
  try {
    const res = await fetch("/api/models/failed");
    const data = await res.json();
    failedModelsList = data.models || [];
    renderFailedModels();

    // Compute counts by error type and show a concise toast summary
    const entries = (failedModelsList || []).map((it) => {
      if (!it) return null;
      if (typeof it === "string") return { id: it, errorType: "unknown" };
      return { id: it.id, errorType: it.errorType || "unknown", timestamp: it.timestamp };
    }).filter(Boolean);

    const order = ["quota_exceeded", "timeout", "network_error", "api_error", "internal_error", "user_deselect", "unknown"];
    const counts = {};
    entries.forEach((e) => {
      counts[e.errorType] = (counts[e.errorType] || 0) + 1;
    });

    const parts = order.filter((type) => counts[type] > 0).map((type) => `${counts[type]} ${t(`failedGroup_${type}`)}`);
    if (parts.length > 0) {
      showMessage(`${t("failedModels")}: ${parts.join(", ")}`);
    }
  } catch (error) {
    console.error("Failed to load failed models:", error);
    failedModelsList = [];
  }
}

let selectedFailedModels = []; // Track selected failed models for bulk restore

function renderFailedModels() {
  if (!failedModelsListEl) return;

  failedModelsListEl.innerHTML = "";

  if (failedModelsList.length === 0) {
    const li = document.createElement("li");
    li.className = "emptyPlaceholder";
    li.textContent = "No failed models";
    failedModelsListEl.appendChild(li);
    return;
  }

  // Group failed models by error type
  const groups = {};
  failedModelsList.forEach((obj) => {
    const type = obj?.errorType || "unknown";
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(obj);
  });

  Object.keys(groups).forEach((type) => {
    const groupDiv = document.createElement("li");
    groupDiv.className = "failedModelGroup";
    
    const headerId = `failedGroup_${type}`;
    const header = document.createElement("div");
    header.className = "failedGroupHeader";
    header.id = headerId;
    header.setAttribute('role', 'button');
    header.setAttribute('aria-expanded', !collapsedFailedGroups[type]);
    header.setAttribute('tabindex', '0');

    const headerContent = document.createElement("div");
    headerContent.className = "headerContent";

    const headerLeft = document.createElement("div");
    headerLeft.className = "headerLeft";

    const arrow = document.createElement("span");
    arrow.className = "expandArrow";
    arrow.innerHTML = collapsedFailedGroups[type] ? "▶" : "▼";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "groupSelectAll";
    checkbox.dataset.group = type;

    const providerTitle = document.createElement("span");
    providerTitle.className = "providerTitle";
    providerTitle.textContent = `${t(`failedGroup_${type}`) || type} (${groups[type].length})`;

    headerLeft.appendChild(arrow);
    headerLeft.appendChild(checkbox);
    headerLeft.appendChild(providerTitle);

    headerContent.appendChild(headerLeft);
    header.appendChild(headerContent);

    // Set checkbox state
    const models = groups[type].map(obj => obj.id);
    const allSelected = models.every(id => selectedFailedModels.includes(id));
    const someSelected = models.some(id => selectedFailedModels.includes(id));
    checkbox.checked = allSelected;
    checkbox.indeterminate = someSelected && !allSelected;

    // Add event listeners
    checkbox.addEventListener('change', (e) => {
      e.stopPropagation();
      const group = e.target.dataset.group;
      const models = groups[group].map(obj => obj.id);
      if (e.target.checked) {
        models.forEach(id => {
          if (!selectedFailedModels.includes(id)) selectedFailedModels.push(id);
        });
      } else {
        selectedFailedModels = selectedFailedModels.filter(id => !models.includes(id));
      }
      updateFailedModelsButtonState();
      renderFailedModels();
    });

    header.addEventListener("click", (e) => {
      if (e.target === checkbox || checkbox.contains(e.target)) return;
      toggleFailedGroup(type);
    });
    header.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggleFailedGroup(type);
      }
    });

    groupDiv.setAttribute('role', 'group');
    groupDiv.setAttribute('aria-labelledby', headerId);
    groupDiv.appendChild(header);

    const list = document.createElement("ul");
    list.className = "failedGroupList";
    list.setAttribute('role', 'list');

    if (collapsedFailedGroups[type]) {
      list.style.display = "none";
    }

    groups[type].forEach((obj) => {
      const li = document.createElement("li");
      li.className = "failedModelItem";
      li.setAttribute('role', 'listitem');

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "failedModelCheckbox";
      checkbox.value = obj.id;
      checkbox.checked = selectedFailedModels.includes(obj.id);
      checkbox.setAttribute('aria-label', obj.id);
      checkbox.onchange = (e) => {
        e.stopPropagation();
        if (e.target.checked) {
          if (!selectedFailedModels.includes(obj.id)) selectedFailedModels.push(obj.id);
        } else {
          selectedFailedModels = selectedFailedModels.filter((m) => m !== obj.id);
        }
        updateFailedModelsButtonState();
        renderFailedModels();
      };

      li.appendChild(checkbox);
      const modelNameSpan = document.createElement("span");
      modelNameSpan.className = "failedModelName";
      modelNameSpan.textContent = obj.id;
      li.appendChild(modelNameSpan);
      list.appendChild(li);
    });

    groupDiv.appendChild(list);
    failedModelsListEl.appendChild(groupDiv);
  });
}


function toggleFailedGroup(type) {
  collapsedFailedGroups[type] = !collapsedFailedGroups[type];
  localStorage.setItem("collapsedFailedGroups", JSON.stringify(collapsedFailedGroups));
  renderFailedModels();
}

function updateFailedModelsButtonState() {
  const restoreBtn = document.getElementById("restoreSelectedFailedBtn");
  if (restoreBtn) {
    restoreBtn.disabled = selectedFailedModels.length === 0;
    restoreBtn.textContent = selectedFailedModels.length > 0 
      ? `${t("restoreModel")} (${selectedFailedModels.length})` 
      : t("restoreModel");
  }
}

async function restoreSelectedFailedModels() {
  if (selectedFailedModels.length === 0) return;
  
  const count = selectedFailedModels.length;
  if (!confirm(`${t("restoreModel")} ${count} модела?`)) return;
  
  try {
    // Restore all selected models
    for (const modelId of selectedFailedModels) {
      await fetch(`/api/models/failed/${encodeURIComponent(modelId)}`, {
        method: "DELETE",
      });
    }
    showMessage(`${count} модела възстановени`);
    selectedFailedModels = [];
    await loadFailedModels();
    await loadModels(true);
  } catch (error) {
    console.error("Failed to restore models:", error);
  }
}

async function clearAllFailedModels() {
  if (!confirm(t("clearAllFailed") + "?")) return;
  
  try {
    const res = await fetch("/api/models/failed", {
      method: "DELETE",
    });
    if (res.ok) {
      showMessage(t("allFailedCleared"));
      selectedFailedModels = [];
      await loadFailedModels();
      await loadModels(true);
    }
  } catch (error) {
    console.error("Failed to clear failed models:", error);
  }
}

function showMessage(text, duration = 3000) {
  let container = document.getElementById("toastContainer");
  if (!container) {
    container = document.createElement("div");
    container.id = "toastContainer";
    document.body.appendChild(container);
  }

  const msg = document.createElement("div");
  msg.className = "successMessage";
  msg.textContent = text;
  container.appendChild(msg);

  // Fade out and remove after duration
  setTimeout(() => {
    msg.classList.add("fadeOut");
    setTimeout(() => msg.remove(), 300);
  }, duration);
}

async function addModelToFailedByUser(modelId) {
  if (!modelId) return;
  const confirmText = t("removeModelConfirm") || "Add this model to failed models?";
  if (!confirm(`${confirmText}\n${modelId}`)) return;

  try {
    const res = await fetch("/api/models/failed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modelId, errorType: "user_deselect" }),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    // Remove model from local selections/visibility
    selectedModels = selectedModels.filter((id) => id !== modelId);
    hiddenModels = hiddenModels.filter((id) => id !== modelId);
    localStorage.setItem("selectedModels", JSON.stringify(selectedModels));
    localStorage.setItem("hiddenModels", JSON.stringify(hiddenModels));

    // Remove from current answers and rerender
    if (answers && answers[modelId]) {
      delete answers[modelId];
    }

    if (currentChatModel === modelId) {
      currentChatModel = null;
      chatPanelEl?.classList.add("hidden");
      resultsPanelEl?.classList.remove("hidden");
      comparisonTableEl?.classList.remove("hidden");
    }

    await loadFailedModels();
    await loadModels(true);
    renderComparisonTable();
    updateSelectionCount();
    showMessage(t("removeModelDone") || "Model added to failed models");
  } catch (error) {
    console.error("Failed to add model to failed list:", error);
  }
}

// ===============================
// LOAD MODELS
// ===============================
async function loadModels(force = false) {
  console.debug("loadModels: fetching /api/models", { force });
  const res = await fetch(`/api/models${force ? "?force=1" : ""}`);
  const data = await res.json();

  if (!data.models || !Array.isArray(data.models)) {
    models = [];
  } else {
    models = data.models.filter((m) => m && m.id);
  }

  // Store provider status
  providerStatus = data.providers || {};

  // Initialize collapsed state for all providers (active and inactive)
  const allProviders = Object.keys(providerStatus);
  allProviders.forEach((provider) => {
    if (!(provider in collapsedProviders)) {
      collapsedProviders[provider] = isMobile(); // Collapse on mobile by default
    }
  });
  localStorage.setItem(
    "collapsedProviders",
    JSON.stringify(collapsedProviders)
  );
 
  console.debug(currentLanguage,"loadModels: loaded models", { count: models.length, providers: Object.keys(providerStatus).length });
  
  // Also fetch model statuses from server
  await fetchModelStatuses();
 
  const modelsCountEl = document.getElementById("modelsCount");
  const loadedMsg = `${t("loaded1")}${models.length}${t("loaded2")}${allProviders.length}${t("loaded3")}${force ? ' ' + t("forcedSuffix") : ''}`;
  if (modelsCountEl) {
    modelsCountEl.textContent = `${t("loaded1")}${models.length}${t("loaded2")}${allProviders.length}${t("loaded3")}`;
  }
  renderModelList();
  // Show toast indicating models loaded; include forced indicator when applicable
  showMessage(loadedMsg);
}

// ===============================
// MODEL STATUS CACHE
// ===============================

// Fetch model statuses from server
async function fetchModelStatuses() {
  try {
    const res = await fetch("/api/models/status");
    if (res.ok) {
      modelStatuses = await res.json();
      console.debug("Model statuses loaded:", Object.keys(modelStatuses).length);
    }
  } catch (e) {
    console.warn("Failed to fetch model statuses:", e.message);
  }
}

// Reset model status cache on server
async function resetModelCache() {
  try {
    const res = await fetch("/api/models/status/reset", { method: "POST" });
    if (res.ok) {
      modelStatuses = {};
      // Show success message
      const msg = document.createElement("div");
      msg.className = "successMessage";
      msg.textContent = t("resetCacheSuccess");
      document.body.appendChild(msg);
      setTimeout(() => msg.remove(), 3000);
      // Re-render model list
      renderModelList();
    }
  } catch (e) {
    console.error("Failed to reset model cache:", e.message);
  }
}

// Check if a model should be hidden based on status (quota/paid only)
// Note: hiddenModels are NOT hidden from rendering, only from sending
function shouldHideModel(modelId) {
  const status = modelStatuses[modelId];
  if (status && (status.status === "quota_exceeded" || status.status === "paid")) {
    return true;
  }
  return false;
}

// Check if a model is user-hidden (for sending)
function isModelUserHidden(modelId) {
  return hiddenModels.includes(modelId);
}

// Check if a model is selected for sending
function isModelSelected(modelId) {
  return selectedModels.includes(modelId);
}

// Toggle model selection
function toggleModelSelection(modelId) {
  const index = selectedModels.indexOf(modelId);
  if (index === -1) {
    selectedModels.push(modelId);
  } else {
    selectedModels.splice(index, 1);
  }
  localStorage.setItem("selectedModels", JSON.stringify(selectedModels));
  updateSelectionCount();
}

// Select all visible models
function selectAllModels() {
  models.forEach((m) => {
    // Skip if model should be hidden (quota exceeded, paid, etc.)
    if (shouldHideModel(m.id)) return;
    // Skip if model belongs to a hidden provider
    if (isProviderHidden(m.provider)) return;
    // Skip if model is user-hidden
    if (isModelUserHidden(m.id)) return;
    // Skip if already selected
    if (selectedModels.includes(m.id)) return;

    selectedModels.push(m.id);
  });
  localStorage.setItem("selectedModels", JSON.stringify(selectedModels));
  renderModelList();
  updateSelectionCount();
}

// Deselect all models from visible providers
function deselectAllModels() {
  // Only deselect models that are not from hidden providers
  selectedModels = selectedModels.filter(modelId => {
    const model = models.find(m => m.id === modelId);
    if (!model) return false; // Remove if model no longer exists
    if (isProviderHidden(model.provider)) return false; // Keep if provider is hidden (so it remains selected when provider is shown again)
    return false; // Deselect all visible models
  });
  localStorage.setItem("selectedModels", JSON.stringify(selectedModels));
  renderModelList();
  updateSelectionCount();
}

// Select all models that responded successfully in the last query
function selectSuccessfulModels() {
  successfulModels.forEach((modelId) => {
    // Skip if model should be hidden (quota exceeded, paid, etc.)
    if (shouldHideModel(modelId)) return;
    // Skip if model belongs to a hidden provider
    const model = models.find(m => m.id === modelId);
    if (model && isProviderHidden(model.provider)) return;
    // Skip if model is user-hidden
    if (isModelUserHidden(modelId)) return;

    if (!selectedModels.includes(modelId)) {
      selectedModels.push(modelId);
    }
  });
  localStorage.setItem("selectedModels", JSON.stringify(selectedModels));
  renderModelList();
  updateSelectionCount();
}

// Toggle hidden status of a model
function toggleModelHidden(modelId) {
  const index = hiddenModels.indexOf(modelId);
  if (index === -1) {
    hiddenModels.push(modelId);
    // Also deselect if hidden
    const selIndex = selectedModels.indexOf(modelId);
    if (selIndex !== -1) {
      selectedModels.splice(selIndex, 1);
    }
  } else {
    hiddenModels.splice(index, 1);
  }
  localStorage.setItem("hiddenModels", JSON.stringify(hiddenModels));
  renderModelList();
  updateSelectionCount();
}

// Toggle hidden status of a provider (hides all models from that provider)
function toggleProviderHidden(providerName) {
  const index = hiddenProviders.indexOf(providerName);
  if (index === -1) {
    hiddenProviders.push(providerName);
    // Hide all models from this provider only for selection/sending
    models.forEach((m) => {
      if (m.provider === providerName && !hiddenModels.includes(m.id)) {
        hiddenModels.push(m.id);
      }
    });
    localStorage.setItem("hiddenModels", JSON.stringify(hiddenModels));
  } else {
    hiddenProviders.splice(index, 1);
    // Unhide all models from this provider
    models.forEach((m) => {
      if (m.provider === providerName) {
        const idx = hiddenModels.indexOf(m.id);
        if (idx !== -1) hiddenModels.splice(idx, 1);
      }
    });
    localStorage.setItem("hiddenModels", JSON.stringify(hiddenModels));
  }
  localStorage.setItem("hiddenProviders", JSON.stringify(hiddenProviders));
  renderModelList();
  updateSelectionCount();
}

// Toggle select/deselect all visible models for a provider
function toggleSelectProvider(providerName) {
  const providerModels = models.filter((m) => m.provider === providerName);
  const visibleModels = providerModels.filter((m) => {
    if (shouldHideModel(m.id)) return false;
    if (isProviderHidden(m.provider)) return false;
    if (isModelUserHidden(m.id)) return false;
    return true;
  });

  if (visibleModels.length === 0) return;

  const anyNotSelected = visibleModels.some((m) => !selectedModels.includes(m.id));

  if (anyNotSelected) {
    // Select all visible models
    visibleModels.forEach((m) => {
      if (!selectedModels.includes(m.id)) selectedModels.push(m.id);
    });
  } else {
    // Deselect all visible models
    selectedModels = selectedModels.filter((id) => {
      const mm = models.find((m) => m.id === id);
      if (!mm) return false;
      if (mm.provider === providerName && !isModelUserHidden(id)) return false;
      return true;
    });
  }

  localStorage.setItem("selectedModels", JSON.stringify(selectedModels));
  renderModelList();
  updateSelectionCount();
}

// Check if a provider is hidden
function isProviderHidden(providerName) {
  return hiddenProviders.includes(providerName);
}

// Update selection count display
function updateSelectionCount() {
  const countEl = document.getElementById("selectedCount");
  if (countEl) {
    // Count only visible models (not hidden, not from hidden providers)
    const visibleModels = models.filter(m => {
      if (shouldHideModel(m.id)) return false; // Skip quota exceeded, paid
      if (isProviderHidden(m.provider)) return false; // Skip hidden providers
      if (isModelUserHidden(m.id)) return false; // Skip user-hidden models
      return true;
    });
    countEl.textContent = `${selectedModels.length}/${visibleModels.length}`;
  }
  // Update question button state
  updateQuestionButtonState();
}

// Update question button state with model count
function updateQuestionButtonState() {
  const btn = document.getElementById("openQuestionBtn");
  if (!btn) return;
  
  const hasSelected = selectedModels.length > 0;
  btn.classList.toggle("disabled", !hasSelected);
  
  const icon = "✉️";
  if (hasSelected) {
    btn.innerHTML = `${icon} ${t("ask")} ${selectedModels.length} ${t("models").toLowerCase()}`;
    btn.title = `${t("ask")} ${selectedModels.length} ${t("models").toLowerCase()}`;
  } else {
    btn.innerHTML = `${icon} ${t("openQuestionModal")}`;
    btn.title = t("noModelsSelected");
  }
  
  // Also update send button with count
  const sendBtn = document.getElementById("sendBtn");
  if (sendBtn) {
    if (hasSelected) {
      sendBtn.textContent = `${t("ask")} ${selectedModels.length} ${t("models").toLowerCase()}`;
    } else {
      sendBtn.textContent = t("sendButton");
    }
  }
}

// Get status icon for a model
function getModelStatusIcon(modelId) {
  const status = modelStatuses[modelId];
  if (!status) return "";
  
  if (status.status === "quota_exceeded") {
    return "<span class=\"statusQuota\" title=\"Quota exceeded\">⚠️</span>";
  }
  if (status.status === "paid") {
    return "<span class=\"statusPaid\" title=\"Paid model\">💰</span>";
  }
  if (status.status === "free") {
    return "<span class=\"statusFree\" title=\"Free model\">✓</span>";
  }
  return "";
}

function renderModelList() {
  if (!modelListEl) {
    console.error("renderModelList: #modelList element not found");
    return;
  }

  modelListEl.innerHTML = "";

  // Group models by provider
  const grouped = {};
  models.forEach((m) => {
    const provider = m.provider || "Unknown";
    if (!grouped[provider]) {
      grouped[provider] = [];
    }
    grouped[provider].push(m);
  });

  // Show all providers (active first, then inactive) with a visual separator
  const allProviderNames = Object.keys(providerStatus).sort();
  const activeProviders = allProviderNames.filter((p) => {
    const s = providerStatus[p];
    return s && s.enabled && s.hasApiKey;
  });
  const inactiveProviders = allProviderNames.filter((p) => !activeProviders.includes(p));
  const orderedProviders = [...activeProviders, ...inactiveProviders];

  orderedProviders.forEach((providerName, idx) => {
    // Insert a separator before the first inactive provider
    if (idx === activeProviders.length && inactiveProviders.length > 0) {
      const sepLi = document.createElement('li');
      sepLi.className = 'providerSeparator';
      const sepDiv = document.createElement('div');
      sepDiv.className = 'separatorText';
      sepDiv.textContent = 'Inactive providers';
      sepLi.appendChild(sepDiv);
      modelListEl.appendChild(sepLi);
    }
      const list = grouped[providerName] || [];
      const status = providerStatus[providerName];
      const isActive = status && status.enabled && status.hasApiKey;

      // Create collapsible provider group as an <li> so it is a proper child of the #modelList <ul>
      const providerGroup = document.createElement("li");
      providerGroup.className = isActive
        ? "providerGroup"
        : "providerGroup inactive";
      providerGroup.dataset.provider = providerName;

      const header = document.createElement("div");
      header.className = isActive
        ? "modelGroupHeader"
        : "modelGroupHeader inactive";
      header.setAttribute("role", "button");
      header.setAttribute("aria-expanded", !collapsedProviders[providerName]);
      header.setAttribute("tabindex", "0");

      const headerContent = document.createElement("div");
      headerContent.className = "headerContent";

      const headerLeft = document.createElement("div");
      headerLeft.className = "headerLeft";

      const arrow = document.createElement("span");
      arrow.className = "expandArrow";
      arrow.innerHTML = collapsedProviders[providerName] ? "▶" : "▼";

      const providerTitle = document.createElement("span");
      providerTitle.className = "providerTitle";
      providerTitle.textContent = providerName;

      headerLeft.appendChild(arrow);
      headerLeft.appendChild(providerTitle);

      const headerRight = document.createElement("div");
      headerRight.className = "headerRight";

      // For inactive providers show only a grayed badge (no interactive controls)
      let providerHideBtn = null;
      if (isActive) {
        const providerModels = list || [];
        const selectedCount = providerModels.filter(m => isModelSelected(m.id) && !isModelUserHidden(m.id)).length;
        const activeCount = providerModels.filter(m => !shouldHideModel(m.id) && !isModelUserHidden(m.id)).length;
        const totalCount = providerModels.length;

        const countsSpan = document.createElement("span");
        countsSpan.className = "providerCounts";
        countsSpan.innerHTML = `(${selectedCount}) • (${activeCount}) ${t("of")} (${totalCount})`;
        countsSpan.style.cursor = 'pointer';
        countsSpan.title = `Selected: ${selectedCount}, Active: ${activeCount}, Total: ${totalCount}`;
        countsSpan.addEventListener('click', (e) => {
          e.stopPropagation();
          toggleSelectProvider(providerName);
        });

        // Hide provider button
        providerHideBtn = document.createElement("button");
        providerHideBtn.className = "providerHideBtn";
        providerHideBtn.title = isProviderHidden(providerName) ? t("showModel") : t("hideModel");
        providerHideBtn.innerHTML = isProviderHidden(providerName) ? "🚫" : "👁️";
        providerHideBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          toggleProviderHidden(providerName);
        });

        headerRight.appendChild(countsSpan);
        headerRight.appendChild(providerHideBtn);
      } else {
        const inactiveLabel = document.createElement("span");
        inactiveLabel.className = "inactiveBadge";
        inactiveLabel.textContent = '⚠ No API Key';
        headerRight.appendChild(inactiveLabel);
      }

      headerContent.appendChild(headerLeft);
      headerContent.appendChild(headerRight);
      header.appendChild(headerContent);

      // Toggle collapse on click for active providers only
      if (isActive) {
        header.addEventListener("click", (e) => {
          // If clicked on the hide button (handled above), ignore
          if (e.target === providerHideBtn || (e.target && providerHideBtn && providerHideBtn.contains && providerHideBtn.contains(e.target))) return;
          toggleProvider(providerName);
        });
        header.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleProvider(providerName);
          }
        });
      }

      // Use a nested <ul> for the provider models so screen readers announce them as lists
      const modelsContainer = document.createElement("ul");
      modelsContainer.className = "providerModels";
      if (collapsedProviders[providerName]) {
        modelsContainer.style.display = "none";
      }

      if (!isActive || list.length === 0) {
        // Show inactive message
        const inactiveMsg = document.createElement("div");
        inactiveMsg.className = "inactiveMessage";
        inactiveMsg.innerHTML = `<span class="inactiveIcon">🔒</span> inactive.`;
        modelsContainer.appendChild(inactiveMsg);
      } else {
              // Show active models (sort within provider according to resultsSort)
        let providerList = (list || []).slice();
        if (resultsSort === 'name') {
          providerList.sort((a, b) => a.id.localeCompare(b.id));
        } else {
          // sort by response time ascending; models without responses go last
          providerList.sort((a, b) => {
            const at = answers[a.id]?.time ?? Infinity;
            const bt = answers[b.id]?.time ?? Infinity;
            if (at === bt) return a.id.localeCompare(b.id);
            return at - bt;
          });
        }

        providerList.forEach((m) => {
          const id = m.id;
          const provider = m.provider || "Unknown";
          const isHidden = isModelUserHidden(id);

          const li = document.createElement("li");
          li.className = "modelItem" + (isHidden ? " modelItemHidden" : "");
          li.dataset.modelId = id;

          // Selection checkbox
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.className = "modelCheckbox";
          checkbox.checked = isModelSelected(id) && !isHidden;
          checkbox.disabled = isHidden;
          checkbox.addEventListener("change", (e) => {
            e.stopPropagation();
            toggleModelSelection(id);
          });

          const icon = document.createElement("span");
          icon.className = "modelIcon";
          icon.innerHTML = getModelIcon(id);

          const nameContainer = document.createElement("div");
          nameContainer.className = "modelNameContainer";

          const name = document.createElement("span");
          name.className = "modelName" + (isHidden ? " modelNameHidden" : "");
          name.textContent = id;

          const providerBadge = document.createElement("span");
          providerBadge.className = "modelProvider";
          providerBadge.textContent = provider;

          nameContainer.appendChild(name);

          const status = document.createElement("span");
          status.className = "modelStatus";
          status.textContent = "…";

          // Hide toggle button
          const hideBtn = document.createElement("button");
          hideBtn.className = "hideModelBtn";
          hideBtn.title = isHidden ? t("showModel") : t("hideModel");
          hideBtn.innerHTML = isHidden ? "🚫" : "👁️";
          hideBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            toggleModelHidden(id);
          });

          li.appendChild(checkbox);
          li.appendChild(icon);
          li.appendChild(nameContainer);
          li.appendChild(status);
          li.appendChild(hideBtn);

          li.onclick = () => selectModel(id);

          modelsContainer.appendChild(li);
        });
      }

      providerGroup.appendChild(header);
      providerGroup.appendChild(modelsContainer);
      modelListEl.appendChild(providerGroup);
    });

    // If there are no providers/models, show a helpful placeholder
    if (Object.keys(providerStatus).length === 0 || models.length === 0) {
      const li = document.createElement("li");
      li.className = "emptyPlaceholder";
      li.textContent = "No models available";
      modelListEl.appendChild(li);
    }

  // Update selection count
  updateSelectionCount();
}

// Toggle provider collapse/expand
function toggleProvider(providerName) {
  collapsedProviders[providerName] = !collapsedProviders[providerName];
  localStorage.setItem(
    "collapsedProviders",
    JSON.stringify(collapsedProviders)
  );

  const providerGroup = document.querySelector(
    `.providerGroup[data-provider="${providerName}"]`
  );
  if (providerGroup) {
    const header = providerGroup.querySelector(".modelGroupHeader");
    const arrow = header.querySelector(".expandArrow");
    const modelsContainer = providerGroup.querySelector(".providerModels");

    if (collapsedProviders[providerName]) {
      arrow.innerHTML = "▶";
      modelsContainer.style.display = "none";
      header.setAttribute("aria-expanded", "false");
    } else {
      arrow.innerHTML = "▼";
      modelsContainer.style.display = "block";
      header.setAttribute("aria-expanded", "true");
    }
  }
}

// Expand/collapse all providers
function toggleAllProviders() {
  const allCollapsed = Object.values(collapsedProviders).every(
    (v) => v === true
  );

  Object.keys(collapsedProviders).forEach((provider) => {
    collapsedProviders[provider] = !allCollapsed;
  });

  localStorage.setItem(
    "collapsedProviders",
    JSON.stringify(collapsedProviders)
  );
  renderModelList();
}

document.getElementById("refreshModels").onclick = () => loadModels(true);
document.getElementById("expandCollapseBtn").onclick = toggleAllProviders;
document.getElementById("clearHistory").onclick = () => {
  history = [];
  localStorage.removeItem("chatHistory");
  renderHistory();
};
// ===============================
// HISTORY
// ===============================

// Update history with chat conversation
function updateChatHistory(modelId) {
  if (!chatHistories[modelId] || chatHistories[modelId].length === 0) return;
  
  // Build the full conversation text from chat history
  const conversationText = chatHistories[modelId]
    .map(msg => {
      const label = msg.role === 'user' ? 'Q' : 'A';
      return `**${label}:** ${msg.content}`;
    })
    .join('\n\n---\n\n');
  
  // Update the answers object with the full conversation
  answers[modelId] = {
    text: conversationText,
    time: answers[modelId]?.time || 0,
    isChat: true
  };
  
  // Find and update the history entry for the current question
  if (lastQuestion) {
    const historyIndex = history.findIndex(h => h.question === lastQuestion);
    if (historyIndex !== -1) {
      history[historyIndex].answersSnapshot = { ...answers };
      localStorage.setItem("chatHistory", JSON.stringify(history));
    }
  }
}

function renderHistory() {
  if (!historyListEl) {
    console.error("renderHistory: #historyList element not found");
    return;
  }

  historyListEl.innerHTML = "";

  if (!history || history.length === 0) {
    const li = document.createElement("li");
    li.className = "emptyPlaceholder";
    li.textContent = "No history";
    historyListEl.appendChild(li);
    return;
  }

  history.forEach((item, idx) => {
    const li = document.createElement("li");
    li.textContent = `${idx + 1}. ${item.question}`;
    li.onclick = () => {
      console.debug('history click', idx, item.question, Object.keys(item.answersSnapshot || {}).length);
      lastQuestion = item.question;
      answers = { ...item.answersSnapshot };
      
      // Clear chat histories when loading a new question to avoid mixing conversations
      chatHistories = {};
      currentChatModel = null;
      
      selectedModel = null;

      document
        .querySelectorAll(".modelItem")
        .forEach((el) => el.classList.remove("activeModel"));

      selectedModelInfoEl.classList.add("hidden");
      selectedModelAnswerEl.classList.add("hidden");

      renderComparisonTable();
    };
    historyListEl.appendChild(li);
  });
}

// ===============================
// SELECT MODEL
// ===============================
function selectModel(id) {
  selectedModel = id;

  document.querySelectorAll(".modelItem").forEach((el) => {
    el.classList.toggle("activeModel", el.dataset.modelId === id);
  });

  const model = models.find((m) => m.id === id);
  const answer = answers[id];
  const isHidden = hiddenModels.includes(id);

  // If the model has a successful answer, scroll to its card in the results
  if (answer && !answer.error && !answer.text.includes("❌")) {
    selectedModelInfoEl.classList.add("hidden");
    selectedModelAnswerEl.classList.add("hidden");
    if (resultsPanelEl) resultsPanelEl.classList.remove("hidden");
    scrollToModelCard(id);

    // On mobile, collapse the sidebar so the result is visible
    if (isMobile()) {
      isSidebarCollapsed = true;
      applyCollapseState();
    }

    return;
  }

  // Otherwise show the details panel (no response / error)
  selectedModelInfoEl.classList.remove("hidden");
  selectedModelAnswerEl.classList.remove("hidden");

  // Hide sidebar on mobile so the details panel is visible
  if (isMobile()) {
    isSidebarCollapsed = true;
    applyCollapseState();
  }

  // Build modelHeader with icon and title
  const modelHeader = document.createElement("div");
  modelHeader.className = "modelHeader";
  
  const title = document.createElement("h2");
  title.innerHTML = getModelIcon(id);
  const nameSpan = document.createElement("span");
  nameSpan.textContent = id;
  title.appendChild(nameSpan);
  
  const hideBtn = document.createElement("button");
  hideBtn.className = "hideModelDetailBtn";
  hideBtn.textContent = isHidden ? '🚫 ' + t('showModel') : '👁️ ' + t('hideModel');
  hideBtn.dataset.modelId = id;
  hideBtn.addEventListener("click", () => {
    toggleModelHidden(id);
    selectModel(id);
  });
  
  modelHeader.appendChild(title);
  modelHeader.appendChild(hideBtn);
  
  // Build modelDetails section
  const modelDetails = document.createElement("div");
  modelDetails.className = "modelDetails";
  
  const createdDiv = document.createElement("div");
  createdDiv.innerHTML = `<strong>${t("responseTime")}:</strong> `;
  const createdSpan = document.createElement("span");
  createdSpan.textContent = formatCreated(model?.created);
  createdDiv.appendChild(createdSpan);
  modelDetails.appendChild(createdDiv);
  
  const timeDiv = document.createElement("div");
  timeDiv.innerHTML = `<strong>${t("responseTime")}:</strong> `;
  const timeSpan = document.createElement("span");
  timeSpan.textContent = answer ? answer.time + " ms" : "няма";
  timeDiv.appendChild(timeSpan);
  modelDetails.appendChild(timeDiv);
  
  const questionDiv = document.createElement("div");
  questionDiv.innerHTML = `<strong>${t("question")}:</strong> <span id="selectedModelQuestion"></span>`;
  modelDetails.appendChild(questionDiv);
  
  // Clear and rebuild the element
  selectedModelInfoEl.innerHTML = "";
  selectedModelInfoEl.appendChild(modelHeader);
  selectedModelInfoEl.appendChild(modelDetails);

  // Safely set the question text to prevent HTML injection
  const questionSpan = selectedModelInfoEl.querySelector('#selectedModelQuestion');
  if (questionSpan) {
    questionSpan.textContent = lastQuestion || "няма";
  }

  selectedModelAnswerEl.textContent = answer ? answer.text : t("noResponse");
}

// ===============================
// ASK ALL MODELS
// ===============================
async function askAllModels(question) {
  answers = {};
  lastQuestion = question;
  
  // Clear chat histories for new question to avoid mixing conversations
  chatHistories = {};
  currentChatModel = null;

  document.querySelectorAll(".modelStatus").forEach((el) => {
    el.textContent = "…";
    el.className = "modelStatus";
  });

  // Show spinner and collapse UI on mobile
  typingIndicator.classList.remove("hidden");

  comparisonTableEl.innerHTML = "";
  selectedModelInfoEl.classList.add("hidden");
  selectedModelAnswerEl.classList.add("hidden");

  // Get models to query: use selectedModels if any, otherwise all visible models
  let modelsToQuery;
  if (selectedModels.length > 0) {
    modelsToQuery = models.filter(m => selectedModels.includes(m.id) && !isModelUserHidden(m.id) && !shouldHideModel(m.id));
  } else {
    modelsToQuery = models.filter(m => !isModelUserHidden(m.id) && !shouldHideModel(m.id));
  }

  if (modelsToQuery.length === 0) {
    typingIndicator.classList.add("hidden");
    alert(t("noModelsSelected") || "Please select at least one model");
    return;
  }

  const tasks = modelsToQuery.map((m) => askSingleModel(question, m.id));
  const results = await Promise.allSettled(tasks);

  // Log any failed promises for debugging
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`Model ${modelsToQuery[index].id} failed:`, result.reason);
    }
  });

  typingIndicator.classList.add("hidden");
  renderComparisonTable();

  history.push({
    question,
    answersSnapshot: { ...answers },
  });
  localStorage.setItem("chatHistory", JSON.stringify(history));
  renderHistory();
}

async function askSingleModel(question, modelId) {
  const start = performance.now();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: question, model: modelId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    let fullAnswer = "";
    let hasCompleted = false;

    // Set a timeout for the request
    const timeout = setTimeout(() => {
      if (!hasCompleted) {
        console.warn(`Timeout for model: ${modelId}`);
        hasCompleted = true;
        answers[modelId] = {
          text: "❌ Request timeout",
          time: Math.round(performance.now() - start),
          error: true,
        };

        const status = document.querySelector(
          `.modelItem[data-model-id="${modelId}"] .modelStatus`
        );
        if (status) {
          status.textContent = "❌";
          status.classList.add("error");
        }
      }
    }, 30000); // 30 second timeout

    while (!hasCompleted) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (!line.startsWith("data:")) continue;

        const payload = line.replace("data:", "").trim();
        if (payload === "[DONE]") {
          clearTimeout(timeout);
          hasCompleted = true;
          const end = performance.now();
          const time = Math.round(end - start);

          answers[modelId] = { text: fullAnswer, time };

          const status = document.querySelector(
            `.modelItem[data-model-id="${modelId}"] .modelStatus`
          );
          if (status) {
            status.textContent = "✓";
            status.classList.add("answered", getSpeedClass(time));
          }

          return;
        }

        try {
          const json = JSON.parse(payload);
          if (json.error) {
            // Handle API errors
            clearTimeout(timeout);
            hasCompleted = true;
            const end = performance.now();
            const time = Math.round(end - start);

            // Choose icon based on error type
            let icon = "❌";
            if (
              json.error.includes("429") ||
              json.error.toLowerCase().includes("quota")
            ) {
              icon = "💰";
            } else if (json.error.includes("Your credit balance is too low")) {
              icon = "💰";
            }

            answers[modelId] = {
              text: `${icon} Error: ${json.error}`,
              time,
              error: true,
            };

            const status = document.querySelector(
              `.modelItem[data-model-id="${modelId}"] .modelStatus`
            );
            if (status) {
              status.textContent = icon;
              status.classList.add("error");
            }

            return;
          }
          if (json.token) fullAnswer += json.token;
        } catch {}
      }
    }
  } catch (error) {
    const end = performance.now();
    const time = Math.round(end - start);

    answers[modelId] = {
      text: `❌ Network Error: ${error.message}`,
      time,
      error: true,
    };

    const status = document.querySelector(
      `.modelItem[data-model-id="${modelId}"] .modelStatus`
    );
    if (status) {
      status.textContent = "❌";
      status.classList.add("error");
    }
  }

  // Fallback: if no answer was stored, store a timeout error
  if (!answers[modelId]) {
    console.warn(`No answer stored for model: ${modelId}`);
    answers[modelId] = {
      text: "❌ No response received",
      time: 0,
      error: true,
    };

    const status = document.querySelector(
      `.modelItem[data-model-id="${modelId}"] .modelStatus`
    );
    if (status) {
      status.textContent = "❌";
      status.classList.add("error");
    }
  }
}

// ===============================
// COMPARISON TABLE
// ===============================
function renderComparisonTable() {
  console.debug("renderComparisonTable() called", { lastQuestion, answersCount: Object.keys(answers).length });
  // Always clear previous comparison content so switching history or models
  // replaces the table instead of appending to older results.
  if (comparisonTableEl) comparisonTableEl.innerHTML = "";
  if (!lastQuestion || !Object.keys(answers).length) {
    // already cleared above
    // clear any previously set spacing/vars on tables
    if (comparisonTableEl) {
      comparisonTableEl.querySelectorAll(":scope > table.compare").forEach((t) => {
        t.style.marginTop = "";
        t.style.removeProperty("--table-header-height");
      });
    }
    // also clear the external results header so question disappears
    const resultsHeaderEl = document.getElementById("resultsHeader");
    if (resultsHeaderEl) resultsHeaderEl.innerHTML = "";
    if (resultsPanelContentEl) resultsPanelContentEl.innerHTML = "";
    if (resultsPanelEl) resultsPanelEl.classList.add("hidden");
    if (isMobile()) {
      // setMobileControlsVisible(false);
    }
    return;
  }

  // Separate successful and failed responses
  const successfulAnswers = {};
  const failedAnswers = {};

  Object.keys(answers).forEach((id) => {
    const ans = answers[id];
    if (
      ans.error ||
      ans.text.includes("❌") ||
      ans.text.includes("No response")
    ) {
      failedAnswers[id] = ans;
    } else {
      successfulAnswers[id] = ans;
    }
  });

  // Track successful models for "Select Successful" button
  successfulModels = Object.keys(successfulAnswers);

  console.debug("renderComparisonTable building tables", { successful: Object.keys(successfulAnswers).length, failed: Object.keys(failedAnswers).length });

  // Render header into the dedicated resultsHeader container (outside the scrollable table)
  const resultsHeaderEl = document.getElementById("resultsHeader");
  if (resultsHeaderEl) {
    resultsHeaderEl.innerHTML = "";
  }

  if (resultsPanelContentEl) {
    const successCount = Object.keys(successfulAnswers).length;
    const failedCount = Object.keys(failedAnswers).length;
    
    // Build model list with sort controls and click handlers
    let modelIds = Object.keys(successfulAnswers);

    // Apply sorting preference
    if (resultsSort === 'name') {
      modelIds.sort((a, b) => a.localeCompare(b));
    } else {
      // Default: sort by response time ascending
      modelIds.sort((a, b) => (successfulAnswers[a].time || 0) - (successfulAnswers[b].time || 0));
    }

    // Sort controls
    const sortControlsHtml = `
      <div class="sortControls">
        <span class="sortLabel">${t('sortBy')}:</span>
        <button class="sortBtn ${resultsSort === 'name' ? 'active' : ''}" data-sort="name">${t('sortName')}</button>
        <button class="sortBtn ${resultsSort === 'time' ? 'active' : ''}" data-sort="time">${t('sortTime')}</button>
      </div>
    `;

    // Build the safe HTML structure
    resultsPanelContentEl.innerHTML = `<div class="resultsPanelQuestion">
        <div class="resultsPanelLabel">${t("question")}</div>
        <div class="resultsPanelText" id="resultsPanelQuestionText"></div>
      </div>
      <div class="resultsPanelStats">
        <div class="resultsPanelCounts">${successCount} ${t("successfulResponses")} • ${failedCount} ${t("failedResponses")}</div>
      </div>
   
      <div class="resultsPanelModelList">
        <div class="resultsPanelLabel">${t("models")}</div>
        <div class="sortControls">
          <span class="sortLabel">${t('sortBy')}:</span>
          <button class="sortBtn ${resultsSort === 'name' ? 'active' : ''}" data-sort="name">${t('sortName')}</button>
          <button class="sortBtn ${resultsSort === 'time' ? 'active' : ''}" data-sort="time">${t('sortTime')}</button>
        </div>
        <div id="modelListContainer"></div>
      </div>
    `;
    
    // Safely set the question text to prevent HTML injection
    const questionTextEl = resultsPanelContentEl.querySelector('#resultsPanelQuestionText');
    if (questionTextEl) {
      questionTextEl.textContent = lastQuestion;
    }
    
    // Safely build model list items using DOM API (no innerHTML for user data)
    const modelListContainer = resultsPanelContentEl.querySelector('#modelListContainer');
    if (modelListContainer) {
      modelIds.forEach((id) => {
        const ans = successfulAnswers[id];
        const speedClass = getSpeedClass(ans.time);
        
        const item = document.createElement('div');
        item.className = 'modelListItem';
        item.dataset.modelId = id;
        
        // Icon (safe, comes from function)
        item.innerHTML = getModelIcon(id);
        
        // Model name (safe from textContent)
        const nameSpan = document.createElement('span');
        nameSpan.className = 'modelName';
        nameSpan.textContent = id;
        item.appendChild(nameSpan);
        
        // Response time (safe from textContent)
        const timeSpan = document.createElement('span');
        timeSpan.className = `modelTime ${speedClass}`;
        timeSpan.textContent = `${ans.time}ms`;
        item.appendChild(timeSpan);
        
        modelListContainer.appendChild(item);
      });
    }
    
    // Add click handlers to model list items
    resultsPanelContentEl.querySelectorAll('.modelListItem').forEach((item) => {
      item.addEventListener('click', () => {
        const modelId = item.dataset.modelId;
        scrollToModelCard(modelId);
        // On mobile hide the results panel so the card is visible
        if (isMobile()) {
          try { toggleResultsPanel(); } catch (e) {}
        }
      });
    });

    // Add sort button handlers
    resultsPanelContentEl.querySelectorAll('.sortBtn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const mode = btn.dataset.sort;
        setResultsSort(mode);
      });
    });
  }

  if (resultsPanelEl) {
    resultsPanelEl.classList.remove("hidden");
  }
  
  // Show results panel toggle button
  const toggleBtn2 = document.getElementById("toggleResultsPanelBtn2");
  if (toggleBtn2) {
    toggleBtn2.classList.remove("hidden");
    toggleBtn2.classList.add("active");
  }

  // Render successful answers cards
  if (Object.keys(successfulAnswers).length > 0) {
    const table = createComparisonTable(successfulAnswers, true);
    comparisonTableEl.appendChild(table);
  }

  // Render failed answers in collapsed section
  if (Object.keys(failedAnswers).length > 0) {
    const failedSection = document.createElement("div");
    failedSection.className = "failed-responses collapsed";

    const toggleBtn = document.createElement("button");
    toggleBtn.className = "toggle-failed-btn";
    const icon = document.createElement("span");
    icon.className = "toggle-icon";
    icon.textContent = "▶";
    toggleBtn.appendChild(icon);
    toggleBtn.insertAdjacentText("beforeend", ` ${t("failedResponses")} (${Object.keys(failedAnswers).length})`);

    const failedContent = document.createElement("div");
    failedContent.className = "failed-content";

    const failedTable = createComparisonTable(failedAnswers, false);
    failedTable.classList.add("failed-cards");
    failedContent.appendChild(failedTable);

    failedSection.appendChild(toggleBtn);
    failedSection.appendChild(failedContent);

    comparisonTableEl.appendChild(failedSection);

    // Add toggle functionality
    toggleBtn.addEventListener("click", () => {
      failedSection.classList.toggle("collapsed");
      icon.textContent = failedSection.classList.contains("collapsed") ? "▶" : "▼";
    });
  }

  // Add reply button listeners
  comparisonTableEl.querySelectorAll('.replyBtn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modelId = e.target.dataset.modelId;
      enterChatMode(modelId);
    });
  });

  comparisonTableEl.querySelectorAll('.removeModelBtn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const modelId = e.target.dataset.modelId;
      addModelToFailedByUser(modelId);
    });
  });

  // No dynamic measurement needed: header is outside the scroll container and sticks under the top bar.
  if (isMobile()) {
    // setMobileControlsVisible(true);
  }
}

// Scroll to a specific model card
function scrollToModelCard(modelId) {
  const cards = comparisonTableEl.querySelectorAll('.resultCard');
  for (const card of cards) {
    const modelName = card.querySelector('.modelName');
    if (modelName && modelName.textContent === modelId) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      
      // Remove any existing highlight class from other cards
      comparisonTableEl.querySelectorAll('.resultCard').forEach(c => c.classList.remove('highlighted'));
      
      // Add highlight class for animation
      card.classList.add('highlighted');
      
      // Remove after animation completes
      setTimeout(() => {
        card.classList.remove('highlighted');
      }, 2500);
      break;
    }
  }
}

function createComparisonTable(answerSet, isSuccessful = false) {
  const wrapper = document.createElement("div");
  wrapper.className = "resultsCards";

  // Determine ordering of IDs according to resultsSort
  let ids = Object.keys(answerSet || {});

  if (resultsSort === 'name') {
    ids.sort((a, b) => a.localeCompare(b));
  } else {
    // Sort by response time ascending; models without responses go last
    ids.sort((a, b) => {
      const at = answerSet[a]?.time ?? Infinity;
      const bt = answerSet[b]?.time ?? Infinity;
      if (at === bt) return a.localeCompare(b);
      return at - bt;
    });
  }

  ids.forEach((id) => {
    const ans = answerSet[id];
    const card = document.createElement("article");
    card.className = "resultCard";

    const model = models.find((m) => m.id === id);
    const providerName = model?.provider || "Unknown";

    const header = document.createElement("div");
    header.className = "cardHeader";

    const title = document.createElement("div");
    title.className = "cardTitle";
    title.innerHTML = `${getModelIcon(id)} <span class="providerName">${providerName}</span> · <span class="modelName">${id}</span>`;

    const meta = document.createElement("div");
    meta.className = "cardMeta";
    meta.textContent = `${ans.time} ms`;

    const actions = document.createElement("div");
    actions.className = "cardActions";
    actions.appendChild(meta);

    // Only add reply button for successful responses
    if (isSuccessful) {
      const replyBtn = document.createElement("button");
      replyBtn.className = "replyBtn";
      replyBtn.textContent = t("replyBtn");
      replyBtn.dataset.modelId = id;
      actions.appendChild(replyBtn);
    }

    const removeBtn = document.createElement("button");
    removeBtn.className = "removeModelBtn";
    removeBtn.textContent = t("removeModel") || "Remove model";
    removeBtn.title = t("removeModel") || "Remove model";
    removeBtn.dataset.modelId = id;
    actions.appendChild(removeBtn);

    header.appendChild(title);
    header.appendChild(actions);

    const body = document.createElement("div");
    body.className = "cardBody";

    const questionBlock = document.createElement("div");
    questionBlock.className = "cardBlock visbile-sm";
    questionBlock.innerHTML = `<div class="cardLabel visbile-sm">${t("question")}</div><div class="cardText visbile-sm" id="cardQuestion"></div>`;
    
    // Safely set the question text to prevent HTML injection
    const cardQuestionEl = questionBlock.querySelector('#cardQuestion');
    if (cardQuestionEl) {
      cardQuestionEl.textContent = lastQuestion;
    }

    const answerBlock = document.createElement("div");
    answerBlock.className = "cardBlock";
    const tableElement = parseMarkdownTable(ans.text);
    const answerContent = document.createElement("div");
    answerContent.className = "cardAnswer";
    if (tableElement) {
      answerContent.appendChild(tableElement);
    } else {
      answerContent.innerHTML = parseMarkdown(ans.text);
    }
    answerBlock.innerHTML = `<div class="cardLabel">${t("answer")}</div>`;
    answerBlock.appendChild(answerContent);

    body.appendChild(questionBlock);
    body.appendChild(answerBlock);

    card.appendChild(header);
    card.appendChild(body);
    wrapper.appendChild(card);
  });

  return wrapper;
}

function enterChatMode(modelId) {
  if (!chatHistories[modelId]) {
    // Ensure we have the necessary data
    if (!lastQuestion || !answers[modelId] || !answers[modelId].text) {
      console.error('Missing data for chat mode:', { lastQuestion, modelId, hasAnswer: !!answers[modelId] });
      return;
    }
    
    chatHistories[modelId] = [
      {role: 'user', content: lastQuestion},
      {role: 'assistant', content: answers[modelId].text, time: answers[modelId].time}
    ];
  }
  currentChatModel = modelId;
  renderChat();
}

function renderChat() {
  if (!currentChatModel || !chatPanelEl) return;

  chatPanelEl.innerHTML = '';

  const model = models.find(m => m.id === currentChatModel);
  const providerName = model?.provider || "Unknown";

  const header = document.createElement("div");
  header.className = "chatHeader";

  const title = document.createElement("h3");
  title.innerHTML = `${getModelIcon(currentChatModel)} <span class="providerName">${providerName}</span> · <span class="modelName">${currentChatModel}</span>`;

  const closeBtn = document.createElement("button");
  closeBtn.className = "closeChatBtn";
  closeBtn.textContent = "✕";
  closeBtn.onclick = () => {
    currentChatModel = null;
    chatPanelEl.classList.add("hidden");
    resultsPanelEl.classList.remove("hidden");
    
    // Show other UI elements when exiting chat mode
    comparisonTableEl.classList.remove("hidden");
    if (lastQuestion && Object.keys(answers).length) {
      document.getElementById("resultsHeader").classList.remove("hidden");
    }
  };

  header.appendChild(title);
  header.appendChild(closeBtn);

  const messagesEl = document.createElement("div");
  messagesEl.className = "chatMessages";

  chatHistories[currentChatModel].forEach(msg => {
    const msgEl = document.createElement("div");
    msgEl.className = `chatMessage ${msg.role}`;
    msgEl.innerHTML = parseMarkdown(msg.content);
    messagesEl.appendChild(msgEl);
  });

  // Add loading indicator if waiting for response
  if (isChatLoading) {
    const loadingEl = document.createElement("div");
    loadingEl.className = "chatMessage assistant loading";
    loadingEl.innerHTML = '<div class="loadingDots"><span></span><span></span><span></span></div>';
    messagesEl.appendChild(loadingEl);
  }

  const inputContainer = document.createElement("div");
  inputContainer.className = "chatInputContainer";

  const inputEl = document.createElement("textarea");
  inputEl.className = "chatInput";
  inputEl.placeholder = t("chatPlaceholder");
  inputEl.rows = 2;
  inputEl.disabled = isChatLoading;
  inputEl.onkeydown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && inputEl.value.trim() && !isChatLoading) {
      e.preventDefault();
      sendChatMessage(inputEl.value.trim());
      inputEl.value = '';
    }
  };

  const sendBtn = document.createElement("button");
  sendBtn.className = "chatSendBtn";
  sendBtn.textContent = "Send";
  sendBtn.disabled = isChatLoading;
  sendBtn.onclick = () => {
    if (inputEl.value.trim() && !isChatLoading) {
      sendChatMessage(inputEl.value.trim());
      inputEl.value = '';
    }
  };

  inputContainer.appendChild(inputEl);
  inputContainer.appendChild(sendBtn);

  chatPanelEl.appendChild(header);
  chatPanelEl.appendChild(messagesEl);
  chatPanelEl.appendChild(inputContainer);

  chatPanelEl.classList.remove("hidden");
  resultsPanelEl.classList.add("hidden");
  
  // Hide other UI elements when in chat mode
  comparisonTableEl.classList.add("hidden");
  selectedModelInfoEl.classList.add("hidden");
  selectedModelAnswerEl.classList.add("hidden");
  document.getElementById("resultsHeader").classList.add("hidden");
  typingIndicator.classList.add("hidden");

  // Scroll to bottom
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function sendChatMessage(content) {
  const model = currentChatModel;
  chatHistories[model].push({role: 'user', content});
  isChatLoading = true;
  renderChat();

  // Clean messages to only include role and content (remove time and other extra fields)
  const cleanMessages = chatHistories[model].map(msg => ({
    role: msg.role,
    content: msg.content
  }));

  fetch('/api/chat', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({messages: cleanMessages, model})
  }).then(response => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    chatHistories[model].push({role: 'assistant', content: ''});
    renderChat();

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let hasReceivedData = false;

    // Set a timeout for the streaming response
    const streamTimeout = setTimeout(() => {
      if (isChatLoading) {
        console.warn(`Stream timeout for model: ${model}`);
        isChatLoading = false;
        if (!hasReceivedData) {
          // If no data was received, show an error
          chatHistories[model][chatHistories[model].length - 1].content = '❌ **Request Timeout**\n\nThe model did not respond within the expected time. Please try again or select a different model.';
        }
        renderChat();
      }
    }, 30000); // 30 second timeout

    function process({done, value}) {
      if (done) {
        clearTimeout(streamTimeout);
        isChatLoading = false;
        updateChatHistory(model);
        renderChat();
        return;
      }

      buffer += decoder.decode(value);
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const payload = line.replace('data: ', '').trim();
          
          if (payload === '[DONE]') {
            clearTimeout(streamTimeout);
            isChatLoading = false;
            updateChatHistory(model);
            renderChat();
            return;
          }

          if (payload.startsWith('{')) {
            try {
              const json = JSON.parse(payload);
              if (json.error) {
                // Handle API errors
                clearTimeout(streamTimeout);
                isChatLoading = false;
                chatHistories[model][chatHistories[model].length - 1].content = `❌ **API Error**\n\n${json.error}\n\nPlease try again or select a different model.`;
                renderChat();
                return;
              }
              if (json.token) {
                hasReceivedData = true;
                chatHistories[model][chatHistories[model].length - 1].content += json.token;
                renderChat();
              }
            } catch (e) {
              console.warn('Failed to parse streaming data:', payload, e);
            }
          }
        }
      }

      reader.read().then(process);
    }

    reader.read().then(process);
  }).catch(error => {
    console.error('Chat error:', error);
    isChatLoading = false;
    // Add error message to chat history
    chatHistories[model].push({
      role: 'assistant', 
      content: `❌ **Request Failed**\n\n${error.message}\n\nPlease try again or select a different model.`
    });
    renderChat();
  });
}

// ===============================
// UI COLLAPSE/EXPAND
// ===============================
function applyCollapseState() {
  const sidePanelEl = document.getElementById("sidePanel");
  if (sidePanelEl) sidePanelEl.classList.toggle("collapsed", isSidebarCollapsed);

  const sidebarBtn = document.getElementById("toggleSidebarBtn");

  if (sidebarBtn) sidebarBtn.classList.toggle("active", !isSidebarCollapsed);

  // Show/hide backdrop on mobile when sidebar is open
  const backdrop = document.getElementById("sidebarBackdrop");
  if (backdrop && isMobile()) {
    backdrop.classList.toggle("visible", !isSidebarCollapsed);
  }

  // Manage z-index ordering so the most recently opened panel is on top
  const resultsEl = document.getElementById('resultsPanel');
  if (!isSidebarCollapsed) {
    // side panel is open -> bring it to front
    if (sidePanelEl) sidePanelEl.style.zIndex = 500;
    if (resultsEl) resultsEl.style.zIndex = 400;
  } else {
    // side panel closed -> remove inline z-index
    if (sidePanelEl) sidePanelEl.style.zIndex = '';
    if (resultsEl && !resultsEl.classList.contains('hidden')) {
      // keep results panel on top if it is visible
      resultsEl.style.zIndex = 500;
    } else if (resultsEl) {
      resultsEl.style.zIndex = '';
    }
  }
}

// Toggle the sidebar open/closed and update UI
function toggleSidebar() {
  isSidebarCollapsed = !isSidebarCollapsed;
  applyCollapseState();
}

function initMobileLayout() {
  if (!isMobile()) {
    if (!hasMobileInit) {
      isSidebarCollapsed = false;
    }
  } else {
    if (!hasMobileInit) {
      isSidebarCollapsed = true;
      hasMobileInit = true;
    }
  }

  applyCollapseState();
  
}

// ===============================
function clearResults() {
  answers = {};
  lastQuestion = "";
  comparisonTableEl.innerHTML = "";
  selectedModelInfoEl.classList.add("hidden");
  selectedModelAnswerEl.classList.add("hidden");
  typingIndicator.classList.add("hidden");
  // remove comparison container spacing set by header measurement
  if (comparisonTableEl) {
    comparisonTableEl.style.removeProperty("--table-header-height");
    comparisonTableEl.style.paddingTop = "";
    comparisonTableEl.querySelectorAll(":scope > table.compare").forEach((t) => {
      t.style.marginTop = "";
      t.style.removeProperty("--table-header-height");
    });
  }
  // clear the external results header
  const resultsHeaderEl = document.getElementById("resultsHeader");
  if (resultsHeaderEl) resultsHeaderEl.innerHTML = "";
  if (resultsPanelContentEl) resultsPanelContentEl.innerHTML = "";
  if (resultsPanelEl) resultsPanelEl.classList.add("hidden");
  
  // Hide results panel toggle button
  const toggleBtn2 = document.getElementById("toggleResultsPanelBtn2");
  if (toggleBtn2) {
    toggleBtn2.classList.add("hidden");
    toggleBtn2.classList.remove("active");
  }
  
  if (isMobile()) {
    // setMobileControlsVisible(true);
  }
}

// ===============================
// SEND MESSAGE
// ===============================
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !models.length) return;

  // Clear input and close the modal immediately so the UI isn't blocked
  // while askAllModels performs network requests. Start askAllModels
  // asynchronously so the browser can repaint and the toast is visible.
  messageInput.value = "";
  try {
    if (questionModal && !questionModal.classList.contains('hidden')) {
      closeQuestionModal();
    }
  } catch (e) {}

  // Show a toast so the user knows the question was sent
  try { showMessage(t(questionSentWait) || "Question sent — please wait for answers", 3000); } catch (e) {}

  // Run askAllModels without awaiting to avoid blocking UI repaint
  askAllModels(text).catch((err) => console.error(err));
}

sendBtn.onclick = sendMessage;
messageInput.addEventListener("keydown", (e) => {
  // Submit on Enter (without Shift) and prevent inserting a newline.
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

 

// Toggle buttons for mobile
document
  .getElementById("toggleSidebarBtn")
  ?.addEventListener("click", toggleSidebar);
document.getElementById("closeSidebarBtn")?.addEventListener("click", () => {
  if (!isSidebarCollapsed) {
    toggleSidebar();
  }
});
document.getElementById("sidebarBackdrop")?.addEventListener("click", () => {
  if (isMobile() && !isSidebarCollapsed) {
    toggleSidebar();
  }
});

// Tab switching
document
  .getElementById("modelsTab")
  ?.addEventListener("click", () => switchTab("models"));
document
  .getElementById("historyTab")
  ?.addEventListener("click", () => switchTab("history"));
document
  .getElementById("failedTab")
  ?.addEventListener("click", () => switchTab("failed"));

function switchTab(tab) {
  const modelsTab = document.getElementById("modelsTab");
  const historyTab = document.getElementById("historyTab");
  const failedTab = document.getElementById("failedTab");
  const modelsPanel = document.getElementById("modelsPanel");
  const historyPanel = document.getElementById("historyPanel");
  const failedPanel = document.getElementById("failedPanel");

  if (tab === "models") {
    modelsTab?.classList.add("active");
    historyTab?.classList.remove("active");
    failedTab?.classList.remove("active");
    modelsPanel?.classList.add("active");
    historyPanel?.classList.remove("active");
    failedPanel?.classList.remove("active");
    modelsTab?.setAttribute("aria-selected", "true");
    historyTab?.setAttribute("aria-selected", "false");
    failedTab?.setAttribute("aria-selected", "false");
  } else if (tab === "history") {
    historyTab?.classList.add("active");
    modelsTab?.classList.remove("active");
    failedTab?.classList.remove("active");
    historyPanel?.classList.add("active");
    modelsPanel?.classList.remove("active");
    failedPanel?.classList.remove("active");
    historyTab?.setAttribute("aria-selected", "true");
    modelsTab?.setAttribute("aria-selected", "false");
    failedTab?.setAttribute("aria-selected", "false");
  } else if (tab === "failed") {
    failedTab?.classList.add("active");
    modelsTab?.classList.remove("active");
    historyTab?.classList.remove("active");
    failedPanel?.classList.add("active");
    modelsPanel?.classList.remove("active");
    historyPanel?.classList.remove("active");
    failedTab?.setAttribute("aria-selected", "true");
    modelsTab?.setAttribute("aria-selected", "false");
    historyTab?.setAttribute("aria-selected", "false");
  }
}

// Reset cache button
document.getElementById("resetCache")?.addEventListener("click", async () => {
  await resetModelCache();
});

// Select all button
document.getElementById("selectAllBtn")?.addEventListener("click", () => {
  selectAllModels();
});

// Deselect all button
document.getElementById("deselectAllBtn")?.addEventListener("click", () => {
  deselectAllModels();
});

// Select successful models button
document.getElementById("selectSuccessfulBtn")?.addEventListener("click", () => {
  if (successfulModels.length === 0) {
    showMessage(t("selectSuccessfulNoResults"));
    return;
  }
  selectSuccessfulModels();
});

// Clear all failed models button
document.getElementById("clearAllFailedBtn")?.addEventListener("click", () => {
  clearAllFailedModels();
});

// Refresh failed models button
document.getElementById("refreshFailedBtn")?.addEventListener("click", async () => {
  await loadFailedModels();
});

// Results panel sort buttons (also updates Models panel ordering)
  document.getElementById('resultsSortNameBtn')?.addEventListener('click', () => {
    setResultsSort('name');
  });
  document.getElementById('resultsSortTimeBtn')?.addEventListener('click', () => {
    setResultsSort('time');
  });

  // Keep sort buttons translated and in sync
  const rsLabel = document.querySelector('#resultsPanel .sortLabel');
  if (rsLabel) rsLabel.textContent = t('sortBy');
  const rsName = document.getElementById('resultsSortNameBtn');
  const rsTime = document.getElementById('resultsSortTimeBtn');
  if (rsName) rsName.textContent = t('sortName');
  if (rsTime) rsTime.textContent = t('sortTime');

// Restore selected failed models button
document.getElementById("restoreSelectedFailedBtn")?.addEventListener("click", () => {
  restoreSelectedFailedModels();
});

// Prevent form submission
document.getElementById("questionArea").addEventListener("submit", (e) => {
  e.preventDefault();
  // Close modal immediately so the UI isn't blocked while network requests run
  try {
    if (questionModal && !questionModal.classList.contains('hidden')) {
      closeQuestionModal();
    }
  } catch (err) {}
  sendMessage();
});

clearResultsBtnEl?.addEventListener("click", clearResults);

// Toggle results panel visibility
function toggleResultsPanel() {
  const isHidden = resultsPanelEl?.classList.toggle("hidden");
  const toggleBtn2 = document.getElementById("toggleResultsPanelBtn2");
  if (toggleBtn2) {
    toggleBtn2.classList.toggle("active", !isHidden);
  }

  // Manage z-index so the visible panel appears on top
  const sidePanelEl = document.getElementById('sidePanel');
  if (!isHidden) {
    // results panel now visible -> bring to top
    if (resultsPanelEl) resultsPanelEl.style.zIndex = 500;
    if (sidePanelEl && !sidePanelEl.classList.contains('collapsed')) sidePanelEl.style.zIndex = 400;
  } else {
    // results panel hidden -> remove inline z-index
    if (resultsPanelEl) resultsPanelEl.style.zIndex = '';
    if (sidePanelEl && !sidePanelEl.classList.contains('collapsed')) {
      sidePanelEl.style.zIndex = 500;
    } else if (sidePanelEl) {
      sidePanelEl.style.zIndex = '';
    }
  }
}

toggleResultsPanelBtn?.addEventListener("click", toggleResultsPanel);
document.getElementById("toggleResultsPanelBtn2")?.addEventListener("click", toggleResultsPanel);

// ===============================
// THEME
// ===============================
function applyTheme() {
  const theme = currentTheme || 'dark';
  document.documentElement.setAttribute('data-theme', theme);
  const themeBtn = document.getElementById("themeToggleBtn");
  if (themeBtn) {
    const themeIcons = {
      dark: '🌙',
      light: '☀️',
      blue: '💙',
      ocean: '🌊',
      sunset: '🌅',
      nature: '🌿',
      purple: '💜'
    };
    themeBtn.textContent = themeIcons[theme] || '🌙';
    const themeKey = 'theme' + theme.charAt(0).toUpperCase() + theme.slice(1);
    themeBtn.title = t(themeKey) || theme;
  }
}

function toggleTheme() {
  const currentIndex = availableThemes.indexOf(currentTheme);
  const nextIndex = (currentIndex + 1) % availableThemes.length;
  currentTheme = availableThemes[nextIndex];
  localStorage.setItem('theme', currentTheme);
  applyTheme();
}

function updateModelsSortButtons() {
  const isName = resultsSort === 'name';
  document.getElementById('modelsSortNameBtn')?.classList.toggle('active', isName);
  document.getElementById('modelsSortTimeBtn')?.classList.toggle('active', !isName);
}

// ===============================
// INIT
// ===============================
loadModels();
loadFailedModels();
renderHistory();
applyTranslations();
applyTheme(); // Apply saved theme on load
typingIndicator.classList.add("hidden"); // Ensure typing indicator is hidden
initMobileLayout();
updateQuestionButtonState(); // Initialize question button state

window.addEventListener("resize", () => {
  initMobileLayout();
});

// Language switcher
document.getElementById("langBg").addEventListener("click", () => {
  updateLanguage("bg");
  updateLanguageButtons();
});

document.getElementById("langEn").addEventListener("click", () => {
  updateLanguage("en");
  updateLanguageButtons();
});

// Theme toggle
// Listener attached on DOMContentLoaded to ensure the button exists and icon initializes

// Question modal behavior: move the existing #questionArea into the modal on open and restore on close
let _previousFocus = null;
const questionModal = document.getElementById('questionModal');
const questionModalOverlay = document.getElementById('questionModalOverlay');
const questionModalContent = document.getElementById('questionModalContent');
const openQuestionBtn = document.getElementById('openQuestionBtn');
const closeQuestionBtn = document.getElementById('closeQuestionModal');
const headerContentEl = document.getElementById('headerContent');

function openQuestionModal() {
  if (!questionModal) return;
  _previousFocus = document.activeElement;
  // Always move the form into modal content if not already there
  try {
    const qa = document.getElementById('questionArea');
    if (qa && questionModalContent && !questionModalContent.contains(qa)) {
      questionModalContent.appendChild(qa);
    }
  } catch (e) {}

  questionModal.classList.remove('hidden');
  // focus textarea
  setTimeout(() => {
    try { messageInput.focus(); } catch (e) {}
  }, 50);
}

function closeQuestionModal() {
  if (!questionModal) return;
  // Always move the form back to header if it's in the modal
  try {
    const qa = document.getElementById('questionArea');
    if (qa && headerContentEl && questionModalContent.contains(qa)) {
      headerContentEl.appendChild(qa);
    }
  } catch (e) {}

  questionModal.classList.add('hidden');
  if (_previousFocus && typeof _previousFocus.focus === 'function') {
    _previousFocus.focus();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Attach modal event handlers after DOM is ready
  const ob = document.getElementById('openQuestionBtn');
  const cb = document.getElementById('closeQuestionModal');
  const overlay = document.getElementById('questionModalOverlay');

  if (ob) ob.addEventListener('click', (e) => {
    e.preventDefault();
    // Check if button is disabled (no models selected)
    if (ob.classList.contains('disabled')) {
      showMessage(t("noModelsSelected"));
      return;
    }
    openQuestionModal();
  });

  if (cb) cb.addEventListener('click', (e) => {
    e.preventDefault();
    closeQuestionModal();
  });

  if (overlay) overlay.addEventListener('click', () => closeQuestionModal());

  // Ensure the theme button is initialized after DOM is ready so the icon updates correctly
  try {
    applyTheme();
    const themeBtnEl = document.getElementById("themeToggleBtn");
    if (themeBtnEl) {
      // Remove existing listener if any to avoid duplicate handlers
      themeBtnEl.replaceWith(themeBtnEl.cloneNode(true));
      document.getElementById("themeToggleBtn")?.addEventListener("click", toggleTheme);
    }
  } catch (e) {}

  // Always move question area into modal so it is hidden by default
  try {
    const qa = document.getElementById('questionArea');
    if (qa && questionModalContent) questionModalContent.appendChild(qa);
  } catch (e) {}

  // ESC handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && questionModal && !questionModal.classList.contains('hidden')) {
      closeQuestionModal();
    }
  });
});

function updateLanguageButtons() {
  document
    .getElementById("langBg")
    .classList.toggle("active", currentLanguage === "bg");
  document
    .getElementById("langEn")
    .classList.toggle("active", currentLanguage === "en");

  // Update sort buttons active state
  updateSortButtons();
}

function setResultsSort(mode) {
  if (!mode || (mode !== 'name' && mode !== 'time')) return;
  resultsSort = mode;
  localStorage.setItem('resultsSort', mode);
  // Re-render the panels to apply new sort
  try { renderComparisonTable(); } catch (e) {}
  try { renderModelList(); } catch (e) {}
  try { updateSortButtons(); } catch (e) {}
}

function updateSortButtons() {
  const isName = resultsSort === 'name';
  document.getElementById('modelsSortNameBtn')?.classList.toggle('active', isName);
  document.getElementById('modelsSortTimeBtn')?.classList.toggle('active', !isName);
  document.getElementById('resultsSortNameBtn')?.classList.toggle('active', isName);
  document.getElementById('resultsSortTimeBtn')?.classList.toggle('active', !isName);
}
// Initialize language buttons
updateLanguageButtons();


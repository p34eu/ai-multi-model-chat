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
let providerStatus = {}; // provider status from backend
let modelStatuses = {}; // modelId -> { status, timestamp }
let selectedModels = JSON.parse(localStorage.getItem("selectedModels")) || []; // array of model IDs to send to
let hiddenModels = JSON.parse(localStorage.getItem("hiddenModels")) || []; // array of model IDs user marked as not interested
let hiddenProviders = JSON.parse(localStorage.getItem("hiddenProviders")) || []; // array of provider names to hide completely
let successfulModels = []; // array of model IDs that responded successfully in the last query
let isResultsView = false; // Track if we're showing results
let isSidebarCollapsed = false;
let hasMobileInit = false;

// Check if on mobile device
function isMobile() {
  return window.innerWidth <= 768;
}

// Initialize collapsed providers for mobile
if (Object.keys(collapsedProviders).length === 0 && isMobile()) {
  // Will be set after models are loaded
}

// ===============================
// TRANSLATIONS
// ===============================
// TRANSLATIONS
// ===============================
const translations = {
  bg: {
    title: "Сравнение на ИИ модели",
    models: "Модели",
    refreshModels: "⟳",
    expandCollapse: "Разгъни/Сгъни всички",
    history: "История",
    clearHistory: "🗑️",
    messagePlaceholder: "Напиши въпрос, който всички модели да отговорят...",
    sendButton: "Изпрати",
    typing: "Моделите отговарят…",
    modelInfo: "Информация за модела",
    responseTime: "Време за отговор",
    question: "Въпрос",
    noResponse: "Този модел не е отговорил.",
    comparisonTitle: "Получени резултати",
    model: "Модел",
    time: "Време",
    answer: "Отговор",
    clearResults: "Изчисти резултатите",
    failedResponses: "Неуспешни отговори",
    successfulResponses: "Успешни отговори",
    language: "Език",
    english: "English",
    bulgarian: "Български",
    loaded1:"Заредени ",
    loaded2:" модела от ",
    loaded3:" доставчици",
    resetCache: "Нулирай кеша",
    resetCacheSuccess: "Кешът е нулиран",
    selectAll: "Избери всички",
    deselectAll: "Премахни избора",
    selectSuccessful: "Избери успешните",
    hideModel: "Скрий модела",
    showModel: "Покажи модела",
    of: "от",
    hiddenModels: "Скрити модели",
    sendToSelected: "Изпрати към избраните",
    noModelsSelected: "Моля, изберете поне един модел",

  
  },
  en: {
    title: "AI Model Comparison Tool",
    models: "Models",
    refreshModels: "⟳",
    expandCollapse: "Expand/Collapse All",
    history: "History",
    clearHistory: "🗑️",
    messagePlaceholder: "Type a question for all models to answer...",
    sendButton: "Send",
    typing: "Models are responding…",
    modelInfo: "Model Information",
    responseTime: "Response Time",
    question: "Question",
    noResponse: "This model did not respond.",
    comparisonTitle: "Received Responses",
    model: "Model",
    time: "Time",
    answer: "Answer",
    clearResults: "Clear Results",
    failedResponses: "Failed Responses",
    successfulResponses: "Successful Responses",
    language: "Language",
    english: "English",
    bulgarian: "Български",
    loaded1:"Loaded ",
    loaded2:" models from ",
    loaded3:" providers",
    resetCache: "Reset Cache",
    resetCacheSuccess: "Cache has been reset",
    selectAll: "Select All",
    deselectAll: "Deselect All",
    selectSuccessful: "Select Successful",
    hideModel: "Hide model",
    showModel: "Show model",
    of: "of",
    hiddenModels: "Hidden models",
    sendToSelected: "Send to selected",
    noModelsSelected: "Please select at least one model",
  },
};

// ===============================
// TRANSLATION FUNCTIONS
// ===============================
function t(key) {
  return translations[currentLanguage][key] || key;
}

function updateLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem("language", lang);
  applyTranslations();
  // Re-render dynamic UI that depends on translations
  try {
    renderModelList();
  } catch (e) {}
  try {
    renderHistory();
  } catch (e) {}
  try {
    renderComparisonTable();
  } catch (e) {}

  // Re-render selected model panel if open
  if (selectedModel) {
    try {
      selectModel(selectedModel);
    } catch (e) {}
  }
}

/**
 * Applies translations to all text content and placeholders in the DOM.
 * Updates title, labels, buttons, table headers, and section headers with translated strings.
 * Handles optional elements gracefully with null checks before updating.
 * Replaces hardcoded text in model details and response messages with translated equivalents.
 *
 * @function applyTranslations
 * @returns {void}
 */
function applyTranslations() {
  // Update title
  document.title = t("title");
  document.querySelector("#title").textContent = t("title");

  // Update placeholders and buttons
  document.querySelector("#message").placeholder = t("messagePlaceholder");
  document.querySelector("#sendBtn").textContent = t("sendButton");

  // Update section headers

  document.querySelectorAll('span[data-i18n="models"]').forEach((el) => {
    el.textContent = t("models");
  });
  document.querySelectorAll('span[data-i18n="history"]').forEach((el) => {
    el.textContent = t("history");
  });
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
    clearResultsBtnEl.textContent = t("clearResults");
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
}

// ===============================
// DOM
// ===============================
const modelListEl = document.getElementById("modelList");
const historyListEl = document.getElementById("historyList");
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
// LOAD MODELS
// ===============================
async function loadModels() {
  console.debug("loadModels: fetching /api/models");
  const res = await fetch("/api/models");
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
  if (modelsCountEl) {
     const allProviders = Object.keys(providerStatus);
    modelsCountEl.textContent = `${t("loaded1")}${models.length}${t("loaded2")}${allProviders.length}${t("loaded3")}`;
  }
  renderModelList();
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

  // Show all providers (both active and inactive)
  Object.keys(providerStatus)
    .sort()
    .forEach((providerName) => {
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

      // Status badge for inactive providers
      const statusBadge = isActive
        ? ``
        : `<span class="inactiveBadge">⚠ No API Key</span>`;

      // Calculate counts for this provider
      const providerModels = list || [];
      const selectedCount = providerModels.filter(m => isModelSelected(m.id) && !isModelUserHidden(m.id)).length;
      const activeCount = providerModels.filter(m => !shouldHideModel(m.id) && !isModelUserHidden(m.id)).length;
      const totalCount = providerModels.length;

      const countsSpan = document.createElement("span");
      countsSpan.className = "providerCounts";
      countsSpan.innerHTML = `(${selectedCount}), (${activeCount}) ${t("of")} (${totalCount})${statusBadge}`;
      
      // Add title attributes to describe the numbers
      countsSpan.title = `Selected: ${selectedCount}, Active: ${activeCount}, Total: ${totalCount}`;

      // Hide provider button
      const providerHideBtn = document.createElement("button");
      providerHideBtn.className = "providerHideBtn";
      providerHideBtn.title = isProviderHidden(providerName) ? t("showModel") : t("hideModel");
      providerHideBtn.innerHTML = isProviderHidden(providerName) ? "🚫" : "👁️";
      providerHideBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleProviderHidden(providerName);
      });

      headerRight.appendChild(countsSpan);
      headerRight.appendChild(providerHideBtn);

      headerContent.appendChild(headerLeft);
      headerContent.appendChild(headerRight);
      header.appendChild(headerContent);

      // Toggle collapse on click (but not on hide button)
      header.addEventListener("click", (e) => {
        if (e.target === providerHideBtn || providerHideBtn.contains(e.target)) return;
        toggleProvider(providerName);
      });
      header.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleProvider(providerName);
        }
      });

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
        inactiveMsg.innerHTML = `<span class="inactiveIcon">🔒</span> Add <code>${providerName.toUpperCase()}_API_KEY</code> to .env file to enable this provider`;
        modelsContainer.appendChild(inactiveMsg);
      } else {
        // Show active models
        list.forEach((m) => {
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

document.getElementById("refreshModels").onclick = loadModels;
document.getElementById("expandCollapseBtn").onclick = toggleAllProviders;
document.getElementById("clearHistory").onclick = () => {
  history = [];
  localStorage.removeItem("chatHistory");
  renderHistory();
};
// ===============================
// HISTORY
// ===============================
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

  selectedModelInfoEl.classList.remove("hidden");
  selectedModelAnswerEl.classList.remove("hidden");

  selectedModelInfoEl.innerHTML = `
    <div class="modelHeader">
      <h2>${getModelIcon(id)} ${id}</h2>
      <button class="hideModelDetailBtn" onclick="toggleModelHidden('${id}'); selectModel('${id}');">
        ${isHidden ? '🚫 ' + t('showModel') : '👁️ ' + t('hideModel')}
      </button>
    </div>
    <div class="modelDetails">
      <div><strong>${t("responseTime")}:</strong> ${formatCreated(
    model?.created
  )}</div>
      <div><strong>${t("responseTime")}:</strong> ${
    answer ? answer.time + " ms" : "няма"
  }</div>
      <div><strong>${t("question")}:</strong> ${lastQuestion || "няма"}</div>
    </div>
  `;

  selectedModelAnswerEl.textContent = answer ? answer.text : t("noResponse");
}

// ===============================
// ASK ALL MODELS
// ===============================
async function askAllModels(question) {
  answers = {};
  lastQuestion = question;

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
      setMobileControlsVisible(false);
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
    
    // Build model list with click handlers
    let modelListHtml = '';
    Object.keys(successfulAnswers).forEach((id) => {
      const ans = successfulAnswers[id];
      const speedClass = getSpeedClass(ans.time);
      modelListHtml += `
        <div class="modelListItem" data-model-id="${id}">
          ${getModelIcon(id)}
          <span class="modelName">${id}</span>
          <span class="modelTime ${speedClass}">${ans.time}ms</span>
        </div>
      `;
    });
    
    resultsPanelContentEl.innerHTML = `
      <div class="resultsPanelStats">
        <div class="resultsPanelCounts">${successCount} ${t("successfulResponses")} • ${failedCount} ${t("failedResponses")}</div>
      </div>
      <div class="resultsPanelQuestion">
        <div class="resultsPanelLabel">${t("question")}</div>
        <div class="resultsPanelText">${lastQuestion}</div>
      </div>
      <div class="resultsPanelModelList">
        <div class="resultsPanelLabel">${t("models")}</div>
        ${modelListHtml}
      </div>
    `;
    
    // Add click handlers to model list items
    resultsPanelContentEl.querySelectorAll('.modelListItem').forEach((item) => {
      item.addEventListener('click', () => {
        const modelId = item.dataset.modelId;
        scrollToModelCard(modelId);
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
    const table = createComparisonTable(successfulAnswers);
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

    const failedTable = createComparisonTable(failedAnswers);
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

  // No dynamic measurement needed: header is outside the scroll container and sticks under the top bar.
  if (isMobile()) {
    setMobileControlsVisible(true);
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

function createComparisonTable(answerSet) {
  const wrapper = document.createElement("div");
  wrapper.className = "resultsCards";

  Object.keys(answerSet).forEach((id) => {
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

    header.appendChild(title);
    header.appendChild(meta);

    const body = document.createElement("div");
    body.className = "cardBody";

    const questionBlock = document.createElement("div");
    questionBlock.className = "cardBlock";
    questionBlock.innerHTML = `<div class="cardLabel">${t("question")}</div><div class="cardText">${lastQuestion}</div>`;

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

// ===============================
// UI COLLAPSE/EXPAND
// ===============================
function setMobileControlsVisible(visible) {
  
  
}

function applyCollapseState() {
  document
    .getElementById("sidePanel")
    .classList.toggle("collapsed", isSidebarCollapsed);

  const sidebarBtn = document.getElementById("toggleSidebarBtn");

  if (sidebarBtn) sidebarBtn.classList.toggle("active", !isSidebarCollapsed);

  // Show/hide backdrop on mobile when sidebar is open
  const backdrop = document.getElementById("sidebarBackdrop");
  if (backdrop && isMobile()) {
    backdrop.classList.toggle("visible", !isSidebarCollapsed);
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
    setMobileControlsVisible(true);
  }
}

// ===============================
// SEND MESSAGE
// ===============================
async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text || !models.length) return;

  messageInput.value = "";
  await askAllModels(text);
}

sendBtn.onclick = sendMessage;
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendMessage();
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

function switchTab(tab) {
  const modelsTab = document.getElementById("modelsTab");
  const historyTab = document.getElementById("historyTab");
  const modelsPanel = document.getElementById("modelsPanel");
  const historyPanel = document.getElementById("historyPanel");

  if (tab === "models") {
    modelsTab?.classList.add("active");
    historyTab?.classList.remove("active");
    modelsPanel?.classList.add("active");
    historyPanel?.classList.remove("active");
    modelsTab?.setAttribute("aria-selected", "true");
    historyTab?.setAttribute("aria-selected", "false");
  } else {
    historyTab?.classList.add("active");
    modelsTab?.classList.remove("active");
    historyPanel?.classList.add("active");
    modelsPanel?.classList.remove("active");
    historyTab?.setAttribute("aria-selected", "true");
    modelsTab?.setAttribute("aria-selected", "false");
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
  selectSuccessfulModels();
});

// Prevent form submission
document.getElementById("questionArea").addEventListener("submit", (e) => {
  e.preventDefault();
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
}

toggleResultsPanelBtn?.addEventListener("click", toggleResultsPanel);
document.getElementById("toggleResultsPanelBtn2")?.addEventListener("click", toggleResultsPanel);

// ===============================
// INIT
// ===============================
loadModels();
renderHistory();
applyTranslations();
typingIndicator.classList.add("hidden"); // Ensure typing indicator is hidden
initMobileLayout();

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

function updateLanguageButtons() {
  document
    .getElementById("langBg")
    .classList.toggle("active", currentLanguage === "bg");
  document
    .getElementById("langEn")
    .classList.toggle("active", currentLanguage === "en");
}

// Initialize language buttons
updateLanguageButtons();


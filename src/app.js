// ===============================
// GLOBAL STATE
// ===============================
let models = []; // [{id, created, owner}]
let answers = {}; // modelId -> { text, time }
let lastQuestion = "";
let selectedModel = null;
let history = JSON.parse(localStorage.getItem("chatHistory")) || []; // [{ question, answersSnapshot }]
let currentLanguage = localStorage.getItem("language") || "bg"; // 'bg' or 'en'
let collapsedProviders =
  JSON.parse(localStorage.getItem("collapsedProviders")) || {}; // provider -> boolean
let providerStatus = {}; // provider status from backend
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

  // Update comparison table if exists
  const comparisonTitle = document.querySelector("#comparisonTable h3");
  if (comparisonTitle) {
    comparisonTitle.textContent = t("comparisonTitle");
  }

  // Update table headers
  const tableHeaders = document.querySelectorAll(".compare th");
  if (tableHeaders.length >= 3) {
    tableHeaders[0].textContent = t("model");
    tableHeaders[1].textContent = t("time");
    tableHeaders[2].textContent = t("answer");
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
    default: `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#3b82f6"/></svg>`,
  };

  if (!id || typeof id !== "string") return icons.default;

  // Remove provider prefixes for icon detection
  const cleanId = id
    .toLowerCase()
    .replace(/^openai-/, "")
    .replace(/^anthropic-/, "")
    .replace(/^google-/, "");

  if (cleanId.includes("llama")) return icons.llama;
  if (cleanId.includes("gemma")) return icons.gemma;
  if (cleanId.includes("qwen")) return icons.qwen;
  if (cleanId.includes("mixtral")) return icons.mixtral;
  if (cleanId.includes("gpt")) return icons.gpt;
  if (cleanId.includes("claude")) return icons.claude;
  if (cleanId.includes("gemini")) return icons.gemini;
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
 
  const modelsCountEl = document.getElementById("modelsCount");
  if (modelsCountEl) {
     const allProviders = Object.keys(providerStatus);
    modelsCountEl.textContent = `${t("loaded1")}${models.length}${t("loaded2")}${allProviders.length}${t("loaded3")}`;
  }
  renderModelList();
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

      const arrow = document.createElement("span");
      arrow.className = "expandArrow";
      arrow.innerHTML = collapsedProviders[providerName] ? "▶" : "▼";

      const providerTitle = document.createElement("span");
      const statusBadge = isActive
        ? ``
        : ` <span class="inactiveBadge">⚠ No API Key</span>`;
      providerTitle.innerHTML = `${providerName} (${list.length})${statusBadge}`;

      headerContent.appendChild(arrow);
      headerContent.appendChild(providerTitle);
      header.appendChild(headerContent);

      // Toggle collapse on click
      header.addEventListener("click", () => toggleProvider(providerName));
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

          const li = document.createElement("li");
          li.className = "modelItem";
          li.dataset.modelId = id;

          const icon = document.createElement("span");
          icon.className = "modelIcon";
          icon.innerHTML = getModelIcon(id);

          const nameContainer = document.createElement("div");
          nameContainer.className = "modelNameContainer";

          const name = document.createElement("span");
          name.className = "modelName";
          name.textContent = id;

          const providerBadge = document.createElement("span");
          providerBadge.className = "modelProvider";
          providerBadge.textContent = provider;

          nameContainer.appendChild(name);
          //   nameContainer.appendChild(providerBadge);

          const status = document.createElement("span");
          status.className = "modelStatus";
          status.textContent = "…";

          li.appendChild(icon);
          li.appendChild(nameContainer);
          li.appendChild(status);

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

  selectedModelInfoEl.classList.remove("hidden");
  selectedModelAnswerEl.classList.remove("hidden");

  selectedModelInfoEl.innerHTML = `
    <h2>${getModelIcon(id)} ${id}</h2>
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

  const tasks = models.map((m) => askSingleModel(question, m.id));
  const results = await Promise.allSettled(tasks);

  // Log any failed promises for debugging
  results.forEach((result, index) => {
    if (result.status === "rejected") {
      console.error(`Model ${models[index].id} failed:`, result.reason);
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

  console.debug("renderComparisonTable building tables", { successful: Object.keys(successfulAnswers).length, failed: Object.keys(failedAnswers).length });

  // Render header into the dedicated resultsHeader container (outside the scrollable table)
  const resultsHeaderEl = document.getElementById("resultsHeader");
  if (resultsHeaderEl) {
    const successCount = Object.keys(successfulAnswers).length;
    const failedCount = Object.keys(failedAnswers).length;
    resultsHeaderEl.innerHTML = `
      <div id="tableHeader">
        <div id="tableTitle">
          <h3>${t("comparisonTitle")}</h3>
          <div class="resultsCounts">${successCount} ${t("successfulResponses")} • ${failedCount} ${t("failedResponses")}</div>
          <button id="clearResultsBtn" class="clear-btn">${t("clearResults")}</button>
        </div>
        <div class="questionTitle"><strong>${t("question")}:</strong> ${lastQuestion}</div>
      </div>
    `;
  }

  // Render successful answers table
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
    failedTable.classList.add("failed-table");
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

  // Add event listener to clear button
  const clearBtn = document.getElementById("clearResultsBtn");
  if (clearBtn) clearBtn.addEventListener("click", clearResults);

  // No dynamic measurement needed: header is outside the scroll container and sticks under the top bar.
  if (isMobile()) {
    setMobileControlsVisible(true);
  }
}

function createComparisonTable(answerSet) {
  const table = document.createElement("table");
  table.className = "compare";

  const headerRow = document.createElement("tr");
  [t("model"), t("time"), t("answer")].forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  Object.keys(answerSet).forEach((id) => {
    const ans = answerSet[id];
    const row = document.createElement("tr");

    // Model cell
    const modelCell = document.createElement("td");
    modelCell.innerHTML = `${getModelIcon(id)} ${id}`;
    row.appendChild(modelCell);

    // Time cell
    const timeCell = document.createElement("td");
    timeCell.textContent = `${ans.time} ms`;
    row.appendChild(timeCell);

    // Answer cell
    const answerCell = document.createElement("td");
    answerCell.className = "answer-cell";

    const tableElement = parseMarkdownTable(ans.text);
    if (tableElement) {
      answerCell.appendChild(tableElement);
    } else {
      answerCell.innerHTML = parseMarkdown(ans.text);
    }

    row.appendChild(answerCell);
    table.appendChild(row);
  });

  return table;
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

// Prevent form submission
document.getElementById("questionArea").addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage();
});

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


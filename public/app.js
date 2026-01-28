// ===============================
// GLOBAL STATE
// ===============================
let models = [];              // [{id, created, owner}]
let answers = {};             // modelId -> { text, time }
let lastQuestion = "";
let selectedModel = null;
let history = JSON.parse(localStorage.getItem('chatHistory')) || [];             // [{ question, answersSnapshot }]
let currentLanguage = localStorage.getItem('language') || 'bg'; // 'bg' or 'en'
let collapsedProviders = JSON.parse(localStorage.getItem('collapsedProviders')) || {}; // provider -> boolean
let providerStatus = {}; // provider status from backend

// ===============================
// TRANSLATIONS
// ===============================
const translations = {
  bg: {
    title: 'AI Multi-Model Tool',
    models: 'Модели',
    refreshModels: '⟳',
    expandCollapse: 'Разгъни/Сгъни всички',
    history: 'История',
    clearHistory: '🗑️',
    messagePlaceholder: 'Напиши въпрос, който всички модели да отговорят...',
    sendButton: 'Сравни всички модели',
    typing: 'Моделите отговарят…',
    modelInfo: 'Информация за модела',
    responseTime: 'Време за отговор',
    question: 'Въпрос',
    noResponse: 'Този модел не е отговорил.',
    comparisonTitle: 'Сравнение на моделите',
    model: 'Модел',
    time: 'Време',
    answer: 'Отговор',
    language: 'Език',
    english: 'English',
    bulgarian: 'Български'
  },
  en: {
    title: 'AI Multi-Model Tool',
    models: 'Models',
    refreshModels: '⟳',
    expandCollapse: 'Expand/Collapse All',
    history: 'History',
    clearHistory: '🗑️',
    messagePlaceholder: 'Type a question for all models to answer...',
    sendButton: 'Compare all models',
    typing: 'Models are responding…',
    modelInfo: 'Model Information',
    responseTime: 'Response Time',
    question: 'Question',
    noResponse: 'This model did not respond.',
    comparisonTitle: 'Model Comparison',
    model: 'Model',
    time: 'Time',
    answer: 'Answer',
    language: 'Language',
    english: 'English',
    bulgarian: 'Български'
  }
};

// ===============================
// TRANSLATION FUNCTIONS
// ===============================
function t(key) {
  return translations[currentLanguage][key] || key;
}

function updateLanguage(lang) {
  currentLanguage = lang;
  localStorage.setItem('language', lang);
  applyTranslations();
}

function applyTranslations() {
  // Update title
  document.title = t('title');
  document.querySelector('#title').textContent = t('title');

  // Update placeholders and buttons
  document.querySelector('#message').placeholder = t('messagePlaceholder');
  document.querySelector('#sendBtn').textContent = t('sendButton');

  // Update section headers
  document.querySelectorAll('.sectionHeader h2')[0].textContent = t('models');
  document.querySelectorAll('.sectionHeader h2')[1].textContent = t('history');

  // Update typing indicator
  document.querySelector('#typingIndicator').textContent = t('typing');

  // Update comparison table if exists
  const comparisonTitle = document.querySelector('#comparisonTable h3');
  if (comparisonTitle) {
    comparisonTitle.textContent = t('comparisonTitle');
  }

  // Update table headers
  const tableHeaders = document.querySelectorAll('.compare th');
  if (tableHeaders.length >= 3) {
    tableHeaders[0].textContent = t('model');
    tableHeaders[1].textContent = t('time');
    tableHeaders[2].textContent = t('answer');
  }

  // Update selected model info
  const selectedModelInfo = document.querySelector('#selectedModelInfo h2');
  if (selectedModelInfo) {
    selectedModelInfo.textContent = t('modelInfo');
  }

  const modelDetails = document.querySelectorAll('#selectedModelInfo .modelDetails div');
  if (modelDetails.length >= 3) {
    modelDetails[0].innerHTML = modelDetails[0].innerHTML.replace('Актуален към:', t('responseTime') + ':');
    modelDetails[1].innerHTML = modelDetails[1].innerHTML.replace('Време за отговор:', t('responseTime') + ':');
    modelDetails[2].innerHTML = modelDetails[2].innerHTML.replace('Въпрос:', t('question') + ':');
  }

  // Update no response message
  const noResponseEl = document.querySelector('#selectedModelAnswer');
  if (noResponseEl && noResponseEl.textContent === 'Този модел не е отговорил.') {
    noResponseEl.textContent = t('noResponse');
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
  default: "🤖"
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
    default: `<svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="#3b82f6"/></svg>`
  };

  if (!id || typeof id !== "string") return icons.default;

  // Remove provider prefixes for icon detection
  const cleanId = id.toLowerCase()
    .replace(/^openai-/, '')
    .replace(/^anthropic-/, '')
    .replace(/^google-/, '');

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
    Other: []
  };

  models.forEach(m => {
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

function parseMarkdownTable(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return null; // Return null if not a table

  // Check if first line starts with | and has separators
  if (!lines[0].startsWith('|') || !lines[1].includes('---')) return null;

  const headers = lines[0].split('|').slice(1, -1).map(h => h.trim());
  const rows = [];

  for (let i = 2; i < lines.length; i++) {
    if (lines[i].trim() === '') continue;
    const cells = lines[i].split('|').slice(1, -1).map(c => c.trim());
    if (cells.length === headers.length) {
      rows.push(cells);
    }
  }

  if (rows.length === 0) return null;

  // Create table element
  const table = document.createElement('table');
  table.className = 'markdown-table';

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  headers.forEach(h => {
    const th = document.createElement('th');
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  rows.forEach(rowData => {
    const row = document.createElement('tr');
    rowData.forEach(cellData => {
      const td = document.createElement('td');
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
  const res = await fetch("/models");
  const data = await res.json();

  if (!data.models || !Array.isArray(data.models)) {
    models = [];
  } else {
    models = data.models.filter(m => m && m.id);
  }

  // Store provider status
  providerStatus = data.providers || {};

  // Initialize collapsed state for all providers (active and inactive)
  const allProviders = Object.keys(providerStatus);
  allProviders.forEach(provider => {
    if (!(provider in collapsedProviders)) {
      collapsedProviders[provider] = false;
    }
  });
  localStorage.setItem('collapsedProviders', JSON.stringify(collapsedProviders));

  renderModelList();
}

function renderModelList() {
  modelListEl.innerHTML = "";

  // Group models by provider
  const grouped = {};
  models.forEach(m => {
    const provider = m.provider || "Unknown";
    if (!grouped[provider]) {
      grouped[provider] = [];
    }
    grouped[provider].push(m);
  });

  // Show all providers (both active and inactive)
  Object.keys(providerStatus).sort().forEach(providerName => {
    const list = grouped[providerName] || [];
    const status = providerStatus[providerName];
    const isActive = status && status.enabled && status.hasApiKey;

    // Create collapsible provider group
    const providerGroup = document.createElement("div");
    providerGroup.className = isActive ? "providerGroup" : "providerGroup inactive";
    providerGroup.dataset.provider = providerName;

    const header = document.createElement("div");
    header.className = isActive ? "modelGroupHeader" : "modelGroupHeader inactive";
    header.setAttribute("role", "button");
    header.setAttribute("aria-expanded", !collapsedProviders[providerName]);
    header.setAttribute("tabindex", "0");
    
    const headerContent = document.createElement("div");
    headerContent.className = "headerContent";
    
    const arrow = document.createElement("span");
    arrow.className = "expandArrow";
    arrow.innerHTML = collapsedProviders[providerName] ? "▶" : "▼";
    
    const providerTitle = document.createElement("span");
    const statusBadge = isActive ? `` : ` <span class="inactiveBadge">⚠ No API Key</span>`;
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

    const modelsContainer = document.createElement("div");
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
      list.forEach(m => {
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
      nameContainer.appendChild(providerBadge);

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
}

// Toggle provider collapse/expand
function toggleProvider(providerName) {
  collapsedProviders[providerName] = !collapsedProviders[providerName];
  localStorage.setItem('collapsedProviders', JSON.stringify(collapsedProviders));
  
  const providerGroup = document.querySelector(`.providerGroup[data-provider="${providerName}"]`);
  if (providerGroup) {
    const header = providerGroup.querySelector('.modelGroupHeader');
    const arrow = header.querySelector('.expandArrow');
    const modelsContainer = providerGroup.querySelector('.providerModels');
    
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
  const allCollapsed = Object.values(collapsedProviders).every(v => v === true);
  
  Object.keys(collapsedProviders).forEach(provider => {
    collapsedProviders[provider] = !allCollapsed;
  });
  
  localStorage.setItem('collapsedProviders', JSON.stringify(collapsedProviders));
  renderModels();
}

document.getElementById("refreshModels").onclick = loadModels;
document.getElementById("expandCollapseBtn").onclick = toggleAllProviders;
document.getElementById("clearHistory").onclick = () => {
  history = [];
  localStorage.removeItem('chatHistory');
  renderHistory();
};
// ===============================
// HISTORY
// ===============================
function renderHistory() {
  historyListEl.innerHTML = "";

  history.forEach((item, idx) => {
    const li = document.createElement("li");
    li.textContent = `${idx + 1}. ${item.question}`;
    li.onclick = () => {
      lastQuestion = item.question;
      answers = { ...item.answersSnapshot };
      selectedModel = null;

      document
        .querySelectorAll(".modelItem")
        .forEach(el => el.classList.remove("activeModel"));

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

  document.querySelectorAll(".modelItem").forEach(el => {
    el.classList.toggle("activeModel", el.dataset.modelId === id);
  });

  const model = models.find(m => m.id === id);
  const answer = answers[id];

  selectedModelInfoEl.classList.remove("hidden");
  selectedModelAnswerEl.classList.remove("hidden");

  selectedModelInfoEl.innerHTML = `
    <h2>${getModelIcon(id)} ${id}</h2>
    <div class="modelDetails">
      <div><strong>${t('responseTime')}:</strong> ${formatCreated(model?.created)}</div>
      <div><strong>${t('responseTime')}:</strong> ${answer ? answer.time + " ms" : "няма"}</div>
      <div><strong>${t('question')}:</strong> ${lastQuestion || "няма"}</div>
    </div>
  `;

  selectedModelAnswerEl.textContent = answer
    ? answer.text
    : t('noResponse');
}

// ===============================
// ASK ALL MODELS
// ===============================
async function askAllModels(question) {
  answers = {};
  lastQuestion = question;

  document.querySelectorAll(".modelStatus").forEach(el => {
    el.textContent = "…";
    el.className = "modelStatus";
  });

  typingIndicator.classList.remove("hidden");
  comparisonTableEl.innerHTML = "";
  selectedModelInfoEl.classList.add("hidden");
  selectedModelAnswerEl.classList.add("hidden");

  const tasks = models.map(m => askSingleModel(question, m.id));
  await Promise.all(tasks);

  typingIndicator.classList.add("hidden");
  renderComparisonTable();

  history.push({
    question,
    answersSnapshot: { ...answers }
  });
  localStorage.setItem('chatHistory', JSON.stringify(history));
  renderHistory();
}

async function askSingleModel(question, modelId) {
  const start = performance.now();

  const response = await fetch("/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: question, model: modelId })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  let fullAnswer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (!line.startsWith("data:")) continue;

      const payload = line.replace("data:", "").trim();
      if (payload === "[DONE]") {
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
        if (json.token) fullAnswer += json.token;
      } catch {}
    }
  }
}

// ===============================
// COMPARISON TABLE
// ===============================
function renderComparisonTable() {
  if (!lastQuestion || !Object.keys(answers).length) {
    comparisonTableEl.innerHTML = "";
    return;
  }

  comparisonTableEl.innerHTML = `
    <h3>${t('comparisonTitle')}</h3>
    <div class="questionTitle"><strong>${t('question')}:</strong> ${lastQuestion}</div>
  `;

  const table = document.createElement('table');
  table.className = 'compare';

  const headerRow = document.createElement('tr');
  [t('model'), t('time'), t('answer')].forEach(header => {
    const th = document.createElement('th');
    th.textContent = header;
    headerRow.appendChild(th);
  });
  table.appendChild(headerRow);

  Object.keys(answers).forEach(id => {
    const ans = answers[id];
    const row = document.createElement('tr');

    // Model cell
    const modelCell = document.createElement('td');
    modelCell.innerHTML = `${getModelIcon(id)} ${id}`;
    row.appendChild(modelCell);

    // Time cell
    const timeCell = document.createElement('td');
    timeCell.textContent = `${ans.time} ms`;
    row.appendChild(timeCell);

    // Answer cell
    const answerCell = document.createElement('td');
    answerCell.className = 'answer-cell';

    const tableElement = parseMarkdownTable(ans.text);
    if (tableElement) {
      answerCell.appendChild(tableElement);
    } else {
      answerCell.textContent = ans.text;
    }

    row.appendChild(answerCell);
    table.appendChild(row);
  });

  comparisonTableEl.appendChild(table);
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
messageInput.addEventListener("keydown", e => {
  if (e.key === "Enter") sendMessage();
});

// ===============================
// INIT
// ===============================
loadModels();
renderHistory();
applyTranslations();

// Language switcher
document.getElementById('langBg').addEventListener('click', () => {
  updateLanguage('bg');
  updateLanguageButtons();
});

document.getElementById('langEn').addEventListener('click', () => {
  updateLanguage('en');
  updateLanguageButtons();
});

function updateLanguageButtons() {
  document.getElementById('langBg').classList.toggle('active', currentLanguage === 'bg');
  document.getElementById('langEn').classList.toggle('active', currentLanguage === 'en');
}

// Initialize language buttons
updateLanguageButtons();

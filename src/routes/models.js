import express from "express";
import fetch from "node-fetch";

import {
  initModelStatusCache,
  getAllModelStatuses,
  clearAllModelStatuses,
  getModelStatus,
  markModelQuotaExceeded,
  markModelPaid,
  markModelWorking,
  getFilteredModels,
  isKnownFreeModel,
} from "../modelStatus.js";

import {
  initFailedModelsCache,
  filterFailedModels,
  getFailedModels,
  addFailedModel,
  removeFailedModel,
  clearFailedModels,
  isFailedModel,
} from "../failedModels.js";

// Initialize the model status cache
initModelStatusCache();

// Initialize the failed models cache
initFailedModelsCache();

const router = express.Router();

// Provider configurations
const PROVIDERS = {
  groq: {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    modelsUrl: "/models",
    chatUrl: "/chat/completions",
    get apiKey() {
      return process.env.GROQ_API_KEY;
    },
    get enabled() {
      return !!process.env.GROQ_API_KEY;
    },
    modelPrefix: "",
    formatMessage: (message, model) => ({
      model,
      stream: true,
      temperature: 0.8,
      top_p: 0.9,
      messages: [{ role: "user", content: message.trim() }],
    }),
  },
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    modelsUrl: "/models",
    chatUrl: "/chat/completions",
    get apiKey() {
      return process.env.OPENAI_API_KEY;
    },
    get enabled() {
      return !!process.env.OPENAI_API_KEY;
    },
    modelPrefix: "openai-",
    formatMessage: (message, model) => ({
      model: model.replace("openai-", ""), // Remove prefix for API call
      stream: true,
      temperature: 0.8,
      top_p: 0.9,
      messages: [{ role: "user", content: message.trim() }],
    }),
  },
  anthropic: {
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    modelsUrl: "/models",
    chatUrl: "/messages",
    get apiKey() {
      return process.env.ANTHROPIC_API_KEY;
    },
    get enabled() {
      return !!process.env.ANTHROPIC_API_KEY;
    },
    modelPrefix: "anthropic-",
    getHeaders: (apiKey) => ({
      "X-Api-Key": apiKey,
      "anthropic-version": "2023-06-01",
    }),
    formatMessage: (message, model) => ({
      model: model.replace("anthropic-", ""),
      max_tokens: 4096,
      stream: true,
      temperature: 0.8,
      top_p: 0.9,
      messages: [{ role: "user", content: message.trim() }],
    }),
    headers: {
      "anthropic-version": "2023-06-01",
    },
  },
  google: {
    name: "Google AI",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    modelsUrl: "/models",
    chatUrl: (model) =>
      `/models/${model.replace("google-", "")}:streamGenerateContent`,
    get apiKey() {
      return process.env.GOOGLE_API_KEY;
    },
    get enabled() {
      return !!process.env.GOOGLE_API_KEY;
    },
    modelPrefix: "google-",
    useQueryAuth: true,
    formatMessage: (message, model) => ({
      contents: [
        {
          parts: [{ text: message.trim() }],
        },
      ],
      generationConfig: {
        temperature: 0.8,
        topP: 0.9,
        maxOutputTokens: 4096,
      },
    }),
  },
  mistral: {
    name: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    modelsUrl: "/models",
    chatUrl: "/chat/completions",
    get apiKey() {
      return process.env.MISTRAL_API_KEY;
    },
    get enabled() {
      return !!process.env.MISTRAL_API_KEY;
    },
    modelPrefix: "mistral-",
    formatMessage: (message, model) => ({
      model: model.replace("mistral-", ""),
      stream: true,
      temperature: 0.8,
      top_p: 0.9,
      messages: [{ role: "user", content: message.trim() }],
    }),
  },
  cohere: {
    name: "Cohere",
    baseUrl: "https://api.cohere.com/v2",
    modelsUrl: "/models",
    chatUrl: "/chat",
    get apiKey() {
      return process.env.COHERE_API_KEY;
    },
    get enabled() {
      return !!process.env.COHERE_API_KEY;
    },
    modelPrefix: "cohere-",
    formatMessage: (message, model) => ({
      model: model.replace("cohere-", ""),
      messages: [{ role: "user", content: message.trim() }],
      temperature: 0.8,
      stream: true,
    }),
  },
  deepseek: {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com",
    modelsUrl: "/models",
    chatUrl: "/chat/completions",
    get apiKey() {
      return process.env.DEEPSEEK_API_KEY;
    },
    get enabled() {
      return !!process.env.DEEPSEEK_API_KEY;
    },
    modelPrefix: "deepseek-",
    formatMessage: (message, model) => ({
      model: model.replace("deepseek-", ""),
      stream: true,
      temperature: 0.8,
      top_p: 0.9,
      messages: [{ role: "user", content: message.trim() }],
    }),
  },
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    modelsUrl: "/models",
    chatUrl: "/chat/completions",
    get apiKey() {
      return process.env.OPENROUTER_API_KEY;
    },
    get enabled() {
      return !!process.env.OPENROUTER_API_KEY;
    },
    modelPrefix: "openrouter-",
    formatMessage: (message, model) => ({
      model: model.replace("openrouter-", ""),
      stream: true,
      temperature: 0.8,
      top_p: 0.9,
      messages: [{ role: "user", content: message.trim() }],
    }),
    headers: {
      "HTTP-Referer": process.env.APP_URL || "http://localhost",
      "X-Title": "AI Model Comparison",
    },
  },
  huggingface: {
    name: "Hugging Face",
    // Use the main Hugging Face API host for listing available models. The
    // inference API host (api-inference.huggingface.co) is used for model
    // inference requests in chat.js; listing models must use the huggingface.co
    // API endpoint to avoid 410/Deprecated responses.
    baseUrl: "https://huggingface.co",
    modelsUrl: "/api/models",
    chatUrl: (model) => `/models/${model.replace("huggingface-", "")}`,
    get apiKey() {
      return process.env.HUGGINGFACE_API_KEY;
    },
    get enabled() {
      return !!process.env.HUGGINGFACE_API_KEY;
    },
    modelPrefix: "huggingface-",
    formatMessage: (message, model) => ({
      inputs: message.trim(),
      parameters: {
        temperature: 0.8,
        top_p: 0.9,
        max_new_tokens: 1024,
      },
    }),
    getHeaders: (apiKey) => ({
      Authorization: `Bearer ${apiKey}`,
    }),
  },
};

let cachedModels = null;
let cacheTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Helper function to validate if a model can support chat/completion
function isValidChatModel(modelId) {
  if (!modelId || typeof modelId !== "string") return false;

  const id = modelId.toLowerCase();

  // If modelId is namespaced like owner/model, also inspect the model part
  const parts = id.split('/');
  const shortName = parts.length > 1 ? parts[1] : parts[0];

  // Exclude non-chat/completion models
  const exclusions = [
    "embedding",
    "embed",
    "moderation",
    "edit",
    "audio",
    "whisper",
    "tts",
    "speech",
    "transcribe",
    "vision-only",
    "instruct-light",
    "small",
    "tiny",
    "davinci-002",
    "davinci-003", // old models
    "text-davinci",
    "text-curie",
    "text-babbage",
    "text-ada", // legacy models
    "gpt-3.5", // older, less capable
    "claude-1",
    "claude-1.3",
    "claude-instant", // old anthropic models
    "command-light",
    "command-nightly", // older cohere models
    "palm",
    "bison", // deprecated google models
    "mistral-tiny",
    "mistral-small", // very old mistral
    "experimental",
    "preview",
    "legacy",
    "test",
    "mock",
    "demo",
    "dall-e",
    "image",
    "vision",
    "code-search",
    "search",
    "similarity",
    // legacy / old model families not relevant for modern chat
    "gpt-2",
    "gpt2",
    "gpt-neo",
    "gpt-j",
    "gpt-j-",
    "gpt-neo-x",
    "bert",
    "roberta",
    "distilbert",
    "electra",
    "albert",
    "xlnet",
    "t5",
    "bart",
    "transformer",
  ];

  for (const exclusion of exclusions) {
    if (id.includes(exclusion) || shortName.includes(exclusion)) return false;
  }

  // Include models that are chat/completion capable
  const inclusions = [
    "chat",
    "gpt",
    "claude",
    "gemini",
    "command",
    "mistral",
    "llama",
    "qwen",
    "mixtral",
    "neural",
    "instruct",
    "colossus",
    "aya",
    "deepseek",
    "openrouter",
    "hugging",
    "zephyr",
    "mistral",
    "phi",
    "gemma",
  ];

  // If the shortName explicitly contains an inclusion keyword, accept it.
  if (inclusions.some((inclusion) => shortName.includes(inclusion))) return true;

  // Otherwise require at least one inclusion in the full id
  return inclusions.some((inclusion) => id.includes(inclusion));
}

// Helper function to fetch models from a provider
async function fetchProviderModels(provider) {
  if (!provider.enabled) return [];

  try {
    let url = `${provider.baseUrl}${provider.modelsUrl}`;

    // Google AI uses query parameter authentication
    if (provider.useQueryAuth) {
      url += `?key=${provider.apiKey}`;
    }

    // Build headers based on provider
    let headers;
    if (provider.getHeaders) {
      headers = provider.getHeaders(provider.apiKey);
    } else if (provider.useQueryAuth) {
      // Google AI doesn't need Authorization header
      headers = {};
    } else {
      headers = { Authorization: `Bearer ${provider.apiKey}` };
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.warn(
        `Failed to fetch models from ${provider.name}: ${response.status}`
      );
      return [];
    }

    const data = await response.json();

    // Handle different response formats
    let models = [];
    if (provider.name === "Google AI" && data.models) {
      // Google AI returns models with name field
      models = data.models
        .filter(
          (m) =>
            m.name &&
            m.supportedGenerationMethods &&
            m.supportedGenerationMethods.includes("generateContent") &&
            isValidChatModel(m.name)
        )
        .map((m) => {
          const modelName = m.name.replace("models/", "");
          return {
            id: `${provider.modelPrefix}${modelName}`,
            created: Date.now() / 1000,
            owner: provider.name.toLowerCase(),
            provider: provider.name,
          };
        });
    } else if (
      provider.name === "Anthropic" &&
      data.data &&
      Array.isArray(data.data)
    ) {
      // Anthropic returns array in data field with different structure
      models = data.data
        .filter((m) => {
          if (m.type !== "model") return false;

          const modelId = (m.id || "").toString();

          // Prefer explicit capability metadata when available
          const caps = m.capabilities || m.metadata?.capabilities || {};
          if (caps && caps.completion_chat === true) return true;

          // Tags/labels may indicate chat/conversational capability
          const tags = Array.isArray(m.tags)
            ? m.tags.map((t) => t.toString().toLowerCase())
            : Array.isArray(m.metadata?.tags)
            ? m.metadata.tags.map((t) => t.toString().toLowerCase())
            : [];
          const chatIndicators = ["chat", "conversational", "assistant", "instruct", "completion"];
          if (tags.some((t) => chatIndicators.includes(t))) return true;

          // Fallback to heuristic on id
          return isValidChatModel(modelId);
        })
        .map((m) => ({
          id: `${provider.modelPrefix}${m.id}`,
          created: new Date(m.created_at).getTime() / 1000,
          owner: provider.name.toLowerCase(),
          provider: provider.name,
        }));
    } else if (
      provider.name === "Mistral" &&
      data.data &&
      Array.isArray(data.data)
    ) {
      // Mistral returns array in data field
      models = data.data
        .filter((m) => {
          // Check capabilities object for completion_chat
          const hasCompletion =
            m.capabilities && m.capabilities.completion_chat === true;

          // Prefer explicit capability metadata
          if (hasCompletion) return true;

          // Use tags/metadata when available
          const tags = Array.isArray(m.tags)
            ? m.tags.map((t) => t.toString().toLowerCase())
            : Array.isArray(m.metadata?.tags)
            ? m.metadata.tags.map((t) => t.toString().toLowerCase())
            : [];
          const chatIndicators = ["chat", "instruct", "completion", "conversational", "assistant"];
          if (tags.some((t) => chatIndicators.includes(t))) return true;

          return (
            (m.id.includes("instruct") || m.id.includes("chat")) &&
            isValidChatModel(m.id)
          );
        })
        .map((m) => ({
          id: `${provider.modelPrefix}${m.id}`,
          created: m.created || Date.now() / 1000,
          owner: provider.name.toLowerCase(),
          provider: provider.name,
        }));
    } else if (
      provider.name === "Cohere" &&
      data.models &&
      Array.isArray(data.models)
    ) {
      // Cohere returns array in models field
      models = data.models
        .filter((m) => {
          if (m.is_deprecated) return false;

          // If Cohere exposes endpoints, prefer chat endpoint
          if (m.endpoints && m.endpoints.includes("chat")) return isValidChatModel(m.name);

          // Otherwise use tags/metadata if available
          const tags = Array.isArray(m.tags) ? m.tags.map(t => t.toString().toLowerCase()) : [];
          const nonChat = ["embed", "embedding", "classification", "search", "generation-image"];
          if (tags.some(t => nonChat.includes(t))) return false;

          return isValidChatModel(m.name);
        })
        .map((m) => ({
          id: `${provider.modelPrefix}${m.name}`,
          created: Date.now() / 1000,
          owner: provider.name.toLowerCase(),
          provider: provider.name,
        }));
    } else if (data.data && Array.isArray(data.data)) {
      // OpenAI/Groq format
      models = data.data
        .filter((m) => {
          const modelId = (m.id || "").toString().toLowerCase();

          // If provider supplies tags/metadata, use them to exclude non-chat models
          const metaTags = Array.isArray(m.tags)
            ? m.tags.map((t) => t.toString().toLowerCase())
            : Array.isArray(m.metadata?.tags)
            ? m.metadata.tags.map((t) => t.toString().toLowerCase())
            : [];

          const nonChatIndicators = ["image", "vision", "audio", "embed", "embedding", "speech", "whisper", "tts", "transcribe"];
          if (metaTags.some((t) => nonChatIndicators.includes(t))) return false;

          // Check if model is valid for chat (heuristic)
          if (!isValidChatModel(modelId)) return false;

          // Additional filtering for OpenAI/Groq
          if (modelId.includes("embedding")) return false;
          if (modelId.includes("moderation")) return false;
          if (modelId.includes("edit")) return false;
          if (modelId.includes("audio")) return false;
          if (modelId.includes("speech")) return false;
          if (modelId.includes("dall-e")) return false;
          if (modelId.includes("whisper")) return false;

          // Keep GPT-4 vision but filter other vision models
          if (modelId.includes("vision") && !modelId.includes("gpt-4"))
            return false;

          // Exclude very old models
          if (
            modelId.includes("curie") ||
            modelId.includes("babbage") ||
            modelId.includes("ada")
          )
            return false;

          return true;
        })
        .map((m) => ({
          id: `${provider.modelPrefix}${m.id}`,
          created: m.created || Date.now() / 1000,
          owner: m.owned_by || provider.name.toLowerCase(),
          provider: provider.name,
        }));
    }

    // Hugging Face returns a top-level array of model objects at
    // https://huggingface.co/api/models - handle that format explicitly.
    if (provider.name === "Hugging Face" && Array.isArray(data)) {
      try {
        console.debug(`Fetched ${data.length} Hugging Face models (sample: ${data[0]?.id || data[0]?._id})`);
      } catch (e) {}

      models = data
        .filter((m) => {
          const id = (m.id || m.modelId || m._id || "").toString();
          if (!id) return false;
          // Skip private or gated models
          if (m.private === true) return false;
          // Use Hugging Face metadata when available to better detect chat-capable models.
          const pipelineTag = (m.pipeline_tag || "").toString().toLowerCase();
          const tags = Array.isArray(m.tags) ? m.tags.map(t => t.toString().toLowerCase()) : [];

          // Exclude image/audio/vision/speech specialized models
          const nonChatPipelines = [
            "image-classification",
            "image-segmentation",
            "text-to-image",
            "image-to-image",
            "automatic-speech-recognition",
            "text-to-speech",
            "audio-classification",
            "voice",
            "speech",
            "text-to-speech",
            "audio",
            "stable-diffusion",
            "diffusion",
            "image-generation",
          ];

          if (nonChatPipelines.includes(pipelineTag) || tags.some(t => nonChatPipelines.includes(t))) {
            return false;
          }

          // Accept if pipeline indicates text-generation / conversational / text-to-text / question-answering
          const chatPipelines = ["text-generation", "text-to-text", "conversational", "question-answering", "text-generation-inference"];
          if (chatPipelines.includes(pipelineTag) || tags.some(t => chatPipelines.includes(t))) {
            return true;
          }

          // Reject obvious weight/file repositories or offline packages
          const lowerId = id.toString().toLowerCase();
          const disqualifiers = [
            "gguf",
            "ggml",
            "safetensors",
            "ckpt",
            "pt",
            "pth",
            "onnx",
            "quantized",
            "q4",
            "q5",
          ];
          if (disqualifiers.some((d) => lowerId.includes(d))) return false;

          // Prefer explicit endpoint/inference compatibility tags when available
          const endpointIndicators = [
            "endpoints_compatible",
            "inference",
            "text-generation-inference",
            "endpoints",
            "inference-api",
            "hf-inference",
          ];
          if (endpointIndicators.some((t) => tags.includes(t) || pipelineTag.includes(t))) {
            return true;
          }

          // If metadata is not decisive, be more permissive: accept models
          // that either look chatty by heuristic or have chat/conversational tags.
          // Still reject raw weight repos (gguf/ggml/etc.) above.
          const chatIndicators = ["chat", "conversational", "assistant", "instruct", "question-answering", "text-generation"];
          const hasChatTag = tags.some((t) => chatIndicators.includes(t));

          // Accept if tags/pipeline indicate chat OR heuristic believes it's chat-capable
          if (hasChatTag || chatPipelines.includes(pipelineTag)) return true;

          // Fallback: accept if heuristic deems it chat-capable
          return isValidChatModel(id);
        })
        .map((m) => {
          const id = (m.id || m.modelId || m._id).toString();
          const created = m.createdAt
            ? Math.round(new Date(m.createdAt).getTime() / 1000)
            : Date.now() / 1000;
          return {
            id: `${provider.modelPrefix}${id}`,
            created,
            owner: (id.split("/")[0] || provider.name.toLowerCase()),
            provider: provider.name,
          };
        });
    }

    return models;
  } catch (error) {
    console.warn(`Error fetching models from ${provider.name}:`, error.message);
    return [];
  }
}

router.get("/", async (req, res) => {
  const now = Date.now();

  // Get provider status for all providers (needed both for cache and fresh requests)
  const providerStatus = Object.entries(PROVIDERS).reduce(
    (acc, [key, provider]) => {
      acc[provider.name] = {
        enabled: provider.enabled,
        hasApiKey: !!provider.apiKey,
        modelCount: cachedModels
          ? cachedModels.filter((m) => m.provider === provider.name).length
          : 0,
      };
      return acc;
    },
    {}
  );

  // Allow clients to force-refresh the model list with ?force=1
  const force = req.query && (req.query.force === '1' || req.query.force === 'true');

  if (!force && cachedModels && now - cacheTime < CACHE_DURATION) {
    // Update model counts in provider status
    Object.keys(providerStatus).forEach((providerName) => {
      providerStatus[providerName].modelCount = cachedModels.filter(
        (m) => m.provider === providerName
      ).length;
    });
    return res.json({ models: cachedModels, providers: providerStatus });
  }

  try {
    // Fetch models from all enabled providers
    const providerPromises = Object.values(PROVIDERS)
      .filter((provider) => provider.enabled)
      .map(fetchProviderModels);

    const providerResults = await Promise.all(providerPromises);
    const allModels = providerResults.flat();

    // Filter out models marked as quota_exceeded or paid in the server-side cache
    const statusFilteredModels = getFilteredModels(allModels);

    // Update provider status with actual model counts (already initialized at the top)
    Object.keys(providerStatus).forEach((providerName) => {
      providerStatus[providerName].modelCount = statusFilteredModels.filter(
        (m) => m.provider === providerName
      ).length;
    });

    // Sort models by provider and name
    const sortedModels = statusFilteredModels
      .filter((m) => m && m.id)
      // Filter out failed models permanently
      .filter((m) => !isFailedModel(m.id))
      .sort((a, b) => {
        if (a.provider !== b.provider) {
          return a.provider.localeCompare(b.provider);
        }
        return a.id.localeCompare(b.id);
      });

    if (sortedModels.length === 0) {
      return res.json({
        models: [],
        providers: providerStatus,
        warning: "No models available from any configured providers",
      });
    }

    cachedModels = sortedModels;
    cacheTime = now;

    res.json({
      models: sortedModels,
      providers: providerStatus,
    });
  } catch (error) {
    console.error("Error fetching models:", error);
    res.status(500).json({ error: "Failed to fetch models" });
  }
});

// GET /api/models/status - Get all model statuses
router.get("/status", (req, res) => {
  const statuses = getAllModelStatuses();
  res.json(statuses);
});

// POST /api/models/status - Update model status
router.post("/status", (req, res) => {
  const { modelId, status, action } = req.body;
  
  if (!modelId) {
    return res.status(400).json({ error: "modelId is required" });
  }
  
  switch (status) {
    case "quota_exceeded":
      markModelQuotaExceeded(modelId);
      break;
    case "paid":
      markModelPaid(modelId);
      break;
    case "working":
      markModelWorking(modelId);
      break;
    default:
      return res.status(400).json({ error: "Invalid status" });
  }
  
  res.json({ success: true, modelId, status });
});

// POST /api/models/status/reset - Reset all model statuses
router.post("/status/reset", (req, res) => {
  clearAllModelStatuses();
  res.json({ success: true, message: "Model status cache cleared" });
});

// GET /api/models/check/:modelId - Check status of a specific model
router.get("/check/:modelId", (req, res) => {
  const { modelId } = req.params;
  const status = getModelStatus(modelId);
  
  // Also check if it's a known free model
  const isFree = isKnownFreeModel(modelId);
  
  // Check if model is in failed cache
  const isFailed = isFailedModel(modelId);
  
  res.json({
    modelId,
    ...status,
    isKnownFree: isFree,
    isFailedModel: isFailed,
  });
});

// GET /api/models/failed - Get all failed models
router.get("/failed", (req, res) => {
  const failedModelsRaw = getFailedModels();
  // Normalize older string-only format to new object structure
  const models = (failedModelsRaw || []).map((m) =>
    typeof m === "string"
      ? { id: m, errorType: "unknown", timestamp: null }
      : m
  );
  res.json({
    count: models.length,
    models,
  });
});

// POST /api/models/failed - Add a model to failed cache
router.post("/failed", (req, res) => {
  const { modelId, errorType, error } = req.body;
  
  if (!modelId) {
    return res.status(400).json({ error: "modelId is required" });
  }

  const type = errorType || "unknown";
  let finalError = error || null;

  if (type === "user_deselect") {
    finalError = `Deselected by user from ip : ${req.ip}`;
  }
  
  addFailedModel(modelId, type, finalError);
  // Invalidate server-side models cache so frontend sees updated list immediately
  cachedModels = null;
  cacheTime = 0;
  res.json({ success: true, modelId, errorType: type, error: finalError, message: `Model ${modelId} added to failed cache` });
});

// DELETE /api/models/failed/:modelId - Remove a model from failed cache
router.delete("/failed/:modelId", (req, res) => {
  const { modelId } = req.params;
  
  const removed = removeFailedModel(modelId);
  if (removed) {
    // Invalidate models cache so UI sees restored model immediately
    cachedModels = null;
    cacheTime = 0;
    res.json({ success: true, modelId, message: `Model ${modelId} removed from failed cache` });
  } else {
    res.status(404).json({ error: "Model not found in failed cache", modelId });
  }
});

// DELETE /api/models/failed - Clear all failed models
router.delete("/failed", (req, res) => {
  clearFailedModels();
  // Invalidate models cache so frontend sees changes immediately
  cachedModels = null;
  cacheTime = 0;
  res.json({ success: true, message: "All failed models cleared" });
});

// POST /api/models/failed/batch-delete - Remove multiple models from failed cache
router.post("/failed/batch-delete", (req, res) => {
  const { modelIds } = req.body;
  if (!Array.isArray(modelIds) || modelIds.length === 0) {
    return res.status(400).json({ error: "modelIds (array) is required" });
  }

  const removed = [];
  const notFound = [];

  for (const id of modelIds) {
    try {
      const ok = removeFailedModel(id);
      if (ok) removed.push(id);
      else notFound.push(id);
    } catch (e) {
      // on error, treat as not found
      notFound.push(id);
    }
  }

  if (removed.length > 0) {
    // Invalidate models cache so frontend sees restored models immediately
    cachedModels = null;
    cacheTime = 0;
  }

  res.json({ success: true, removedCount: removed.length, removed, notFound });
});

export default router;

import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// Provider configurations
const PROVIDERS = {
  groq: {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    modelsUrl: "/models",
    chatUrl: "/chat/completions",
    apiKey: process.env.GROQ_API_KEY,
    enabled: !!process.env.GROQ_API_KEY,
    modelPrefix: "",
    formatMessage: (message, model) => ({
      model,
      stream: true,
      temperature: 0.8,
      top_p: 0.9,
      messages: [{ role: "user", content: message.trim() }]
    })
  },
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    modelsUrl: "/models",
    chatUrl: "/chat/completions",
    apiKey: process.env.OPENAI_API_KEY,
    enabled: !!process.env.OPENAI_API_KEY,
    modelPrefix: "openai-",
    formatMessage: (message, model) => ({
      model: model.replace("openai-", ""), // Remove prefix for API call
      stream: true,
      temperature: 0.8,
      top_p: 0.9,
      messages: [{ role: "user", content: message.trim() }]
    })
  },
  anthropic: {
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1",
    modelsUrl: "/models",
    chatUrl: "/messages",
    apiKey: process.env.ANTHROPIC_API_KEY,
    enabled: !!process.env.ANTHROPIC_API_KEY,
    modelPrefix: "anthropic-",
    formatMessage: (message, model) => ({
      model: model.replace("anthropic-", ""),
      max_tokens: 4096,
      stream: true,
      temperature: 0.8,
      top_p: 0.9,
      messages: [{ role: "user", content: message.trim() }]
    }),
    headers: {
      "anthropic-version": "2023-06-01"
    }
  },
  google: {
    name: "Google AI",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    modelsUrl: "/models",
    chatUrl: (model) => `/models/${model.replace("google-", "")}:streamGenerateContent`,
    apiKey: process.env.GOOGLE_AI_API_KEY,
    enabled: !!process.env.GOOGLE_AI_API_KEY,
    modelPrefix: "google-",
    formatMessage: (message, model) => ({
      contents: [{
        parts: [{ text: message.trim() }]
      }],
      generationConfig: {
        temperature: 0.8,
        topP: 0.9,
        maxOutputTokens: 4096
      }
    })
  }
};

let cachedModels = null;
let cacheTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Helper function to fetch models from a provider
async function fetchProviderModels(provider) {
  if (!provider.enabled) return [];

  try {
    const url = `${provider.baseUrl}${provider.modelsUrl}`;
    const headers = {
      "Authorization": `Bearer ${provider.apiKey}`,
      ...provider.headers
    };

    // Special handling for Google AI
    if (provider.name === "Google AI") {
      headers["x-goog-api-key"] = provider.apiKey;
      delete headers.Authorization;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.warn(`Failed to fetch models from ${provider.name}: ${response.status}`);
      return [];
    }

    const data = await response.json();

    // Handle different response formats
    let models = [];
    if (provider.name === "Google AI" && data.models) {
      models = data.models
        .filter(m => m.name && m.name.includes("gemini"))
        .map(m => ({
          id: `${provider.modelPrefix}${m.name}`,
          created: Date.now() / 1000,
          owner: provider.name.toLowerCase(),
          provider: provider.name
        }));
    } else if (data.data && Array.isArray(data.data)) {
      models = data.data.map(m => ({
        id: `${provider.modelPrefix}${m.id}`,
        created: m.created || Date.now() / 1000,
        owner: m.owned_by || provider.name.toLowerCase(),
        provider: provider.name
      }));
    }

    return models;
  } catch (error) {
    console.warn(`Error fetching models from ${provider.name}:`, error.message);
    return [];
  }
}

router.get("/", async (req, res) => {
  const now = Date.now();
  if (cachedModels && (now - cacheTime) < CACHE_DURATION) {
    return res.json({ models: cachedModels });
  }

  try {
    // Fetch models from all enabled providers
    const providerPromises = Object.values(PROVIDERS)
      .filter(provider => provider.enabled)
      .map(fetchProviderModels);

    const providerResults = await Promise.all(providerPromises);
    const allModels = providerResults.flat();

    // Sort models by provider and name
    const sortedModels = allModels
      .filter(m => m.id)
      .sort((a, b) => {
        if (a.provider !== b.provider) {
          return a.provider.localeCompare(b.provider);
        }
        return a.id.localeCompare(b.id);
      });

    if (sortedModels.length === 0) {
      return res.json({
        models: [],
        warning: "No models available from any configured providers"
      });
    }

    cachedModels = sortedModels;
    cacheTime = now;

    res.json({ models: sortedModels });
  } catch (error) {
    console.error("Error fetching models:", error);
    res.status(500).json({ error: "Failed to fetch models" });
  }
});

export default router;

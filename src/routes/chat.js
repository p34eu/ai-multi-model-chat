import express from "express";
import fetch from "node-fetch";

import {
  markModelQuotaExceeded,
  markModelWorking,
} from "../modelStatus.js";

import {
  addFailedModel,
} from "../failedModels.js";

const router = express.Router();

// Provider configurations (same as in models.js)
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
    modelPrefix: "groq-",
    formatMessage: (message, model) => ({
      model: model.replace("groq-", ""), // Remove prefix for API call
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
    baseUrl: "https://api-inference.huggingface.co",
    modelsUrl: "/models",
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

// Helper function to determine provider from model ID
function getProviderFromModel(model) {
  for (const [key, provider] of Object.entries(PROVIDERS)) {
    if (model.startsWith(provider.modelPrefix)) {
      return provider;
    }
  }
  // Default to Groq for models without prefix
  return PROVIDERS.groq;
}

// Helper function to handle different streaming formats
function handleStreamingResponse(provider, response, res) {
  let buffer = "";

  if (provider.name === "Google AI") {
    // Handle Google AI streaming format
    response.body.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");

      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        if (!line.startsWith("data: ")) continue;

        const payload = line.replace("data: ", "").trim();
        if (payload === "") continue;

        try {
          const data = JSON.parse(payload);
          if (
            data.candidates &&
            data.candidates[0]?.content?.parts?.[0]?.text
          ) {
            const token = data.candidates[0].content.parts[0].text;
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }
        } catch (parseErr) {
          // Skip invalid JSON chunks
          continue;
        }
      }
    });
  } else if (provider.name === "Anthropic") {
    // Handle Anthropic streaming format
    response.body.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");

      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        const payload = line.replace("data: ", "").trim();

        if (payload === "[DONE]") {
          res.write("data: [DONE]\n\n");
          return res.end();
        }

        if (payload === "") continue;

        try {
          const json = JSON.parse(payload);
          if (json.delta?.text) {
            res.write(
              `data: ${JSON.stringify({ token: json.delta.text })}\n\n`
            );
          }
        } catch (parseErr) {
          continue;
        }
      }
    });
  } else if (provider.name === "Cohere") {
    // Handle Cohere v2 streaming format (SSE)
    response.body.on("data", (chunk) => {
      buffer += chunk.toString();
      const events = buffer.split("\n\n");

      // Keep incomplete event in buffer
      buffer = events.pop() || "";

      for (const event of events) {
        const lines = event.split("\n");
        let eventType = "";
        let data = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.replace("event: ", "").trim();
          } else if (line.startsWith("data: ")) {
            data = line.replace("data: ", "").trim();
          }
        }

        if (eventType === "content-delta" && data) {
          try {
            const json = JSON.parse(data);
            const token = json?.delta?.message?.content?.text;
            if (token) {
              res.write(`data: ${JSON.stringify({ token })}\n\n`);
            }
          } catch (parseErr) {
            continue;
          }
        } else if (data === "[DONE]") {
          res.write("data: [DONE]\n\n");
          return res.end();
        }
      }
    });
  } else if (provider.name === "Hugging Face") {
    // Hugging Face streaming format
    response.body.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        
        // Hugging Face returns data without data: prefix
        try {
          const json = JSON.parse(line);
          if (json.token && json.token.text) {
            res.write(`data: ${JSON.stringify({ token: json.token.text })}\n\n`);
          } else if (json.generated_text) {
            res.write("data: [DONE]\n\n");
            return res.end();
          }
        } catch (e) {
          // Skip non-JSON lines
          continue;
        }
      }
    });
  } else {
    response.body.on("data", (chunk) => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");

      // Keep the last potentially incomplete line in buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        if (!line.startsWith("data: ")) continue;

        const payload = line.replace("data: ", "").trim();

        if (payload === "[DONE]") {
          res.write("data: [DONE]\n\n");
          return res.end();
        }

        if (payload === "") continue;

        // Only parse if it looks like complete JSON
        if (!payload.startsWith("{") || !payload.endsWith("}")) continue;

        try {
          const json = JSON.parse(payload);
          const token = json?.choices?.[0]?.delta?.content;
          if (token) {
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }
        } catch (parseErr) {
          // Skip invalid JSON chunks
          continue;
        }
      }
    });
  }

  response.body.on("end", () => res.end());
  response.body.on("error", (err) => {
    console.error("Stream error:", err);
    res.end();
  });
}

router.post("/", async (req, res) => {
  const { message, model } = req.body;

  if (!message || !model) {
    return res.status(400).json({ error: "Missing message or model" });
  }

  if (
    typeof message !== "string" ||
    message.trim().length === 0 ||
    typeof model !== "string"
  ) {
    return res.status(400).json({ error: "Invalid message or model format" });
  }

  // Determine which provider to use
  const provider = getProviderFromModel(model);

  if (!provider.enabled) {
    return res.status(400).json({
      error: `Provider ${provider.name} is not configured. Please set the ${
        provider.apiKey ? provider.apiKey.replace("_API_KEY", "") : "API"
      }_API_KEY environment variable.`,
    });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    // Build the request URL
    const chatUrl =
      typeof provider.chatUrl === "function"
        ? provider.chatUrl(model)
        : provider.chatUrl;

    const url = `${provider.baseUrl}${chatUrl}`;
    const headers = {
      "Content-Type": "application/json",
      ...provider.headers,
    };

    // Set authorization based on provider
    if (provider.name === "Google AI") {
      url += `?key=${provider.apiKey}`;
    } else if (provider.name === "Anthropic") {
      headers["x-api-key"] = provider.apiKey;
    } else {
      headers["Authorization"] = `Bearer ${provider.apiKey}`;
    }

    const requestBody = provider.formatMessage(message, model);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${provider.name} API error:`, response.status, errorText);
      
      // Check for quota exceeded errors (429) or insufficient quota errors
      const isQuotaError = response.status === 429 || 
        errorText.toLowerCase().includes("quota") ||
        errorText.toLowerCase().includes("insufficient") ||
        errorText.toLowerCase().includes("rate limit");
      
      if (isQuotaError) {
        markModelQuotaExceeded(model);
        // Also add to permanent failed models cache
        addFailedModel(model);
        console.log(`Marked model ${model} as quota exceeded and added to failed cache`);
      } else {
        // Add to permanent failed models cache for non-quota errors
        addFailedModel(model);
        console.log(`Added model ${model} to failed models cache`);
      }
      
      let errorDetails = `${provider.name} API request failed (Status: ${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error && errorJson.error.message) {
          errorDetails += `: ${errorJson.error.message}`;
        } else if (errorJson.message) {
          errorDetails += `: ${errorJson.message}`;
        }
      } catch {
        // If not JSON, include text if short
        if (errorText.length < 200) {
          errorDetails += `: ${errorText}`;
        }
      }
      res.write(`data: ${JSON.stringify({ error: errorDetails })}\n\n`);
      return res.end();
    }

    // Mark model as working on successful response
    markModelWorking(model);
    
    handleStreamingResponse(provider, response, res);
  } catch (err) {
    console.error("Chat error:", err);
    res.write(
      `data: ${JSON.stringify({ error: "Internal server error" })}\n\n`
    );
    res.end();
  }
});

export default router;

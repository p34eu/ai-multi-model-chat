import express from "express";
import fetch from "node-fetch";

const router = express.Router();

// Provider configurations (same as in models.js)
const PROVIDERS = {
  groq: {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    modelsUrl: "/models",
    chatUrl: "/chat/completions",
    get apiKey() { return process.env.GROQ_API_KEY; },
    get enabled() { return !!process.env.GROQ_API_KEY; },
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
    get apiKey() { return process.env.OPENAI_API_KEY; },
    get enabled() { return !!process.env.OPENAI_API_KEY; },
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
    get apiKey() { return process.env.ANTHROPIC_API_KEY; },
    get enabled() { return !!process.env.ANTHROPIC_API_KEY; },
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
    get apiKey() { return process.env.GOOGLE_API_KEY; },
    get enabled() { return !!process.env.GOOGLE_API_KEY; },
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
  },
  mistral: {
    name: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    modelsUrl: "/models",
    chatUrl: "/chat/completions",
    get apiKey() { return process.env.MISTRAL_API_KEY; },
    get enabled() { return !!process.env.MISTRAL_API_KEY; },
    modelPrefix: "mistral-",
    formatMessage: (message, model) => ({
      model: model.replace("mistral-", ""),
      stream: true,
      temperature: 0.8,
      top_p: 0.9,
      messages: [{ role: "user", content: message.trim() }]
    })
  },
  cohere: {
    name: "Cohere",
    baseUrl: "https://api.cohere.com/v1",
    modelsUrl: "/models",
    chatUrl: "/chat",
    get apiKey() { return process.env.COHERE_API_KEY; },
    get enabled() { return !!process.env.COHERE_API_KEY; },
    modelPrefix: "cohere-",
    formatMessage: (message, model) => ({
      model: model.replace("cohere-", ""),
      message: message.trim(),
      temperature: 0.8,
      stream: true
    })
  }
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
    response.body.on("data", chunk => {
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
          if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
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
    response.body.on("data", chunk => {
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
            res.write(`data: ${JSON.stringify({ token: json.delta.text })}\n\n`);
          }
        } catch (parseErr) {
          continue;
        }
      }
    });
  } else {
    // Handle OpenAI-compatible streaming (Groq, OpenAI)
    response.body.on("data", chunk => {
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

  if (typeof message !== "string" || message.trim().length === 0 || typeof model !== "string") {
    return res.status(400).json({ error: "Invalid message or model format" });
  }

  // Determine which provider to use
  const provider = getProviderFromModel(model);

  if (!provider.enabled) {
    return res.status(400).json({
      error: `Provider ${provider.name} is not configured. Please set the ${provider.apiKey ? provider.apiKey.replace('_API_KEY', '') : 'API'}_API_KEY environment variable.`
    });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    // Build the request URL
    const chatUrl = typeof provider.chatUrl === "function"
      ? provider.chatUrl(model)
      : provider.chatUrl;

    const url = `${provider.baseUrl}${chatUrl}`;
    const headers = {
      "Content-Type": "application/json",
      ...provider.headers
    };

    // Set authorization based on provider
    if (provider.name === "Google AI") {
      url += `?key=${provider.apiKey}`;
    } else {
      headers["Authorization"] = `Bearer ${provider.apiKey}`;
    }

    const requestBody = provider.formatMessage(message, model);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`${provider.name} API error:`, response.status, errorText);
      res.write(`data: ${JSON.stringify({ error: `${provider.name} API request failed` })}\n\n`);
      return res.end();
    }

    handleStreamingResponse(provider, response, res);

  } catch (err) {
    console.error("Chat error:", err);
    res.write(`data: ${JSON.stringify({ error: "Internal server error" })}\n\n`);
    res.end();
  }
});

export default router;

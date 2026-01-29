/**
 * Server-side model status cache
 * Stores information about model availability (quota errors, free/paid status)
 * This is shared across all clients
 */

// In-memory cache for model status
const modelStatusCache = new Map();

// Cache duration: 1 hour for quota errors, 24 hours for free/paid status
const QUOTA_ERROR_TTL = 60 * 60 * 1000; // 1 hour
const STATUS_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Known free models per provider
const freeModels = {
  groq: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "llama-3.3-70b-specdec"],
  openrouter: ["anthropic/claude-3-haiku", "google/gemini-1.5-flash", "mistral/mistral-7b-instruct", "meta-llama/llama-3.1-8b-instruct"],
  huggingface: ["Mistral-7B-Instruct-v0.1", "zephyr-7b-beta", "Phi-3-mini-4k-instruct"],
  deepseek: ["deepseek-chat"],
};

/**
 * Initialize model status cache from environment
 */
export function initModelStatusCache() {
  // Load cached status from environment if available (optional persistence)
  const cachedStatus = process.env.MODEL_STATUS_CACHE;
  if (cachedStatus) {
    try {
      const parsed = JSON.parse(cachedStatus);
      for (const [key, value] of Object.entries(parsed)) {
        modelStatusCache.set(key, {
          ...value,
          timestamp: new Date(value.timestamp),
        });
      }
    } catch (e) {
      console.warn("Failed to parse MODEL_STATUS_CACHE:", e.message);
    }
  }
}

/**
 * Check if a model is known to be free
 */
export function isKnownFreeModel(modelId) {
  const lowerId = modelId.toLowerCase();
  
  for (const [provider, models] of Object.entries(freeModels)) {
    for (const model of models) {
      if (lowerId.includes(model.toLowerCase()) || lowerId.includes(provider)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Mark a model as having exceeded quota
 */
export function markModelQuotaExceeded(modelId) {
  modelStatusCache.set(`quota:${modelId}`, {
    status: "quota_exceeded",
    timestamp: new Date(),
    ttl: QUOTA_ERROR_TTL,
  });
}

/**
 * Mark a model as paid (not free)
 */
export function markModelPaid(modelId) {
  modelStatusCache.set(`paid:${modelId}`, {
    status: "paid",
    timestamp: new Date(),
    ttl: STATUS_TTL,
  });
}

/**
 * Mark a model as successfully used
 */
export function markModelWorking(modelId) {
  modelStatusCache.set(`working:${modelId}`, {
    status: "working",
    timestamp: new Date(),
    ttl: STATUS_TTL,
  });
}

/**
 * Check if a model has quota exceeded
 */
export function hasQuotaExceeded(modelId) {
  const entry = modelStatusCache.get(`quota:${modelId}`);
  if (!entry) return false;
  
  const age = Date.now() - entry.timestamp.getTime();
  if (age > entry.ttl) {
    modelStatusCache.delete(`quota:${modelId}`);
    return false;
  }
  
  return true;
}

/**
 * Check if a model is marked as paid
 */
export function isPaidModel(modelId) {
  const entry = modelStatusCache.get(`paid:${modelId}`);
  if (!entry) return false;
  
  const age = Date.now() - entry.timestamp.getTime();
  if (age > entry.ttl) {
    modelStatusCache.delete(`paid:${modelId}`);
    return false;
  }
  
  return true;
}

/**
 * Get status of a specific model
 */
export function getModelStatus(modelId) {
  if (hasQuotaExceeded(modelId)) {
    return { status: "quota_exceeded" };
  }
  if (isPaidModel(modelId)) {
    return { status: "paid" };
  }
  if (isKnownFreeModel(modelId)) {
    return { status: "free" };
  }
  return { status: "unknown" };
}

/**
 * Get all cached model statuses
 */
export function getAllModelStatuses() {
  const statuses = {};
  
  for (const [key, value] of modelStatusCache.entries()) {
    const age = Date.now() - value.timestamp.getTime();
    if (age > value.ttl) {
      modelStatusCache.delete(key);
      continue;
    }
    
    const modelId = key.split(":")[1];
    statuses[modelId] = {
      status: value.status,
      timestamp: value.timestamp.toISOString(),
    };
  }
  
  return statuses;
}

/**
 * Clear all model statuses
 */
export function clearAllModelStatuses() {
  modelStatusCache.clear();
  console.log("Model status cache cleared");
}

/**
 * Get list of filtered models (exclude quota exceeded and paid)
 */
export function getFilteredModels(models) {
  return models.filter((model) => {
    const status = getModelStatus(model.id || model);
    return status.status !== "quota_exceeded" && status.status !== "paid";
  });
}

/**
 * Persist cache to environment variable (for restart recovery)
 */
export function persistCache() {
  const statuses = {};
  for (const [key, value] of modelStatusCache.entries()) {
    statuses[key] = {
      status: value.status,
      timestamp: value.timestamp.toISOString(),
      ttl: value.ttl,
    };
  }
  return JSON.stringify(statuses);
}

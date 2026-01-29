/**
 * Server-side permanent failed models cache
 * Stores failed models in a JSON file that persists across server restarts
 * Models are only removed manually via API endpoint
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the failed models cache file
const FAILED_MODELS_FILE = path.join(__dirname, "..", "data", "failed-models.json");

// In-memory cache for failed models (map id -> { id, errorType, timestamp })
const failedModelsCache = new Map();

/**
 * Initialize failed models cache from file
 */
export function initFailedModelsCache() {
  console.log(`Failed models cache file path: ${FAILED_MODELS_FILE}`);
  // Ensure data directory exists
  const dataDir = path.dirname(FAILED_MODELS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Load failed models from file if it exists
  if (fs.existsSync(FAILED_MODELS_FILE)) {
    try {
      const data = fs.readFileSync(FAILED_MODELS_FILE, "utf-8");
      const parsed = JSON.parse(data);

      // Support both old format (array of strings) and new format (array of objects)
      const list = Array.isArray(parsed) ? parsed : [];
      list.forEach((entry) => {
        if (typeof entry === "string") {
          // migrate: string -> object
          failedModelsCache.set(entry, {
            id: entry,
            errorType: "unknown",
            timestamp: new Date().toISOString(),
          });
        } else if (entry && entry.id) {
          failedModelsCache.set(entry.id, {
            id: entry.id,
            errorType: entry.errorType || "unknown",
            timestamp: entry.timestamp || new Date().toISOString(),
          });
        }
      });

      console.log(`Loaded ${failedModelsCache.size} failed models from cache`);
    } catch (error) {
      console.warn("Failed to load failed models cache:", error.message);
    }
  }
}

/**
 * Add a model to the failed models cache (permanent until manually removed)
 * @param {string} modelId
 * @param {string} errorType
 */
export function addFailedModel(modelId, errorType = "unknown") {
  if (!modelId) return false;

  failedModelsCache.set(modelId, {
    id: modelId,
    errorType: errorType || "unknown",
    timestamp: new Date().toISOString(),
  });

  persistFailedModels();
  console.log(`Added ${modelId} to failed models cache (${errorType})`);
  return true;
}

/**
 * Remove a model from the failed models cache
 */
export function removeFailedModel(modelId) {
  if (!modelId) return false;

  const removed = failedModelsCache.delete(modelId);
  if (removed) {
    persistFailedModels();
    console.log(`Removed ${modelId} from failed models cache`);
  }
  return removed;
}

/**
 * Check if a model is in the failed cache
 */
export function isFailedModel(modelId) {
  return failedModelsCache.has(modelId);
}

/**
 * Get all failed models
 */
export function getFailedModels() {
  // Return as an array of objects
  return Array.from(failedModelsCache.values());
}

/**
 * Check if a model should be filtered out (failed model)
 */
export function filterFailedModels(models) {
  if (failedModelsCache.size === 0) return models;

  return models.filter((model) => {
    const id = model.id || model;
    return !failedModelsCache.has(id);
  });
}

/**
 * Persist failed models to file
 */
function persistFailedModels() {
  try {
    const dataDir = path.dirname(FAILED_MODELS_FILE);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    const data = JSON.stringify(Array.from(failedModelsCache.values()), null, 2);
    fs.writeFileSync(FAILED_MODELS_FILE, data, "utf-8");
  } catch (error) {
    console.error("Failed to persist failed models cache:", error.message);
  }
}

/**
 * Clear all failed models (admin function)
 */
export function clearFailedModels() {
  failedModelsCache.clear();

  // Delete the cache file
  try {
    if (fs.existsSync(FAILED_MODELS_FILE)) {
      fs.unlinkSync(FAILED_MODELS_FILE);
    }
  } catch (error) {
    console.error("Failed to delete failed models cache file:", error.message);
  }

  console.log("Cleared all failed models");
}

export default {
  initFailedModelsCache,
  addFailedModel,
  removeFailedModel,
  isFailedModel,
  getFailedModels,
  filterFailedModels,
  clearFailedModels,
};

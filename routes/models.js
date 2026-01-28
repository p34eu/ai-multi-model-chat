import express from "express";
import fetch from "node-fetch";

const router = express.Router();

let cachedModels = null;
let cacheTime = 0;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

router.get("/", async (req, res) => {
  const now = Date.now();
  if (cachedModels && (now - cacheTime) < CACHE_DURATION) {
    return res.json({ models: cachedModels });
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      }
    });

    const data = await response.json();

    if (!data || !Array.isArray(data.data)) {
      return res.json({
        models: [],
        error: "Groq API returned invalid structure"
      });
    }

    const validated = data.data
      .map(m => ({
        id: typeof m.id === "string" ? m.id : null,
        created: typeof m.created === "number" ? m.created : null,
        owner: typeof m.owned_by === "string" ? m.owned_by : "unknown"
      }))
      .filter(m => m.id)
      .sort((a, b) => a.id.localeCompare(b.id));

    if (validated.length === 0) {
      return res.json({
        models: [],
        warning: "No usable models returned by Groq"
      });
    }

    cachedModels = validated;
    cacheTime = now;

    res.json({ models: validated });

  } catch (err) {
    console.error("Error fetching models:", err);
    res.json({
      models: [],
      error: "Failed to fetch models from Groq"
    });
  }
});

export default router;

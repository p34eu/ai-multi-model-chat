import express from "express";
import compression from "compression";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import modelsRoute from "./src/routes/models.js";
import chatRoute from "./src/routes/chat.js";

const app = express();

const fallbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});

// Compress responses to reduce transfer size (gzip). Place this before static middleware.
app.use(compression({ level: 6 }));

app.use(express.json());

app.use("/api/models", modelsRoute);
app.use("/api/chat", chatRoute);

app.use(express.static(path.join(__dirname, "public")));

// SPA fallback - serve index.html for all non-API routes
app.use(fallbackLimiter, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Prefer the standard PORT environment variable (from .env) but fall back to NODE_PORT
// and a hardcoded default to remain compatible with different deployment setups.
const PORT = process.env.PORT || process.env.NODE_PORT || 3003;
app.listen(PORT, () => {
  console.log(`AI server running on port ${PORT}`);
});

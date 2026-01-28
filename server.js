import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import modelsRoute from "./src/routes/models.js";
import chatRoute from "./src/routes/chat.js";

const app = express();

app.use(express.json());

app.use("/api/models", modelsRoute);
app.use("/api/chat", chatRoute);

app.use(express.static(path.join(__dirname, "public")));

// SPA fallback - serve index.html for all non-API routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Prefer the standard PORT environment variable (from .env) but fall back to NODE_PORT
// and a hardcoded default to remain compatible with different deployment setups.
const PORT = process.env.PORT || process.env.NODE_PORT || 3003;
app.listen(PORT, () => {
  console.log(`AI server running on port ${PORT}`);
});

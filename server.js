import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.json());

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

import modelsRoute from "./src/routes/models.js";
import chatRoute from "./src/routes/chat.js";

app.use("/models", modelsRoute);
app.use("/chat", chatRoute);

const PORT = process.env.NODE_PORT || 3003;
app.listen(PORT, () => {
  console.log(`AI server running on port ${PORT}`);
});

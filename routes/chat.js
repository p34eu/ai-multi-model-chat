import express from "express";
import fetch from "node-fetch";

const router = express.Router();

router.post("/", async (req, res) => {
  const { message, model } = req.body;

  if (!message || !model) {
    return res.status(400).json({ error: "Missing message or model" });
  }

  if (typeof message !== "string" || message.trim().length === 0 || typeof model !== "string") {
    return res.status(400).json({ error: "Invalid message or model format" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        stream: true,
        temperature: 0.8,
        top_p: 0.9,
        messages: [
          { role: "user", content: message.trim() }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Groq API error:", response.status, errorText);
      res.write(`data: ${JSON.stringify({ error: "API request failed" })}\n\n`);
      return res.end();
    }

    let buffer = "";

    response.body.on("data", chunk => {
      buffer += chunk.toString();
      const lines = buffer.split("\n");

      // Keep the last incomplete line in buffer
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
          const token = json?.choices?.[0]?.delta?.content;
          if (token) {
            res.write(`data: ${JSON.stringify({ token })}\n\n`);
          }
        } catch (parseErr) {
          console.error("JSON parse error:", parseErr, "Payload:", payload);
          continue;
        }
      }
    });

    response.body.on("end", () => res.end());
    response.body.on("error", (err) => {
      console.error("Stream error:", err);
      res.end();
    });

  } catch (err) {
    console.error("Chat error:", err);
    res.write(`data: ${JSON.stringify({ error: "Internal server error" })}\n\n`);
    res.end();
  }
});

export default router;

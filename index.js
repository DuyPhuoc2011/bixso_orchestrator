import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { createChatAgent, createRecommendationAgent } from './agent.js';

// Check for .env file
if (!fs.existsSync('.env')) {
  console.warn('\x1b[33m%s\x1b[0m', 'WARNING: .env file is missing. Ensure you have set your environment variables.');
}

dotenv.config();

// Check for required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.error('\x1b[31m%s\x1b[0m', 'ERROR: OPENAI_API_KEY is missing in .env file. Agent will not work.');
}

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

let chatAgent;
let recommendationAgent;

// Initialize agents
Promise.all([
  createChatAgent(),
  createRecommendationAgent()
]).then(([cAgent, rAgent]) => {
  chatAgent = cAgent;
  recommendationAgent = rAgent;
  console.log("Agents initialized");
});

app.get('/', (req, res) => {
  res.json({ message: "Bixso Orchestrator (Node.js) is running" });
});

app.post('/chat', async (req, res) => {
  const { user_id, message, chat_history } = req.body;

  if (!chatAgent) {
    return res.status(503).json({ error: "Chat Agent is still initializing" });
  }

  try {
    const result = await chatAgent.invoke({
      input: message,
      userId: user_id,
      chat_history: chat_history || [],
    });

    res.json({ response: result.output });
  } catch (error) {
    console.error("Chat Agent Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/recommendation', async (req, res) => {
  const { user_id, message, chat_history } = req.body;

  if (!recommendationAgent) {
    return res.status(503).json({ error: "Recommendation Agent is still initializing" });
  }

  try {
    const result = await recommendationAgent.invoke({
      input: message || "Recommend some articles for me",
      userId: user_id,
      chat_history: chat_history || [],
    });

    let finalResponse = result.output;
    
    // Try to parse as JSON if it's a string that looks like a JSON array
    try {
      if (typeof finalResponse === 'string' && finalResponse.trim().startsWith('[')) {
        finalResponse = JSON.parse(finalResponse.trim());
      }
    } catch (e) {
      console.warn("Could not parse agent output as JSON, returning as string");
    }

    res.json({ response: finalResponse });
  } catch (error) {
    console.error("Recommendation Agent Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});


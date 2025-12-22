import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { createOrchestratorAgent } from './agent.js';

// Check for .env file
if (!fs.existsSync('.env')) {
  console.warn('\x1b[33m%s\x1b[0m', 'WARNING: .env file is missing. Ensure you have set your environment variables.');
}

dotenv.config();

// Check for required environment variables
if (!process.env.GOOGLE_API_KEY) {
  console.error('\x1b[31m%s\x1b[0m', 'ERROR: GOOGLE_API_KEY is missing in .env file. Agent will not work.');
}

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

let orchestratorAgent;

// Initialize agent
createOrchestratorAgent().then(agent => {
  orchestratorAgent = agent;
  console.log("Orchestrator Agent initialized");
});

app.get('/', (req, res) => {
  res.json({ message: "Bixso Orchestrator (Node.js) is running" });
});

app.post('/chat', async (req, res) => {
  const { user_id, message, chat_history } = req.body;

  if (!orchestratorAgent) {
    return res.status(503).json({ error: "Agent is still initializing" });
  }

  try {
    const result = await orchestratorAgent.invoke({
      input: message,
      userId: user_id,
      chat_history: chat_history || [],
    });

    res.json({ response: result.output });
  } catch (error) {
    console.error("Agent Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});


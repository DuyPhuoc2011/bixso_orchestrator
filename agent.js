import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { firestoreClient } from "./database.js";
import { z } from "zod";

const getUserProfileTool = new DynamicStructuredTool({
  name: "get_user_profile",
  description: "Fetch the user's profile and personalization preferences from Firestore.",
  schema: z.object({
    userId: z.string().describe("The unique ID of the user"),
  }),
  func: async ({ userId }) => {
    const profile = await firestoreClient.getUser(userId);
    return JSON.stringify(profile);
  },
});

const suggestArticlesTool = new DynamicStructuredTool({
  name: "suggest_articles",
  description: "Search for articles based on a list of user interests or keywords.",
  schema: z.object({
    interests: z.array(z.string()).describe("List of interests to search for"),
  }),
  func: async ({ interests }) => {
    const results = [];
    for (const interest of interests) {
      const articles = await firestoreClient.searchArticlesByInterest(interest);
      results.push(...articles);
    }
    // Deduplicate
    const unique = Array.from(new Map(results.map(item => [item.id, item])).values());
    return JSON.stringify(unique.slice(0, 5));
  },
});

const listRecentArticlesTool = new DynamicStructuredTool({
  name: "list_recent_articles",
  description: "Get a list of the most recent articles available.",
  schema: z.object({}),
  func: async () => {
    const articles = await firestoreClient.getArticles(10);
    return JSON.stringify(articles);
  },
});

const tools = [getUserProfileTool, suggestArticlesTool, listRecentArticlesTool];

export async function createOrchestratorAgent() {
  const llm = new ChatGoogleGenerativeAI({
    modelName: "gemini-1.5-flash",
    temperature: 0,
    apiKey: process.env.GOOGLE_API_KEY,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", "You are the Bixso Orchestrator. Your workflow is:\n" +
               "1. Use 'get_user_profile' with the provided 'userId' to understand the user's interests.\n" +
               "2. Based on their profile, use 'suggest_articles' to find relevant content.\n" +
               "3. If the user has no specific interests, use 'list_recent_articles'.\n" +
               "4. Present the suggestions in a helpful, personalized way."],
    new MessagesPlaceholder("chat_history"),
    ["human", "User ID: {userId}\n\nRequest: {input}"],
    new MessagesPlaceholder("agent_scratchpad"),
  ]);

  const agent = await createToolCallingAgent({
    llm,
    tools,
    prompt,
  });

  return new AgentExecutor({
    agent,
    tools,
  });
}


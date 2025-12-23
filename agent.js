import { ChatOpenAI } from "@langchain/openai";
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

const CHAT_SYSTEM_PROMPT = "You are the Bixso Orchestrator, a friendly and professional AI assistant. " +
                           "Your goal is to help users by providing information and recommendations in a warm, conversational manner.\n\n" +
                           "Guidelines for your response:\n" +
                           "1. **Tone**: Be helpful, natural, and engaging. Avoid overly formal or robotic lists.\n" +
                           "2. **Content**: When presenting user information, summarize it gracefully in a single, smooth paragraph.\n" +
                           "3. **No Newlines**: Do NOT use newline characters (\\n) or line breaks in your response. Keep the entire response as a single, continuous flow of text.\n" +
                           "4. **Cleanliness**: Do not show raw URLs, image paths, or technical metadata.\n" +
                           "5. **Personalization**: Use the user's name if available to make the conversation feel personal.";

const RECOMMENDATION_SYSTEM_PROMPT = "You are the Bixso Recommendation Engine. Your workflow is:\n" +
                                     "1. Use 'get_user_profile' with the provided 'userId' to understand the user's interests.\n" +
                                     "2. Based on their profile, use 'suggest_articles' to find relevant content.\n" +
                                     "3. If the user has no specific interests, use 'list_recent_articles'.\n" +
                                     "CRITICAL: Your final response MUST be ONLY a JSON array of article unique IDs. " +
                                     "Do not include any conversational text. " +
                                     "Example output: [\"article_id_1\", \"article_id_2\"]";

async function createAgent(systemPrompt, temperature = 0) {
  const llm = new ChatOpenAI({
    modelName: "gpt-4o-mini",
    temperature: temperature,
    apiKey: process.env.OPENAI_API_KEY,
  });

  const prompt = ChatPromptTemplate.fromMessages([
    ["system", systemPrompt],
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

export async function createChatAgent() {
  return createAgent(CHAT_SYSTEM_PROMPT, 0.7);
}

export async function createRecommendationAgent() {
  return createAgent(RECOMMENDATION_SYSTEM_PROMPT);
}


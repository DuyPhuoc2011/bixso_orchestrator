from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.agents import AgentExecutor, create_openai_functions_agent
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.tools import tool
from database import firestore_client

@tool
def get_user_profile(user_id: str):
    """Fetch the user's profile and personalization preferences from Firestore."""
    return firestore_client.get_user(user_id)

@tool
def suggest_articles(interests: list):
    """Search for articles based on a list of user interests or keywords."""
    results = []
    for interest in interests:
        results.extend(firestore_client.search_articles_by_interest(interest))
    # Deduplicate by ID
    unique_results = {res['id']: res for res in results}.values()
    return list(unique_results)[:5]

@tool
def list_recent_articles():
    """Get a list of the most recent articles available."""
    return firestore_client.get_articles(limit=10)

tools = [get_user_profile, suggest_articles, list_recent_articles]

def create_orchestrator_agent():
    # Use Gemini model
    llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=0)
    
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are the Bixso Orchestrator. Your workflow is:\n"
                   "1. Use 'get_user_profile' with the provided 'user_id' to understand the user's interests.\n"
                   "2. Based on their profile (e.g., interests, past reads, or preferences), use 'suggest_articles' to find relevant content.\n"
                   "3. If the user has no specific interests, use 'list_recent_articles'.\n"
                   "4. Present the suggestions in a helpful, personalized way."),
        MessagesPlaceholder(variable_name="chat_history"),
        ("human", "User ID: {user_id}\n\nRequest: {input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    # Note: Gemini supports function calling, which works with create_openai_functions_agent
    # or create_tool_calling_agent. Langchain recommends create_tool_calling_agent for newer models.
    from langchain.agents import create_tool_calling_agent
    agent = create_tool_calling_agent(llm, tools, prompt)
    agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True)
    
    return agent_executor

orchestrator_agent = create_orchestrator_agent()


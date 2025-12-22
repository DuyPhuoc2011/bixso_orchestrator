# Bixso Orchestrator Agent

This is a Langchain-powered orchestrator agent designed to integrate with a Bubble frontend and a Firestore database on GCP.

## Prerequisites

- Python 3.9+
- A Google Cloud Platform (GCP) project with Firestore enabled.
- An OpenAI API Key.

## Setup

1.  **Clone the repository**:
    ```bash
    git clone <repo-url>
    cd bixso_orchestrator
    ```

2.  **Install dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

3.  **Authentication Files**:
    - **Google AI API Key**: Create a `.env` file and add `GOOGLE_API_KEY=your_gemini_api_key_here`.
    - **GCP Service Account**: Save your Firestore service account JSON file as `service-account.json` in the root directory.

## How it Works

1.  **User Lookup**: When a request comes from Bubble, the agent uses the `user_id` to fetch the user's profile from the `users` collection in Firestore.
2.  **Personalization**: The agent analyzes the user's interests (e.g., tags, preferences) stored in their profile.
3.  **Content Matching**: The agent then searches the `articles` collection for content that matches those interests.
4.  **Response**: The agent returns a personalized suggestion to the Bubble frontend.

## Database Schema Assumptions

- **`users` collection**: Documents should be named by `user_id` and contain a field like `interests` (an array of strings).
- **`articles` collection**: Documents should contain a field like `tags` (an array of strings) that matching can be performed against.

## Running the Application

Start the FastAPI server:
```bash
python main.py
```
The server will be running at `http://localhost:8000`.

## Bubble.io Integration

Use the Bubble API Connector to call the `/chat` endpoint.

- **Endpoint**: `POST https://your-deployed-url/chat`
- **Body JSON**:
  ```json
  {
    "user_id": "unique_user_id",
    "message": "The user's question",
    "chat_history": []
  }
  ```

## Project Structure

- `main.py`: FastAPI server and API endpoints.
- `agent.py`: Langchain agent configuration and tools.
- `database.py`: Firestore client and database operations.
- `requirements.txt`: Python dependencies.


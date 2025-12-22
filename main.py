import os
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from dotenv import load_dotenv
from agent import orchestrator_agent

load_dotenv()

app = FastAPI()

class ChatRequest(BaseModel):
    user_id: str
    message: str
    chat_history: Optional[List[dict]] = []

@app.get("/")
async def root():
    return {"message": "Bixso Orchestrator is running"}

@app.post("/chat")
async def chat(request: ChatRequest):
    try:
        # Pass both input and user_id to the agent
        response = orchestrator_agent.invoke({
            "input": request.message,
            "user_id": request.user_id,
            "chat_history": request.chat_history or []
        })
        return {"response": response["output"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


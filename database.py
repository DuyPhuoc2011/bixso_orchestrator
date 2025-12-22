import os
from google.cloud import firestore
from dotenv import load_dotenv

load_dotenv()

class FirestoreClient:
    def __init__(self):
        # Explicitly look for service-account.json in the root if not set in env
        service_account_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "service-account.json")
        
        if os.path.exists(service_account_path):
            self.db = firestore.Client.from_service_account_json(service_account_path)
        else:
            # Fallback to default (useful for Cloud Run/Functions deployment)
            self.db = firestore.Client()

    def get_user(self, user_id: str):
        doc_ref = self.db.collection("users").document(user_id)
        doc = doc_ref.get()
        if doc.exists:
            return doc.to_dict()
        return None

    def get_articles(self, limit: int = 5):
        docs = self.db.collection("articles").limit(limit).stream()
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]

    def search_articles_by_interest(self, interest: str):
        # Simple search based on tags or category if they exist in your 'articles' collection
        docs = self.db.collection("articles").where("tags", "array_contains", interest).limit(5).stream()
        return [{"id": doc.id, **doc.to_dict()} for doc in docs]

firestore_client = FirestoreClient()


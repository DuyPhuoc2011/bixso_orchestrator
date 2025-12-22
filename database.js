import { Firestore } from '@google-cloud/firestore';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

class FirestoreClient {
    constructor() {
        const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || 'service-account.json';
        
        const config = {};
        if (fs.existsSync(serviceAccountPath)) {
            config.keyFilename = serviceAccountPath;
        } else {
            console.warn('\x1b[33m%s\x1b[0m', `WARNING: Firestore service account file not found at: ${serviceAccountPath}`);
            console.warn('\x1b[33m%s\x1b[0m', 'Please ensure service-account.json exists in the root directory.');
        }

        this.db = new Firestore(config);
    }

    async getUser(userId) {
        const doc = await this.db.collection('users').doc(userId).get();
        return doc.exists ? doc.data() : null;
    }

    async getArticles(limit = 5) {
        const snapshot = await this.db.collection('articles').limit(limit).get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    async searchArticlesByInterest(interest) {
        const snapshot = await this.db.collection('articles')
            .where('tags', 'array-contains', interest)
            .limit(5)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
}

export const firestoreClient = new FirestoreClient();


export interface StoredUploadSession {
  sessionId: string;
  uploadId?: string;
  key?: string;
  communityId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  totalParts: number;
  completedParts: Array<{ partNumber: number; etag: string }>;
  updatedAt: number;
}

const DB_NAME = "studyconnect_uploads_db";
const STORE_NAME = "upload_sessions";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported"));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "sessionId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const uploadSessionStorage = {
  async saveSession(session: StoredUploadSession): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(session);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback if IndexedDB fails
    }
  },

  async getSession(sessionId: string): Promise<StoredUploadSession | null> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(sessionId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  },

  async findMatchingSession(fileName: string, fileSize: number): Promise<StoredUploadSession | null> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onsuccess = () => {
          const sessions: StoredUploadSession[] = req.result || [];
          const now = Date.now();
          const match = sessions.find(
            (s) =>
              s.fileName === fileName &&
              s.fileSize === fileSize &&
              now - s.updatedAt < 86400000
          );
          resolve(match || null);
        };
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  },

  async removeSession(sessionId: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(sessionId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Ignore
    }
  }
};

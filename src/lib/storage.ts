// Safe Storage Utility with IndexedDB fallback for large documents and QuotaExceededError protection

import { Student } from '@/types';

const DB_NAME = 'UppseekersFileStorage';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

// Helper to open IndexedDB
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * File storage for large data URLs, PDFs, and uploaded documents using IndexedDB
 */
export const fileStorage = {
  async saveFile(key: string, dataUrl: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(dataUrl, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Failed to save file to IndexedDB:', err);
    }
  },

  async getFile(key: string): Promise<string | null> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(key);
        req.onsuccess = () => resolve((req.result as string) || null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Failed to get file from IndexedDB:', err);
      return null;
    }
  },

  async deleteFile(key: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn('Failed to delete file from IndexedDB:', err);
    }
  }
};

/**
 * Sanitizes student objects before writing to localStorage
 * Strips huge base64 data URLs (> 200 characters) so that localStorage remains < 50KB
 */
export function sanitizeStudentForLocalStorage(student: Student): Student {
  if (!student) return student;

  const sanitized: Student = {
    ...student,
    documents: (student.documents || []).map(doc => {
      if (doc.fileUrl && doc.fileUrl.startsWith('data:') && doc.fileUrl.length > 200) {
        // Also persist to IndexedDB asynchronously
        if (doc.id) {
          fileStorage.saveFile(`doc_${doc.id}`, doc.fileUrl).catch(() => {});
        }
        return {
          ...doc,
          fileUrl: `idb://doc_${doc.id}`
        };
      }
      return doc;
    }),
    shortlist: (student.shortlist || []).map(uni => {
      if (!uni.attachedDocs) return uni;
      const sanitizedAttached: Record<string, any> = {};
      Object.entries(uni.attachedDocs).forEach(([key, docInfo]) => {
        if (docInfo && typeof docInfo === 'object') {
          const fileUrl = docInfo.fileUrl || '';
          if (fileUrl.startsWith('data:') && fileUrl.length > 200) {
            const docId = docInfo.docId || docInfo.id || `${uni.id}_${key}`;
            fileStorage.saveFile(`attach_${docId}`, fileUrl).catch(() => {});
            sanitizedAttached[key] = {
              ...docInfo,
              fileUrl: `idb://attach_${docId}`
            };
          } else {
            sanitizedAttached[key] = docInfo;
          }
        } else {
          sanitizedAttached[key] = docInfo;
        }
      });
      return {
        ...uni,
        attachedDocs: sanitizedAttached
      };
    }),
    tasks: (student.tasks || []).map(task => {
      let changed = false;
      const attachments = (task.attachments || []).map(att => {
        if (att.fileUrl && att.fileUrl.startsWith('data:') && att.fileUrl.length > 200) {
          fileStorage.saveFile(`task_att_${att.id}`, att.fileUrl).catch(() => {});
          changed = true;
          return {
            ...att,
            fileUrl: `idb://task_att_${att.id}`
          };
        }
        return att;
      });

      let pdfUrl = task.pdfUrl;
      if (pdfUrl && pdfUrl.startsWith('data:') && pdfUrl.length > 200) {
        fileStorage.saveFile(`task_pdf_${task.id}`, pdfUrl).catch(() => {});
        pdfUrl = `idb://task_pdf_${task.id}`;
        changed = true;
      }

      return changed ? { ...task, attachments, pdfUrl } : task;
    })
  };

  return sanitized;
}

export function sanitizeStudentsForLocalStorage(students: Student[]): Student[] {
  if (!Array.isArray(students)) return [];
  return students.map(sanitizeStudentForLocalStorage);
}

/**
 * Safely writes to localStorage without ever throwing QuotaExceededError or crashing React
 */
export function safeLocalStorageSet(key: string, value: any): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  try {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, serialized);
    return true;
  } catch (err: any) {
    console.warn(`[SafeStorage] Failed to set item "${key}" in localStorage:`, err);

    // If quota exceeded, clean up non-essential items and retry
    try {
      // Clear non-critical transient keys
      const keysToClear = ['uppseekers_read_notifications', 'uppseekers_temp_preview'];
      keysToClear.forEach(k => localStorage.removeItem(k));

      // If it's the students array, ensure it's sanitized
      if (key === 'uppseekers_students_v2' && Array.isArray(value)) {
        const sanitized = sanitizeStudentsForLocalStorage(value);
        localStorage.setItem(key, JSON.stringify(sanitized));
        return true;
      }
    } catch (retryErr) {
      console.warn(`[SafeStorage] Retry failed for key "${key}". Gracefully skipping localStorage cache:`, retryErr);
    }
    return false;
  }
}

/**
 * Safely reads and parses JSON from localStorage
 */
export function safeLocalStorageGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[SafeStorage] Failed to read/parse key "${key}" from localStorage:`, err);
    return fallback;
  }
}

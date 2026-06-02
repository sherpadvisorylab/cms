import type { StorageAdapter } from "@sherpacms/infrastructure";
import { getFirestore, Timestamp } from "firebase-admin/firestore";

/**
 * Recursively convert Firestore Timestamp objects to plain JS Date objects
 * so they can be serialised by Next.js Server Components to the client.
 */
function convertTimestamps(obj: unknown): unknown {
  if (obj instanceof Timestamp) return obj.toDate();
  if (obj instanceof Date) return obj;
  if (Array.isArray(obj)) return obj.map(convertTimestamps);
  if (obj !== null && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>).map(([k, v]) => [
        k,
        convertTimestamps(v),
      ]),
    );
  }
  return obj;
}

function fromDoc<T>(id: string, data: FirebaseFirestore.DocumentData): T {
  return convertTimestamps({ id, ...data }) as T;
}

/**
 * Firebase Firestore adapter for the CMS engine.
 * Implements StorageAdapter using the firebase-admin SDK (server-side only).
 */
function getDb(): FirebaseFirestore.Firestore {
  const g = global as typeof global & { __firestoreReady?: boolean };
  const db = getFirestore();
  if (!g.__firestoreReady) {
    db.settings({ ignoreUndefinedProperties: true });
    g.__firestoreReady = true;
  }
  return db;
}

export class FirebaseAdapter implements StorageAdapter {
  private get db() { return getDb(); }

  async getAll<T>(
    collection: string,
    filter?: Partial<Record<string, unknown>>,
  ): Promise<T[]> {
    let query: FirebaseFirestore.Query = this.db.collection(collection);

    if (filter) {
      for (const [key, value] of Object.entries(filter)) {
        if (value !== undefined) {
          query = query.where(key, "==", value);
        }
      }
    }

    const snap = await query.get();
    return snap.docs.map((doc) => fromDoc<T>(doc.id, doc.data()));
  }

  async getById<T>(collection: string, id: string): Promise<T | null> {
    const doc = await this.db.collection(collection).doc(id).get();
    if (!doc.exists) return null;
    return fromDoc<T>(doc.id, doc.data()!);
  }

  async create<T extends { id: string }>(
    collection: string,
    data: T,
  ): Promise<T> {
    const { id, ...rest } = data;
    await this.db.collection(collection).doc(id).set(rest);
    return data;
  }

  async update<T extends { id: string }>(
    collection: string,
    id: string,
    data: Partial<T>,
  ): Promise<T> {
    const ref = this.db.collection(collection).doc(id);
    await ref.update(data as FirebaseFirestore.UpdateData<T>);
    const updated = await ref.get();
    return fromDoc<T>(id, updated.data()!);
  }

  async delete(collection: string, id: string): Promise<void> {
    await this.db.collection(collection).doc(id).delete();
  }
}

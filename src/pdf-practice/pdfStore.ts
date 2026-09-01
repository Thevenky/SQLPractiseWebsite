import { openDB, type IDBPDatabase } from "idb";
import type { PdfPracticeSet } from "./types";

const DB_NAME = "sqlpractice-pdf";
const DB_VERSION = 1;

interface StoredBlob {
  setId: string;
  blob: Blob;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("sets")) {
          db.createObjectStore("sets", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("blobs")) {
          db.createObjectStore("blobs", { keyPath: "setId" });
        }
      },
    });
  }
  return dbPromise;
}

export async function saveSet(set: PdfPracticeSet): Promise<void> {
  const db = await getDb();
  await db.put("sets", set);
}

export async function savePdfBlob(setId: string, blob: Blob): Promise<void> {
  const db = await getDb();
  const entry: StoredBlob = { setId, blob };
  await db.put("blobs", entry);
}

export async function getPdfBlob(setId: string): Promise<Blob | null> {
  const db = await getDb();
  const entry = (await db.get("blobs", setId)) as StoredBlob | undefined;
  return entry?.blob ?? null;
}

export async function listSets(): Promise<PdfPracticeSet[]> {
  const db = await getDb();
  const all = (await db.getAll("sets")) as PdfPracticeSet[];
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getSet(id: string): Promise<PdfPracticeSet | undefined> {
  const db = await getDb();
  return (await db.get("sets", id)) as PdfPracticeSet | undefined;
}

export async function deleteSet(id: string): Promise<void> {
  const db = await getDb();
  await db.delete("sets", id);
  await db.delete("blobs", id);
}

export async function renameSet(id: string, name: string): Promise<void> {
  const set = await getSet(id);
  if (!set) return;
  set.name = name;
  set.updatedAt = Date.now();
  await saveSet(set);
}

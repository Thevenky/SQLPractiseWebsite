import { openDB, type IDBPDatabase } from "idb";
import type { MyDbDatabase, MyDbStore } from "./types";
import { newDatabase } from "./types";

const DB_NAME = "sqlpractice-mydb";
const DB_VERSION = 1;
const ROOT_ID = "root";
// Older builds of this feature stored a single unnamed database under this key — migrated on load.
const LEGACY_ID = "main";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("state")) {
          db.createObjectStore("state", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

export function emptyStore(): MyDbStore {
  return { databases: [], activeDatabaseId: null };
}

interface LegacyState {
  id: string;
  name: string;
  tables: MyDbDatabase["tables"];
  questions: MyDbDatabase["questions"];
}

export async function loadStore(): Promise<MyDbStore> {
  const db = await getDb();
  const record = (await db.get("state", ROOT_ID)) as ({ id: string } & MyDbStore) | undefined;
  if (record) {
    return { databases: record.databases ?? [], activeDatabaseId: record.activeDatabaseId ?? null };
  }

  // Migrate a pre-multi-database record if one exists.
  const legacy = (await db.get("state", LEGACY_ID)) as LegacyState | undefined;
  if (legacy && ((legacy.tables && legacy.tables.length) || (legacy.questions && legacy.questions.length))) {
    const migrated = newDatabase(legacy.name || "My Database");
    migrated.tables = legacy.tables ?? [];
    migrated.questions = (legacy.questions ?? []).map((q) => ({
      // best-effort shape upgrade; missing fields get sane defaults
      ...q,
      title: (q as unknown as { title?: string; text?: string }).title ?? (q as unknown as { text?: string }).text ?? "Untitled question",
      description: (q as unknown as { description?: string; text?: string }).description ?? (q as unknown as { text?: string }).text ?? "",
      explanation: (q as unknown as { explanation?: string }).explanation ?? "",
      correctAttempts: (q as unknown as { correctAttempts?: number }).correctAttempts ?? (q.passed ? q.attempts : 0),
      incorrectAttempts: (q as unknown as { incorrectAttempts?: number }).incorrectAttempts ?? 0,
      hintsUsed: (q as unknown as { hintsUsed?: number }).hintsUsed ?? 0,
      solutionRevealed: (q as unknown as { solutionRevealed?: boolean }).solutionRevealed ?? false,
    }));
    const store: MyDbStore = { databases: [migrated], activeDatabaseId: migrated.id };
    await saveStore(store);
    return store;
  }

  return emptyStore();
}

export async function saveStore(store: MyDbStore): Promise<MyDbStore> {
  const db = await getDb();
  await db.put("state", { id: ROOT_ID, ...store });
  return store;
}

export async function clearStore(): Promise<void> {
  const db = await getDb();
  await db.delete("state", ROOT_ID);
}

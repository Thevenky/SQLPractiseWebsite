import { openDB, type IDBPDatabase } from "idb";
import type { MyDbState } from "./types";

const DB_NAME = "sqlpractice-mydb";
const DB_VERSION = 1;
const STATE_ID = "main";

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

export function emptyState(): MyDbState {
  return { id: STATE_ID, name: "My Database", updatedAt: Date.now(), tables: [], questions: [] };
}

export async function loadState(): Promise<MyDbState> {
  const db = await getDb();
  const state = (await db.get("state", STATE_ID)) as MyDbState | undefined;
  if (!state) return emptyState();
  // defensive defaults for older/partial records
  state.tables = state.tables ?? [];
  state.questions = state.questions ?? [];
  return state;
}

export async function saveState(state: MyDbState): Promise<MyDbState> {
  const db = await getDb();
  const next = { ...state, updatedAt: Date.now() };
  await db.put("state", next);
  return next;
}

export async function clearState(): Promise<void> {
  const db = await getDb();
  await db.delete("state", STATE_ID);
}

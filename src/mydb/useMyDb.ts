import { useCallback, useEffect, useRef, useState } from "react";
import type { MyDbColumn, MyDbDatabase, MyDbQuestion, MyDbStore, MyDbTable } from "./types";
import { newDatabase } from "./types";
import { loadStore, saveStore, clearStore, emptyStore } from "./store";
import { rebuildSchemaFromTables, runMyDbQuery, introspectTables, friendlyError, dropDatabaseCatalog } from "./engine";
import { createTableSql, insertRowsSql, assertValidIdentifier, quoteIdent } from "./sqlBuilder";
import { sampleTables } from "./sampleData";
import type { CsvParseResult } from "./csv";
import { coerceCellForType } from "./csv";

export interface MyDbError {
  message: string;
  technical: string;
}

export interface AttemptOutcome {
  correct: boolean;
  usedHint?: boolean;
  revealedSolution?: boolean;
  solutionSql?: string;
}

function findDb(store: MyDbStore, id: string | null): MyDbDatabase | null {
  if (!id) return null;
  return store.databases.find((d) => d.id === id) ?? null;
}

export function useMyDb() {
  const [store, setStore] = useState<MyDbStore>(emptyStore());
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MyDbError | null>(null);
  const storeRef = useRef(store);
  storeRef.current = store;
  const hydratedDbIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadStore();
      const active = findDb(loaded, loaded.activeDatabaseId) ?? loaded.databases[0] ?? null;
      if (active) {
        await rebuildSchemaFromTables(active.id, active.tables);
        hydratedDbIds.current.add(active.id);
        if (loaded.activeDatabaseId !== active.id) loaded.activeDatabaseId = active.id;
      }
      if (!cancelled) {
        setStore(loaded);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback(async (next: MyDbStore) => {
    const saved = await saveStore(next);
    setStore(saved);
    return saved;
  }, []);

  const activeDatabase = findDb(store, store.activeDatabaseId);

  const ensureHydrated = useCallback(async (dbId: string) => {
    if (hydratedDbIds.current.has(dbId)) return;
    const db = findDb(storeRef.current, dbId);
    if (!db) return;
    await rebuildSchemaFromTables(dbId, db.tables);
    hydratedDbIds.current.add(dbId);
  }, []);

  const withBusy = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      const raw = err instanceof Error ? err.message : String(err);
      const fe = friendlyError(raw);
      setError({ message: fe.message, technical: raw });
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  const updateDb = useCallback(
    async (dbId: string, patch: Partial<MyDbDatabase> | ((d: MyDbDatabase) => Partial<MyDbDatabase>)) => {
      const cur = storeRef.current;
      const next: MyDbStore = {
        ...cur,
        databases: cur.databases.map((d) => (d.id === dbId ? { ...d, ...(typeof patch === "function" ? patch(d) : patch), updatedAt: Date.now() } : d)),
      };
      return persist(next);
    },
    [persist]
  );

  /** Re-read a database's live schema after a mutation and persist the fresh snapshot. */
  const resync = useCallback(
    async (dbId: string) => {
      const tables = await introspectTables(dbId);
      return updateDb(dbId, { tables });
    },
    [updateDb]
  );

  // --- Database (workspace) management -------------------------------------------------

  const createDatabase = useCallback(
    async (name: string) => {
      const db = newDatabase(name.trim() || "My Database");
      await rebuildSchemaFromTables(db.id, []);
      hydratedDbIds.current.add(db.id);
      const cur = storeRef.current;
      const next: MyDbStore = { databases: [...cur.databases, db], activeDatabaseId: db.id };
      await persist(next);
      return db.id;
    },
    [persist]
  );

  const setActiveDatabase = useCallback(
    async (dbId: string) => {
      await ensureHydrated(dbId);
      await persist({ ...storeRef.current, activeDatabaseId: dbId });
    },
    [persist, ensureHydrated]
  );

  const renameDatabase = useCallback(
    async (dbId: string, name: string) => {
      await updateDb(dbId, { name: name.trim() || "Untitled Database" });
    },
    [updateDb]
  );

  const deleteDatabase = useCallback(
    async (dbId: string) => {
      await withBusy(async () => {
        await dropDatabaseCatalog(dbId);
        hydratedDbIds.current.delete(dbId);
        const cur = storeRef.current;
        const remaining = cur.databases.filter((d) => d.id !== dbId);
        const nextActive = cur.activeDatabaseId === dbId ? remaining[0]?.id ?? null : cur.activeDatabaseId;
        if (nextActive) await ensureHydrated(nextActive);
        await persist({ databases: remaining, activeDatabaseId: nextActive });
      });
    },
    [withBusy, persist, ensureHydrated]
  );

  // --- Schema / data mutations (act on the active database) ----------------------------

  const requireActiveId = useCallback((): string => {
    const id = storeRef.current.activeDatabaseId;
    if (!id) throw new Error("No active database. Create one first.");
    return id;
  }, []);

  const runSql = useCallback(
    async (sql: string, dbIdOverride?: string) => {
      const dbId = dbIdOverride ?? requireActiveId();
      await ensureHydrated(dbId);
      const result = await runMyDbQuery(dbId, sql);
      // Any statement could have mutated schema/data — resync in the background so the
      // dashboard/schema explorer stay accurate, without blocking the caller on the result.
      resync(dbId).catch(() => {});
      return result;
    },
    [resync, requireActiveId, ensureHydrated]
  );

  const createTable = useCallback(
    async (name: string, columns: MyDbColumn[]) => {
      const dbId = requireActiveId();
      await withBusy(async () => {
        assertValidIdentifier(name);
        const sql = createTableSql({ name, columns, rows: [] });
        await runMyDbQuery(dbId, sql);
        await resync(dbId);
      });
    },
    [withBusy, resync, requireActiveId]
  );

  const dropTable = useCallback(
    async (name: string) => {
      const dbId = requireActiveId();
      await withBusy(async () => {
        assertValidIdentifier(name);
        await runMyDbQuery(dbId, `DROP TABLE IF EXISTS ${quoteIdent(name)};`);
        await resync(dbId);
      });
    },
    [withBusy, resync, requireActiveId]
  );

  const importCsvAsTable = useCallback(
    async (tableName: string, csv: CsvParseResult, columns: MyDbColumn[]) => {
      const dbId = requireActiveId();
      await withBusy(async () => {
        assertValidIdentifier(tableName);
        const rows = csv.rows.map((r) => {
          const out: Record<string, unknown> = {};
          columns.forEach((c) => {
            out[c.name] = coerceCellForType(r[c.name] ?? "", c.type);
          });
          return out;
        });
        const table: MyDbTable = { name: tableName, columns, rows };
        const ddl = createTableSql(table);
        const dml = insertRowsSql(table);
        await runMyDbQuery(dbId, ddl);
        if (dml) await runMyDbQuery(dbId, dml);
        await resync(dbId);
      });
    },
    [withBusy, resync, requireActiveId]
  );

  const importSql = useCallback(
    async (sql: string) => {
      const dbId = requireActiveId();
      let result: { tablesBefore: number; tablesAfter: number };
      await withBusy(async () => {
        const before = (await introspectTables(dbId)).length;
        await runMyDbQuery(dbId, sql);
        const after = await resync(dbId);
        const db = findDb(after, dbId);
        result = { tablesBefore: before, tablesAfter: db?.tables.length ?? before };
      });
      return result!;
    },
    [withBusy, resync, requireActiveId]
  );

  const addRow = useCallback(
    async (tableName: string, row: Record<string, unknown>) => {
      const dbId = requireActiveId();
      await withBusy(async () => {
        const db = findDb(storeRef.current, dbId);
        const table = db?.tables.find((t) => t.name === tableName);
        if (!table) throw new Error(`Table "${tableName}" not found`);
        const sql = insertRowsSql(table, [row]);
        if (sql) await runMyDbQuery(dbId, sql);
        await resync(dbId);
      });
    },
    [withBusy, resync, requireActiveId]
  );

  const updateRow = useCallback(
    async (tableName: string, pkCol: string, pkValue: unknown, patch: Record<string, unknown>) => {
      const dbId = requireActiveId();
      await withBusy(async () => {
        const setSql = Object.entries(patch)
          .map(([k, v]) => `${quoteIdent(k)} = ${v === null || v === "" ? "NULL" : typeof v === "number" ? v : `'${String(v).replace(/'/g, "''")}'`}`)
          .join(", ");
        const pkLit = typeof pkValue === "number" ? pkValue : `'${String(pkValue).replace(/'/g, "''")}'`;
        await runMyDbQuery(dbId, `UPDATE ${quoteIdent(tableName)} SET ${setSql} WHERE ${quoteIdent(pkCol)} = ${pkLit};`);
        await resync(dbId);
      });
    },
    [withBusy, resync, requireActiveId]
  );

  const deleteRow = useCallback(
    async (tableName: string, pkCol: string, pkValue: unknown) => {
      const dbId = requireActiveId();
      await withBusy(async () => {
        const pkLit = typeof pkValue === "number" ? pkValue : `'${String(pkValue).replace(/'/g, "''")}'`;
        await runMyDbQuery(dbId, `DELETE FROM ${quoteIdent(tableName)} WHERE ${quoteIdent(pkCol)} = ${pkLit};`);
        await resync(dbId);
      });
    },
    [withBusy, resync, requireActiveId]
  );

  /** Clear all tables/data in the active database WITHOUT deleting the database itself or its questions' definitions. */
  const resetDatabase = useCallback(async () => {
    const dbId = requireActiveId();
    await withBusy(async () => {
      await rebuildSchemaFromTables(dbId, []);
      await updateDb(dbId, { tables: [] });
    });
  }, [withBusy, updateDb, requireActiveId]);

  const loadSampleDatabase = useCallback(async () => {
    const dbId = requireActiveId();
    await withBusy(async () => {
      const ddl = sampleTables.map((t) => createTableSql(t)).join("\n");
      await runMyDbQuery(dbId, ddl);
      for (const t of sampleTables) {
        const dml = insertRowsSql(t);
        if (dml) await runMyDbQuery(dbId, dml);
      }
      await resync(dbId);
    });
  }, [withBusy, resync, requireActiveId]);

  const exportSql = useCallback(() => {
    const db = findDb(storeRef.current, storeRef.current.activeDatabaseId);
    if (!db) return "";
    return db.tables
      .map((t) => {
        const ddl = createTableSql(t);
        const dml = insertRowsSql(t);
        return dml ? `${ddl}\n\n${dml}` : ddl;
      })
      .join("\n\n");
  }, []);

  const exportPracticeJson = useCallback(() => {
    return JSON.stringify(storeRef.current, null, 2);
  }, []);

  const importPracticeJson = useCallback(
    async (json: string) => {
      const parsed = JSON.parse(json) as MyDbStore;
      if (!parsed || !Array.isArray(parsed.databases)) throw new Error("This doesn't look like a My Practice export file.");
      await withBusy(async () => {
        for (const db of parsed.databases) {
          await rebuildSchemaFromTables(db.id, db.tables ?? []);
          hydratedDbIds.current.add(db.id);
        }
        await persist({ databases: parsed.databases, activeDatabaseId: parsed.activeDatabaseId ?? parsed.databases[0]?.id ?? null });
      });
    },
    [withBusy, persist]
  );

  // --- Questions (act on the active database) -------------------------------------------

  const saveQuestions = useCallback(
    async (questions: MyDbQuestion[]) => {
      const dbId = requireActiveId();
      await updateDb(dbId, { questions });
    },
    [updateDb, requireActiveId]
  );

  const addQuestion = useCallback(
    async (q: MyDbQuestion) => {
      const db = findDb(storeRef.current, storeRef.current.activeDatabaseId);
      await saveQuestions([q, ...(db?.questions ?? [])]);
    },
    [saveQuestions]
  );

  const updateQuestion = useCallback(
    async (id: string, patch: Partial<MyDbQuestion>) => {
      const db = findDb(storeRef.current, storeRef.current.activeDatabaseId);
      await saveQuestions((db?.questions ?? []).map((q) => (q.id === id ? { ...q, ...patch } : q)));
    },
    [saveQuestions]
  );

  const deleteQuestion = useCallback(
    async (id: string) => {
      const db = findDb(storeRef.current, storeRef.current.activeDatabaseId);
      await saveQuestions((db?.questions ?? []).filter((q) => q.id !== id));
    },
    [saveQuestions]
  );

  /** Record the outcome of one practice attempt against a question (correct/incorrect/hint/solution). */
  const recordAttempt = useCallback(
    async (id: string, outcome: AttemptOutcome) => {
      const db = findDb(storeRef.current, storeRef.current.activeDatabaseId);
      const q = db?.questions.find((x) => x.id === id);
      if (!q) return;
      const patch: Partial<MyDbQuestion> = {
        attempts: q.attempts + 1,
        correctAttempts: q.correctAttempts + (outcome.correct ? 1 : 0),
        incorrectAttempts: q.incorrectAttempts + (outcome.correct ? 0 : 1),
        lastAttemptAt: Date.now(),
        passed: q.passed || outcome.correct,
      };
      if (outcome.solutionSql !== undefined) patch.lastSolution = outcome.solutionSql;
      if (outcome.usedHint) patch.hintsUsed = q.hintsUsed + 1;
      if (outcome.revealedSolution) patch.solutionRevealed = true;
      await updateQuestion(id, patch);
    },
    [updateQuestion]
  );

  const recordHintUsed = useCallback(
    async (id: string) => {
      const db = findDb(storeRef.current, storeRef.current.activeDatabaseId);
      const q = db?.questions.find((x) => x.id === id);
      if (!q) return;
      await updateQuestion(id, { hintsUsed: q.hintsUsed + 1 });
    },
    [updateQuestion]
  );

  const recordSolutionRevealed = useCallback(
    async (id: string) => {
      await updateQuestion(id, { solutionRevealed: true });
    },
    [updateQuestion]
  );

  return {
    store,
    databases: store.databases,
    activeDatabase,
    activeDatabaseId: store.activeDatabaseId,
    ready,
    busy,
    error,
    clearError: () => setError(null),
    createDatabase,
    setActiveDatabase,
    renameDatabase,
    deleteDatabase,
    runSql,
    createTable,
    dropTable,
    importCsvAsTable,
    importSql,
    addRow,
    updateRow,
    deleteRow,
    resetDatabase,
    loadSampleDatabase,
    exportSql,
    exportPracticeJson,
    importPracticeJson,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    recordAttempt,
    recordHintUsed,
    recordSolutionRevealed,
    clearAllData: clearStore,
  };
}

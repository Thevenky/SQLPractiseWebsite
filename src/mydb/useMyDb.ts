import { useCallback, useEffect, useRef, useState } from "react";
import type { MyDbColumn, MyDbQuestion, MyDbState, MyDbTable } from "./types";
import { loadState, saveState, clearState, emptyState } from "./store";
import { rebuildSchemaFromTables, runMyDbQuery, introspectTables, friendlyError } from "./engine";
import { createTableSql, insertRowsSql, assertValidIdentifier, quoteIdent } from "./sqlBuilder";
import { sampleTables } from "./sampleData";
import type { CsvParseResult } from "./csv";
import { coerceCellForType } from "./csv";

export interface MyDbError {
  message: string;
  technical: string;
}

export function useMyDb() {
  const [state, setState] = useState<MyDbState>(emptyState());
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<MyDbError | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadState();
      await rebuildSchemaFromTables(loaded.tables);
      if (!cancelled) {
        setState(loaded);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const persistTables = useCallback(async (tables: MyDbTable[]) => {
    const next = await saveState({ ...stateRef.current, tables });
    setState(next);
    return next;
  }, []);

  /** Re-read the live schema after a mutation and persist the fresh snapshot. */
  const resync = useCallback(async () => {
    const tables = await introspectTables();
    return persistTables(tables);
  }, [persistTables]);

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

  const runSql = useCallback(
    async (sql: string) => {
      const result = await runMyDbQuery(sql);
      // Any statement could have mutated schema/data — resync in the background so the
      // dashboard/schema explorer stay accurate, without blocking the caller on the result.
      resync().catch(() => {});
      return result;
    },
    [resync]
  );

  const createTable = useCallback(
    async (name: string, columns: MyDbColumn[]) => {
      await withBusy(async () => {
        assertValidIdentifier(name);
        const sql = createTableSql({ name, columns, rows: [] });
        await runMyDbQuery(sql);
        await resync();
      });
    },
    [withBusy, resync]
  );

  const dropTable = useCallback(
    async (name: string) => {
      await withBusy(async () => {
        assertValidIdentifier(name);
        await runMyDbQuery(`DROP TABLE IF EXISTS ${quoteIdent(name)};`);
        await resync();
      });
    },
    [withBusy, resync]
  );

  const importCsvAsTable = useCallback(
    async (tableName: string, csv: CsvParseResult, columns: MyDbColumn[]) => {
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
        await runMyDbQuery(ddl);
        if (dml) await runMyDbQuery(dml);
        await resync();
      });
    },
    [withBusy, resync]
  );

  const importSql = useCallback(
    async (sql: string) => {
      let result: { tablesBefore: number; tablesAfter: number };
      await withBusy(async () => {
        const before = (await introspectTables()).length;
        await runMyDbQuery(sql);
        const after = await resync();
        result = { tablesBefore: before, tablesAfter: after.tables.length };
      });
      return result!;
    },
    [withBusy, resync]
  );

  const addRow = useCallback(
    async (tableName: string, row: Record<string, unknown>) => {
      await withBusy(async () => {
        const table = stateRef.current.tables.find((t) => t.name === tableName);
        if (!table) throw new Error(`Table "${tableName}" not found`);
        const sql = insertRowsSql(table, [row]);
        if (sql) await runMyDbQuery(sql);
        await resync();
      });
    },
    [withBusy, resync]
  );

  const updateRow = useCallback(
    async (tableName: string, pkCol: string, pkValue: unknown, patch: Record<string, unknown>) => {
      await withBusy(async () => {
        const setSql = Object.entries(patch)
          .map(([k, v]) => `${quoteIdent(k)} = ${v === null || v === "" ? "NULL" : typeof v === "number" ? v : `'${String(v).replace(/'/g, "''")}'`}`)
          .join(", ");
        const pkLit = typeof pkValue === "number" ? pkValue : `'${String(pkValue).replace(/'/g, "''")}'`;
        await runMyDbQuery(`UPDATE ${quoteIdent(tableName)} SET ${setSql} WHERE ${quoteIdent(pkCol)} = ${pkLit};`);
        await resync();
      });
    },
    [withBusy, resync]
  );

  const deleteRow = useCallback(
    async (tableName: string, pkCol: string, pkValue: unknown) => {
      await withBusy(async () => {
        const pkLit = typeof pkValue === "number" ? pkValue : `'${String(pkValue).replace(/'/g, "''")}'`;
        await runMyDbQuery(`DELETE FROM ${quoteIdent(tableName)} WHERE ${quoteIdent(pkCol)} = ${pkLit};`);
        await resync();
      });
    },
    [withBusy, resync]
  );

  const resetDatabase = useCallback(async () => {
    await withBusy(async () => {
      await rebuildSchemaFromTables([]);
      await clearState();
      const next = await saveState({ ...emptyState() });
      setState(next);
    });
  }, [withBusy]);

  const loadSampleDatabase = useCallback(async () => {
    await withBusy(async () => {
      const ddl = sampleTables.map((t) => createTableSql(t)).join("\n");
      await runMyDbQuery(ddl);
      for (const t of sampleTables) {
        const dml = insertRowsSql(t);
        if (dml) await runMyDbQuery(dml);
      }
      await resync();
    });
  }, [withBusy, resync]);

  const exportSql = useCallback(() => {
    return stateRef.current.tables
      .map((t) => {
        const ddl = createTableSql(t);
        const dml = insertRowsSql(t);
        return dml ? `${ddl}\n\n${dml}` : ddl;
      })
      .join("\n\n");
  }, []);

  const saveQuestions = useCallback(
    async (questions: MyDbQuestion[]) => {
      const next = await saveState({ ...stateRef.current, questions });
      setState(next);
    },
    []
  );

  const addQuestion = useCallback(
    async (q: MyDbQuestion) => {
      await saveQuestions([q, ...stateRef.current.questions]);
    },
    [saveQuestions]
  );

  const updateQuestion = useCallback(
    async (id: string, patch: Partial<MyDbQuestion>) => {
      await saveQuestions(stateRef.current.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)));
    },
    [saveQuestions]
  );

  const deleteQuestion = useCallback(
    async (id: string) => {
      await saveQuestions(stateRef.current.questions.filter((q) => q.id !== id));
    },
    [saveQuestions]
  );

  const setDatabaseName = useCallback(async (name: string) => {
    const next = await saveState({ ...stateRef.current, name });
    setState(next);
  }, []);

  return {
    state,
    ready,
    busy,
    error,
    clearError: () => setError(null),
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
    addQuestion,
    updateQuestion,
    deleteQuestion,
    setDatabaseName,
  };
}

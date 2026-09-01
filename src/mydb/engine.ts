import { rebuildMyDbCatalog, runQueryInMyDb, friendlyError, MYDB_CATALOG } from "../sql-engine/duckdb";
import type { MyDbColumn, MyDbTable } from "./types";
import { stateTablesToSql } from "./sqlBuilder";
import type { QueryResult } from "../types";

/** (Re)build My Database's catalog from a saved snapshot of tables. */
export async function rebuildSchemaFromTables(tables: MyDbTable[]): Promise<void> {
  const sql = stateTablesToSql(tables);
  await rebuildMyDbCatalog(sql, "");
}

/** Run arbitrary SQL against My Database (SELECT, DDL, or DML) and get a formatted result. */
export async function runMyDbQuery(sql: string): Promise<QueryResult> {
  return runQueryInMyDb(sql);
}

export { friendlyError };

function jsonSafeRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(row)) {
      if (v instanceof Date) out[k] = v.toISOString().slice(0, 10);
      else if (typeof v === "bigint") out[k] = Number(v);
      else out[k] = v;
    }
    return out;
  });
}

/**
 * Introspect the live My Database catalog (after any create/alter/insert/import/etc.) and produce
 * a fresh, serializable snapshot of every table + its rows, ready to persist to IndexedDB.
 * This makes My Database robust to arbitrary SQL — we don't track individual statements, we just
 * re-read the resulting state of the world after each mutation.
 */
export async function introspectTables(): Promise<MyDbTable[]> {
  const tablesResult = await runQueryInMyDb(
    `SELECT table_name FROM information_schema.tables WHERE table_catalog = '${MYDB_CATALOG}' AND table_schema = 'main' ORDER BY table_name`
  );
  const tableNames = tablesResult.rows.map((r) => String(r.table_name));

  let pkByTable = new Map<string, Set<string>>();
  try {
    const pkResult = await runQueryInMyDb(
      `SELECT table_name, constraint_column_names FROM duckdb_constraints() WHERE database_name = '${MYDB_CATALOG}' AND constraint_type = 'PRIMARY KEY'`
    );
    pkByTable = new Map(
      pkResult.rows.map((r) => [String(r.table_name), new Set((r.constraint_column_names as unknown as string[]) ?? [])])
    );
  } catch {
    // duckdb_constraints() unavailable — pk display is best-effort only
  }

  const tables: MyDbTable[] = [];
  for (const name of tableNames) {
    const colsResult = await runQueryInMyDb(
      `SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_catalog = '${MYDB_CATALOG}' AND table_schema = 'main' AND table_name = '${name}' ORDER BY ordinal_position`
    );
    const pkCols = pkByTable.get(name) ?? new Set<string>();
    const columns: MyDbColumn[] = colsResult.rows.map((r) => ({
      name: String(r.column_name),
      type: String(r.data_type),
      nullable: String(r.is_nullable).toUpperCase() !== "NO",
      pk: pkCols.has(String(r.column_name)),
    }));

    // DECIMAL columns come back from duckdb-wasm/Arrow as raw 128-bit word arrays rather than
    // JS numbers — cast them to DOUBLE in the SELECT so the values we persist/round-trip are
    // plain, safely-serializable numbers instead of garbled typed-array text.
    const selectList = columns
      .map((c) => (/^DECIMAL/i.test(c.type) ? `CAST("${c.name}" AS DOUBLE) AS "${c.name}"` : `"${c.name}"`))
      .join(", ");
    const rowsResult = await runQueryInMyDb(`SELECT ${selectList || "*"} FROM "${name}" LIMIT 20000`);
    tables.push({ name, columns, rows: jsonSafeRows(rowsResult.rows) });
  }
  return tables;
}

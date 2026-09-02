import {
  rebuildUserCatalog,
  runQueryInUserCatalog,
  dropUserCatalog,
  friendlyError,
  catalogNameForDb,
} from "../sql-engine/duckdb";
import type { MyDbColumn, MyDbTable } from "./types";
import { stateTablesToSql } from "./sqlBuilder";
import type { QueryResult } from "../types";

export { catalogNameForDb, friendlyError };

/** (Re)build a custom database's catalog from a saved snapshot of tables. */
export async function rebuildSchemaFromTables(dbId: string, tables: MyDbTable[]): Promise<void> {
  const sql = stateTablesToSql(tables);
  await rebuildUserCatalog(catalogNameForDb(dbId), sql, "");
}

/** Run arbitrary SQL against a custom database (SELECT, DDL, or DML) and get a formatted result. */
export async function runMyDbQuery(dbId: string, sql: string): Promise<QueryResult> {
  return runQueryInUserCatalog(catalogNameForDb(dbId), sql);
}

/** Permanently detach a custom database's DuckDB catalog (called when the database is deleted). */
export async function dropDatabaseCatalog(dbId: string): Promise<void> {
  await dropUserCatalog(catalogNameForDb(dbId));
}

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
 * Introspect a custom database's live catalog (after any create/alter/insert/import/etc.) and
 * produce a fresh, serializable snapshot of every table + its rows, ready to persist to
 * IndexedDB. This makes the feature robust to arbitrary SQL — we don't track individual
 * statements, we just re-read the resulting state of the world after each mutation.
 */
export async function introspectTables(dbId: string): Promise<MyDbTable[]> {
  const catalog = catalogNameForDb(dbId);
  const run = (sql: string) => runQueryInUserCatalog(catalog, sql);

  const tablesResult = await run(
    `SELECT table_name FROM information_schema.tables WHERE table_catalog = '${catalog}' AND table_schema = 'main' ORDER BY table_name`
  );
  const tableNames = tablesResult.rows.map((r) => String(r.table_name));

  let pkByTable = new Map<string, Set<string>>();
  try {
    const pkResult = await run(
      `SELECT table_name, constraint_column_names FROM duckdb_constraints() WHERE database_name = '${catalog}' AND constraint_type = 'PRIMARY KEY'`
    );
    pkByTable = new Map(
      pkResult.rows.map((r) => [String(r.table_name), new Set((r.constraint_column_names as unknown as string[]) ?? [])])
    );
  } catch {
    // duckdb_constraints() unavailable — pk display is best-effort only
  }

  let fkByTable = new Map<string, Map<string, { table: string; column: string }>>();
  try {
    const fkResult = await run(
      `SELECT table_name, constraint_column_names, referenced_table, referenced_column_names FROM duckdb_constraints() WHERE database_name = '${catalog}' AND constraint_type = 'FOREIGN KEY'`
    );
    fkByTable = new Map();
    for (const r of fkResult.rows) {
      const tname = String(r.table_name);
      const cols = (r.constraint_column_names as unknown as string[]) ?? [];
      const refCols = (r.referenced_column_names as unknown as string[]) ?? [];
      const refTable = r.referenced_table ? String(r.referenced_table) : "";
      if (!cols.length || !refTable) continue;
      const map = fkByTable.get(tname) ?? new Map();
      map.set(cols[0], { table: refTable, column: refCols[0] ?? cols[0] });
      fkByTable.set(tname, map);
    }
  } catch {
    // duckdb_constraints() may not expose FK columns on all versions — best-effort only
  }

  const tables: MyDbTable[] = [];
  for (const name of tableNames) {
    const colsResult = await run(
      `SELECT column_name, data_type, is_nullable, column_default FROM information_schema.columns WHERE table_catalog = '${catalog}' AND table_schema = 'main' AND table_name = '${name}' ORDER BY ordinal_position`
    );
    const pkCols = pkByTable.get(name) ?? new Set<string>();
    const fkCols = fkByTable.get(name) ?? new Map<string, { table: string; column: string }>();
    const columns: MyDbColumn[] = colsResult.rows.map((r) => ({
      name: String(r.column_name),
      type: String(r.data_type),
      nullable: String(r.is_nullable).toUpperCase() !== "NO",
      pk: pkCols.has(String(r.column_name)),
      fk: fkCols.get(String(r.column_name)) ?? null,
      defaultValue: r.column_default != null ? String(r.column_default) : undefined,
    }));

    // DECIMAL columns come back from duckdb-wasm/Arrow as raw 128-bit word arrays rather than
    // JS numbers — cast them to DOUBLE in the SELECT so the values we persist/round-trip are
    // plain, safely-serializable numbers instead of garbled typed-array text.
    const selectList = columns
      .map((c) => (/^DECIMAL/i.test(c.type) ? `CAST("${c.name}" AS DOUBLE) AS "${c.name}"` : `"${c.name}"`))
      .join(", ");
    const rowsResult = await run(`SELECT ${selectList || "*"} FROM "${name}" LIMIT 20000`);
    tables.push({ name, columns, rows: jsonSafeRows(rowsResult.rows) });
  }
  return tables;
}

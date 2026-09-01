import * as duckdb from "@duckdb/duckdb-wasm";
import { Type } from "apache-arrow";
import mvpWorkerUrl from "@duckdb/duckdb-wasm/dist/duckdb-browser-mvp.worker.js?url";
import ehWorkerUrl from "@duckdb/duckdb-wasm/dist/duckdb-browser-eh.worker.js?url";
import mvpWasmUrl from "@duckdb/duckdb-wasm/dist/duckdb-mvp.wasm?url";
import ehWasmUrl from "@duckdb/duckdb-wasm/dist/duckdb-eh.wasm?url";
import { allDdl, allSeed } from "../data";
import type { QueryResult } from "../types";

let dbInstance: duckdb.AsyncDuckDB | null = null;
let connInstance: duckdb.AsyncDuckDBConnection | null = null;
let initPromise: Promise<void> | null = null;

const MANUAL_BUNDLES: duckdb.DuckDBBundles = {
  mvp: { mainModule: mvpWasmUrl, mainWorker: mvpWorkerUrl },
  eh: { mainModule: ehWasmUrl, mainWorker: ehWorkerUrl },
};

async function initDb(): Promise<void> {
  const bundle = await duckdb.selectBundle(MANUAL_BUNDLES);

  const worker = new Worker(bundle.mainWorker!);
  const logger = new duckdb.ConsoleLogger(duckdb.LogLevel.WARNING);
  const db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

  dbInstance = db;
  connInstance = await db.connect();

  await connInstance.query(allDdl);
  await connInstance.query(allSeed);
}

export async function ensureDb(): Promise<void> {
  if (!initPromise) {
    initPromise = initDb();
  }
  return initPromise;
}

export async function resetDb(): Promise<void> {
  if (!connInstance || !dbInstance) return;
  const tables = ["order_items", "orders", "products", "categories", "customers", "admissions", "patients", "doctors", "hospitals", "province_names", "employees", "departments"];
  for (const t of tables) {
    try {
      await connInstance.query(`DROP TABLE IF EXISTS ${t}`);
    } catch {
      // ignore
    }
  }
  await connInstance.query(allDdl);
  await connInstance.query(allSeed);
}

function bigintSafe(value: unknown): unknown {
  if (typeof value === "bigint") {
    const n = Number(value);
    return Number.isSafeInteger(n) ? n : value.toString();
  }
  return value;
}

function coerceValue(value: unknown, typeId: number | undefined): unknown {
  const v = bigintSafe(value);
  if (v === null || v === undefined) return v;
  // Date / Timestamp columns come back as epoch-ms numbers (or bigints) — turn them into Date objects.
  if (typeId === Type.Date || typeId === Type.DateDay || typeId === Type.DateMillisecond || typeId === Type.Timestamp) {
    if (typeof v === "number") return new Date(v);
  }
  return v;
}

async function execAndFormat(sql: string): Promise<QueryResult> {
  if (!connInstance) throw new Error("Database not initialized");

  const start = performance.now();
  const result = await connInstance.query(sql);
  const execMs = performance.now() - start;

  const columns = result.schema.fields.map((f) => f.name);
  const typeIds = result.schema.fields.map((f) => f.type?.typeId as number | undefined);
  const rows: Record<string, unknown>[] = [];
  for (const row of result.toArray()) {
    const obj: Record<string, unknown> = {};
    columns.forEach((col, i) => {
      obj[col] = coerceValue((row as unknown as Record<string, unknown>)[col], typeIds[i]);
    });
    rows.push(obj);
  }

  return { columns, rows, execMs, rowCount: rows.length };
}

export async function runQuery(sql: string): Promise<QueryResult> {
  await ensureDb();
  if (!connInstance) throw new Error("Database not initialized");
  await connInstance.query(`SET search_path='main'`);
  return execAndFormat(sql);
}

// --- PDF Practice: isolated per-PDF schemas on the SAME shared DuckDB connection ---
// Every uploaded PDF gets its own DuckDB SCHEMA (e.g. "pdf_ab12cd34") so its tables never
// collide with the built-in datasets or with another PDF's tables — but it's still the one
// engine, one connection, one wasm instance used everywhere else in the app.

const SAFE_SCHEMA = /^[a-z0-9_]+$/;

function assertSafeSchema(schemaName: string): void {
  if (!SAFE_SCHEMA.test(schemaName)) {
    throw new Error(`Invalid schema name: ${schemaName}`);
  }
}

export async function createPdfSchema(schemaName: string, ddl: string, seed: string): Promise<void> {
  assertSafeSchema(schemaName);
  await ensureDb();
  if (!connInstance) throw new Error("Database not initialized");
  await connInstance.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
  await connInstance.query(`CREATE SCHEMA ${schemaName}`);
  await connInstance.query(`SET search_path='${schemaName}'`);
  try {
    if (ddl.trim()) await connInstance.query(ddl);
    if (seed.trim()) await connInstance.query(seed);
  } finally {
    await connInstance.query(`SET search_path='main'`);
  }
}

export async function dropPdfSchema(schemaName: string): Promise<void> {
  assertSafeSchema(schemaName);
  await ensureDb();
  if (!connInstance) return;
  try {
    await connInstance.query(`DROP SCHEMA IF EXISTS ${schemaName} CASCADE`);
  } catch {
    // ignore
  }
}

export async function runQueryInSchema(schemaName: string, sql: string): Promise<QueryResult> {
  assertSafeSchema(schemaName);
  await ensureDb();
  if (!connInstance) throw new Error("Database not initialized");
  await connInstance.query(`SET search_path='${schemaName},main'`);
  try {
    return await execAndFormat(sql);
  } finally {
    await connInstance.query(`SET search_path='main'`);
  }
}

export function friendlyError(rawMessage: string, _sql?: string): { message: string; columns?: string[] } {
  const colMatch = rawMessage.match(/Referenced column "?([A-Za-z0-9_]+)"?/i) ||
    rawMessage.match(/column "?([A-Za-z0-9_]+)"? does not exist/i) ||
    rawMessage.match(/Binder Error: Table "?[A-Za-z0-9_]+"? does not have a column named "?([A-Za-z0-9_]+)"?/i);
  const tableMatch = rawMessage.match(/Table with name ([A-Za-z0-9_]+) does not exist/i) ||
    rawMessage.match(/Table "?([A-Za-z0-9_]+)"? does not exist/i);

  if (tableMatch) {
    return { message: `Table "${tableMatch[1]}" does not exist. Check the schema explorer on the left for available tables.` };
  }
  if (colMatch) {
    return { message: `Column "${colMatch[1]}" does not exist in the referenced table. Check the schema explorer for available columns.` };
  }
  if (/syntax error/i.test(rawMessage)) {
    return { message: "There's a syntax error in your query. Check for missing commas, parentheses, or keywords." };
  }
  if (/Parser Error/i.test(rawMessage)) {
    return { message: "DuckDB couldn't parse this query. Double-check your SQL syntax." };
  }
  return { message: rawMessage.split("\n")[0] };
}

export { duckdb };

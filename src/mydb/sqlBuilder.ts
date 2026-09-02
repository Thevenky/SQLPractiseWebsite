import type { MyDbColumn, MyDbTable } from "./types";

const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function assertValidIdentifier(name: string, kind: "table" | "column" = "table"): void {
  if (!IDENT_RE.test(name)) {
    throw new Error(`Invalid ${kind} name "${name}". Use letters, numbers and underscores, starting with a letter or underscore.`);
  }
}

export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

export function sqlLiteral(value: unknown): string {
  if (value === null || value === undefined || value === "") return "NULL";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (value instanceof Date) return `'${value.toISOString().slice(0, 10)}'`;
  const s = String(value);
  if (s.trim() === "") return "NULL";
  return `'${s.replace(/'/g, "''")}'`;
}

export function columnDefSql(col: MyDbColumn): string {
  const parts = [quoteIdent(col.name), col.type];
  if (col.pk) parts.push("PRIMARY KEY");
  else if (!col.nullable) parts.push("NOT NULL");
  if (col.defaultValue !== undefined && col.defaultValue !== null && String(col.defaultValue).trim() !== "") {
    parts.push("DEFAULT", formatDefaultLiteral(col.defaultValue, col.type));
  }
  return parts.join(" ");
}

/** Format a user-entered default value for a column, quoting it unless it's a bare SQL keyword/expression. */
function formatDefaultLiteral(raw: string, type: string): string {
  const trimmed = String(raw).trim();
  const upper = trimmed.toUpperCase();
  const bareKeywords = ["CURRENT_DATE", "CURRENT_TIMESTAMP", "CURRENT_TIME", "NULL", "TRUE", "FALSE"];
  if (bareKeywords.includes(upper)) return upper;
  if (/^-?\d+(\.\d+)?$/.test(trimmed) && /INT|DECIMAL|DOUBLE|FLOAT|NUMERIC/i.test(type)) return trimmed;
  if (/^BOOLEAN$/i.test(type) && /^(true|false)$/i.test(trimmed)) return upper;
  return sqlLiteral(trimmed);
}

export function createTableSql(table: MyDbTable): string {
  assertValidIdentifier(table.name);
  table.columns.forEach((c) => assertValidIdentifier(c.name, "column"));
  const cols = table.columns.map(columnDefSql);
  const fks = table.columns
    .filter((c) => c.fk && c.fk.table && c.fk.column)
    .map((c) => `FOREIGN KEY (${quoteIdent(c.name)}) REFERENCES ${quoteIdent(c.fk!.table)} (${quoteIdent(c.fk!.column)})`);
  const allParts = [...cols, ...fks].join(",\n  ");
  return `CREATE TABLE ${quoteIdent(table.name)} (\n  ${allParts}\n);`;
}

export function insertRowsSql(table: MyDbTable, rows: Record<string, unknown>[] = table.rows): string {
  if (rows.length === 0) return "";
  const colNames = table.columns.map((c) => c.name);
  const values = rows
    .map((row) => `(${colNames.map((c) => sqlLiteral(row[c])).join(", ")})`)
    .join(",\n  ");
  return `INSERT INTO ${quoteIdent(table.name)} (${colNames.map(quoteIdent).join(", ")}) VALUES\n  ${values};`;
}

export function tableToSql(table: MyDbTable): string {
  const ddl = createTableSql(table);
  const dml = insertRowsSql(table);
  return dml ? `${ddl}\n\n${dml}` : ddl;
}

export function stateTablesToSql(tables: MyDbTable[]): string {
  return tables.map(tableToSql).join("\n\n");
}

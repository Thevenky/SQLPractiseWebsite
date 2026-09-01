import type { MyDbColumn } from "./types";

export interface CsvParseResult {
  headers: string[];
  rows: Record<string, string>[];
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

export function parseCsv(text: string): CsvParseResult {
  const lines = text.split(/\r\n|\r|\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = splitCsvLine(lines[0]).map((h) => h.replace(/[^A-Za-z0-9_]/g, "_").replace(/^(\d)/, "_$1") || "col");
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });
    rows.push(row);
  }
  return { headers, rows };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const INT_RE = /^-?\d+$/;
const DECIMAL_RE = /^-?\d+\.\d+$/;
const BOOL_VALUES = new Set(["true", "false"]);

export function inferColumnType(values: string[]): string {
  const nonEmpty = values.filter((v) => v !== "" && v !== undefined && v !== null);
  if (nonEmpty.length === 0) return "VARCHAR";
  if (nonEmpty.every((v) => BOOL_VALUES.has(v.toLowerCase()))) return "BOOLEAN";
  if (nonEmpty.every((v) => DATE_RE.test(v))) return "DATE";
  if (nonEmpty.every((v) => INT_RE.test(v))) return "BIGINT";
  if (nonEmpty.every((v) => INT_RE.test(v) || DECIMAL_RE.test(v))) return "DOUBLE";
  return "VARCHAR";
}

export function inferColumns(csv: CsvParseResult): MyDbColumn[] {
  return csv.headers.map((h) => {
    const values = csv.rows.map((r) => r[h]);
    const type = inferColumnType(values);
    const nullable = values.some((v) => v === "" || v === undefined);
    return { name: h, type, nullable };
  });
}

export function coerceCellForType(raw: string, type: string): unknown {
  if (raw === "" || raw === undefined || raw === null) return null;
  switch (type) {
    case "INTEGER":
    case "BIGINT":
      return INT_RE.test(raw) ? Number(raw) : raw;
    case "DOUBLE":
    case "DECIMAL":
      return Number.isFinite(Number(raw)) ? Number(raw) : raw;
    case "BOOLEAN":
      return raw.toLowerCase() === "true";
    default:
      return raw;
  }
}

import type { PdfTable } from "./types";

// Split a comma-separated list respecting nested parentheses, e.g. "a INT, b DECIMAL(10,2)" -> ["a INT", "b DECIMAL(10,2)"]
function splitTopLevel(s: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of s) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

const CONSTRAINT_KEYWORDS = /^(PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|CONSTRAINT)\b/i;

export function extractCreateTableBlocks(text: string): string[] {
  const blocks: string[] = [];
  const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const start = match.index;
    // find matching closing paren for the opening one right after the table name
    const openIdx = text.indexOf("(", match.index + match[0].length - 1);
    if (openIdx === -1) continue;
    let depth = 0;
    let end = -1;
    for (let i = openIdx; i < text.length; i++) {
      if (text[i] === "(") depth++;
      else if (text[i] === ")") {
        depth--;
        if (depth === 0) {
          end = i;
          break;
        }
      }
    }
    if (end === -1) continue;
    blocks.push(text.slice(start, end + 1) + ";");
    re.lastIndex = end;
  }
  return blocks;
}

export function extractInsertBlocks(text: string): string[] {
  const blocks: string[] = [];
  const re = /INSERT\s+INTO\s+[A-Za-z_][A-Za-z0-9_]*[\s\S]*?;/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    blocks.push(match[0]);
  }
  return blocks;
}

export function parseCreateTable(block: string): PdfTable | null {
  const nameMatch = block.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([A-Za-z_][A-Za-z0-9_]*)/i);
  if (!nameMatch) return null;
  const name = nameMatch[1];

  const openIdx = block.indexOf("(");
  const closeIdx = block.lastIndexOf(")");
  if (openIdx === -1 || closeIdx === -1 || closeIdx < openIdx) return null;
  const body = block.slice(openIdx + 1, closeIdx);
  const parts = splitTopLevel(body);

  const columns: PdfTable["columns"] = [];
  const pkNames = new Set<string>();
  const fks: { column: string; table: string; refCol: string }[] = [];

  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    if (CONSTRAINT_KEYWORDS.test(trimmed)) {
      const pkMatch = trimmed.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkMatch) {
        pkMatch[1].split(",").forEach((c) => pkNames.add(c.trim().replace(/["`]/g, "")));
      }
      const fkMatch = trimmed.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]+)\)/i);
      if (fkMatch) {
        fks.push({ column: fkMatch[1].trim().replace(/["`]/g, ""), table: fkMatch[2], refCol: fkMatch[3].trim().replace(/["`]/g, "") });
      }
      continue;
    }
    const colMatch = trimmed.match(/^["`]?([A-Za-z_][A-Za-z0-9_]*)["`]?\s+([A-Za-z][A-Za-z0-9_ ]*(?:\([^)]*\))?)/);
    if (!colMatch) continue;
    const colName = colMatch[1];
    let colType = colMatch[2].trim();
    // strip trailing constraint keywords that leaked into the type capture
    colType = colType.replace(/\s+(NOT\s+NULL|NULL|PRIMARY\s+KEY|UNIQUE|DEFAULT\s+.*|REFERENCES\s+.*|CHECK\s*\(.*\))$/i, "").trim();
    const isInlinePk = /PRIMARY\s+KEY/i.test(trimmed);
    if (isInlinePk) pkNames.add(colName);
    const inlineFk = trimmed.match(/REFERENCES\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]+)\)/i);
    if (inlineFk) fks.push({ column: colName, table: inlineFk[1], refCol: inlineFk[2].trim().replace(/["`]/g, "") });
    columns.push({ name: colName, type: colType || undefined });
  }

  for (const col of columns) {
    if (pkNames.has(col.name)) col.pk = true;
    const fk = fks.find((f) => f.column === col.name);
    if (fk) col.fk = { table: fk.table, column: fk.refCol };
  }

  if (columns.length === 0) return null;
  return { name, columns };
}

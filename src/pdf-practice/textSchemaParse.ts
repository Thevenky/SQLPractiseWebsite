import type { PdfTable } from "./types";

const BARE_IDENTIFIER = /^[A-Za-z][A-Za-z0-9_]{0,29}$/;
const BULLET_PREFIX = /^(?:[-*•]|├──|└──|│)\s*/;

function stripBullet(line: string): string {
  return line.replace(BULLET_PREFIX, "").trim();
}

function looksLikeColumn(line: string): boolean {
  const stripped = stripBullet(line);
  return BARE_IDENTIFIER.test(stripped);
}

/**
 * Best-effort detection of a plain-text schema listing like:
 *
 *   employees
 *   employee_id
 *   first_name
 *   ...
 *
 * Only used as a fallback when no CREATE TABLE statements are present in the PDF.
 */
export function parseTextSchema(text: string): PdfTable[] {
  const rawLines = text.split("\n").map((l) => l.trim());
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const line of rawLines) {
    if (line === "") {
      if (current.length) blocks.push(current);
      current = [];
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);

  const tables: PdfTable[] = [];
  for (const block of blocks) {
    if (block.length < 3) continue;
    const [headerRaw, ...rest] = block;
    const header = stripBullet(headerRaw);
    if (!BARE_IDENTIFIER.test(header)) continue;
    if (/^(select|from|where|insert|update|delete|create|question|answer|table|hint|solution)$/i.test(header)) continue;

    const columnLines = rest.filter(looksLikeColumn);
    // Require most of the block's lines to look like plausible column names.
    if (columnLines.length < 2 || columnLines.length < rest.length * 0.7) continue;

    tables.push({
      name: header,
      columns: columnLines.map((l) => ({ name: stripBullet(l) })),
    });
  }
  return tables;
}

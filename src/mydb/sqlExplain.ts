// Heuristic, regex/scan based "plain English" explainer for a single SQL statement.
// This does not fully parse SQL — it looks for top-level clause keywords (ones not nested
// inside parentheses, i.e. not part of a subquery) and describes what each one does. Good
// enough to give a learner a walkthrough of their own query; not a substitute for a real parser.

const AGG_FN_RE = /\b(SUM|AVG|COUNT|MIN|MAX|STDDEV|VARIANCE|LIST|STRING_AGG|ARRAY_AGG)\s*\(/i;
const WINDOW_RE = /\bOVER\s*\(/i;
const CTE_RE = /^\s*WITH\b/i;

function buildDepth(sql: string): number[] {
  const depth: number[] = new Array(sql.length).fill(0);
  let d = 0;
  let inString = false;
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    if (ch === "'") inString = !inString;
    if (!inString) {
      if (ch === "(") {
        depth[i] = d;
        d++;
        continue;
      }
      if (ch === ")") {
        d = Math.max(0, d - 1);
        depth[i] = d;
        continue;
      }
    }
    depth[i] = d;
  }
  return depth;
}

interface ClauseMatch {
  keyword: string;
  index: number;
}

const CLAUSE_KEYWORDS: { re: RegExp; label: string }[] = [
  { re: /\bSELECT\b/gi, label: "SELECT" },
  { re: /\bFROM\b/gi, label: "FROM" },
  { re: /\bWHERE\b/gi, label: "WHERE" },
  { re: /\bGROUP\s+BY\b/gi, label: "GROUP BY" },
  { re: /\bHAVING\b/gi, label: "HAVING" },
  { re: /\bORDER\s+BY\b/gi, label: "ORDER BY" },
  { re: /\bLIMIT\b/gi, label: "LIMIT" },
];

function topLevelMatches(sql: string, depth: number[]): ClauseMatch[] {
  const found: ClauseMatch[] = [];
  for (const { re, label } of CLAUSE_KEYWORDS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sql))) {
      if (depth[m.index] === 0) {
        found.push({ keyword: label, index: m.index });
      }
    }
  }
  return found.sort((a, b) => a.index - b.index);
}

export function extractClauses(sql: string): Record<string, string> {
  const depth = buildDepth(sql);
  const matches = topLevelMatches(sql, depth);
  const clauses: Record<string, string> = {};
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i + 1 < matches.length ? matches[i + 1].index : sql.length;
    const label = matches[i].keyword;
    const raw = sql.slice(start, end).replace(new RegExp(`^${label.replace(/\s+/g, "\\s+")}`, "i"), "").trim();
    clauses[label] = (clauses[label] ? clauses[label] + " " : "") + raw.replace(/;\s*$/, "");
  }
  return clauses;
}

function extractTablesAndJoins(fromClause: string): { tables: string[]; joins: { type: string; table: string; on?: string }[] } {
  if (!fromClause) return { tables: [], joins: [] };
  const joinRe = /\b((?:INNER|LEFT|RIGHT|FULL OUTER|FULL|CROSS)\s+JOIN|JOIN)\s+([A-Za-z0-9_."]+)(?:\s+(?:AS\s+)?([A-Za-z0-9_]+))?(?:\s+ON\s+(.+?))?(?=\s+(?:INNER|LEFT|RIGHT|FULL|CROSS|JOIN)\s|$)/gis;
  const joins: { type: string; table: string; on?: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = joinRe.exec(fromClause))) {
    joins.push({ type: m[1].toUpperCase().replace(/\s+/g, " "), table: m[2], on: m[4]?.trim() });
  }
  const firstTableMatch = fromClause.match(/^\s*([A-Za-z0-9_."]+)/);
  const tables: string[] = [];
  if (firstTableMatch) tables.push(firstTableMatch[1]);
  tables.push(...joins.map((j) => j.table));
  return { tables, joins };
}

export interface QueryExplanation {
  isCte: boolean;
  hasSubquery: boolean;
  hasWindowFunction: boolean;
  hasAggregate: boolean;
  tables: string[];
  joins: { type: string; table: string; on?: string }[];
  lines: string[];
}

/** Produce a plain-English, clause-by-clause walkthrough of a single SQL query. */
export function explainQuery(sqlInput: string): QueryExplanation {
  const sql = sqlInput.trim();
  const lines: string[] = [];
  const isCte = CTE_RE.test(sql);
  const hasWindowFunction = WINDOW_RE.test(sql);
  const hasAggregate = AGG_FN_RE.test(sql);
  const hasSubquery = /\(\s*SELECT\b/i.test(sql);

  if (!sql) {
    return { isCte: false, hasSubquery: false, hasWindowFunction: false, hasAggregate: false, tables: [], joins: [], lines: ["Write a query and click \"Explain My Query\" to see a plain-English walkthrough."] };
  }

  if (isCte) {
    lines.push("This query starts with a CTE (a `WITH ... AS (...)` block) — a named temporary result you can reference later in the query, like a stand-in view.");
  }

  const clauses = extractClauses(sql);
  const { tables, joins } = extractTablesAndJoins(clauses["FROM"] || "");

  if (clauses["SELECT"]) {
    const cols = clauses["SELECT"];
    if (hasAggregate) {
      lines.push(`SELECT chooses the columns/values to return, including one or more aggregate functions (${(cols.match(AGG_FN_RE) || [])[0] || "an aggregate"}) that summarize multiple rows into one value.`);
    } else {
      lines.push(`SELECT chooses which columns to return: ${cols.length > 120 ? cols.slice(0, 120) + "…" : cols}.`);
    }
    if (hasWindowFunction) {
      lines.push("One of the selected expressions uses a window function (an `OVER (...)` clause) — this computes a value across a set of related rows (like a running total or a rank) without collapsing them into one row, unlike GROUP BY.");
    }
  }

  if (clauses["FROM"]) {
    if (tables.length) {
      lines.push(`FROM reads data starting from the "${tables[0]}" table.`);
    }
    for (const j of joins) {
      lines.push(
        `${j.type} brings in the "${j.table}" table${j.on ? `, matching rows where ${j.on}` : " (no explicit ON condition was found — double check this)"}.`
      );
    }
  }

  if (clauses["WHERE"]) {
    lines.push(`WHERE filters individual rows before any grouping happens, keeping only rows where: ${clauses["WHERE"]}.`);
  }

  if (clauses["GROUP BY"]) {
    lines.push(`GROUP BY collapses rows that share the same value(s) of ${clauses["GROUP BY"]} into one row per group — this is what makes aggregate functions (like MAX, COUNT, SUM) compute "per group" instead of across the whole table.`);
  }

  if (clauses["HAVING"]) {
    lines.push(`HAVING filters entire groups (after GROUP BY has run), keeping only groups where: ${clauses["HAVING"]}. This is different from WHERE, which filters rows before grouping.`);
  }

  if (clauses["ORDER BY"]) {
    lines.push(`ORDER BY sorts the final result by ${clauses["ORDER BY"]}.`);
  }

  if (clauses["LIMIT"]) {
    lines.push(`LIMIT restricts the output to at most ${clauses["LIMIT"]} row(s).`);
  }

  if (hasSubquery) {
    lines.push("This query also contains a subquery — a SELECT nested inside parentheses, used to compute an intermediate result that the outer query then filters or joins against.");
  }

  if (lines.length === 0) {
    lines.push("This doesn't look like a complete SELECT statement yet — write a query and click \"Explain My Query\" again.");
  }

  return { isCte, hasSubquery, hasWindowFunction, hasAggregate, tables, joins, lines };
}

import type { MyDbTable } from "./types";

export type SqlErrorCategory =
  | "unknown_column"
  | "unknown_table"
  | "ambiguous_column"
  | "syntax_error"
  | "missing_group_by"
  | "aggregate_misuse"
  | "join_condition"
  | "subquery"
  | "wrong_column_count"
  | "type_mismatch"
  | "other";

export interface SqlErrorExplanation {
  category: SqlErrorCategory;
  title: string;
  message: string;
  /** e.g. "Did you mean: dept_id" */
  suggestion?: string;
  technical: string;
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = new Array(n + 1);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(
        dp[j] + 1,
        dp[j - 1] + 1,
        prev + (a[i - 1].toLowerCase() === b[j - 1].toLowerCase() ? 0 : 1)
      );
      prev = tmp;
    }
  }
  return dp[n];
}

function closestMatch(target: string, candidates: string[]): string | null {
  let best: string | null = null;
  let bestDist = Infinity;
  for (const c of candidates) {
    const dist = levenshtein(target.toLowerCase(), c.toLowerCase());
    if (dist < bestDist) {
      bestDist = dist;
      best = c;
    }
  }
  // Only suggest if reasonably close (allow a bigger edit distance for longer identifiers).
  if (best && bestDist <= Math.max(2, Math.ceil(target.length * 0.4))) return best;
  return null;
}

export interface SchemaInfo {
  tables: string[];
  columns: string[];
  columnsByTable: Record<string, string[]>;
}

export function schemaInfoFromTables(tables: MyDbTable[]): SchemaInfo {
  const columns: string[] = [];
  const columnsByTable: Record<string, string[]> = {};
  for (const t of tables) {
    columnsByTable[t.name] = t.columns.map((c) => c.name);
    columns.push(...t.columns.map((c) => c.name));
  }
  return { tables: tables.map((t) => t.name), columns, columnsByTable };
}

/**
 * Turn a raw DuckDB error into a beginner-friendly explanation, categorized, with a
 * "did you mean" suggestion when a referenced table/column looks like a typo of a real one.
 */
export function explainSqlError(rawMessage: string, schema: SchemaInfo): SqlErrorExplanation {
  const firstLine = rawMessage.split("\n")[0];

  // Unknown column
  const colMatch =
    rawMessage.match(/Referenced column "?([A-Za-z0-9_]+)"?/i) ||
    rawMessage.match(/column "?([A-Za-z0-9_]+)"? does not exist/i) ||
    rawMessage.match(/Binder Error: Table "?[A-Za-z0-9_]+"? does not have a column named "?([A-Za-z0-9_]+)"?/i);
  if (colMatch) {
    const bad = colMatch[1];
    const suggestion = closestMatch(bad, schema.columns);
    return {
      category: "unknown_column",
      title: "Unknown column",
      message: suggestion
        ? `You used:\n\n"${bad}"\n\n"${bad}" is not a valid column reference.`
        : `Column "${bad}" does not exist in the referenced table. Check the schema explorer for available columns.`,
      suggestion: suggestion ? `Did you mean: ${suggestion}` : undefined,
      technical: firstLine,
    };
  }

  // Unknown table
  const tableMatch =
    rawMessage.match(/Table with name ([A-Za-z0-9_]+) does not exist/i) ||
    rawMessage.match(/Table "?([A-Za-z0-9_]+)"? does not exist/i);
  if (tableMatch) {
    const bad = tableMatch[1];
    const suggestion = closestMatch(bad, schema.tables);
    return {
      category: "unknown_table",
      title: "Unknown table",
      message: suggestion
        ? `You referenced a table called "${bad}", but no table with that name exists in this database.`
        : `Table "${bad}" does not exist. Check the schema explorer on the left for available tables.`,
      suggestion: suggestion ? `Did you mean: ${suggestion}` : undefined,
      technical: firstLine,
    };
  }

  // Ambiguous column
  const ambiguousMatch = rawMessage.match(/Ambiguous reference to column "?([A-Za-z0-9_.]+)"?/i) || rawMessage.match(/ambiguous column name "?([A-Za-z0-9_.]+)"?/i);
  if (ambiguousMatch) {
    const col = ambiguousMatch[1];
    return {
      category: "ambiguous_column",
      title: "Ambiguous column",
      message: `The column "${col}" exists in more than one of the tables in this query. When joining tables, qualify it with the table name or an alias, e.g. table_name.${col}.`,
      technical: firstLine,
    };
  }

  // Missing GROUP BY / must appear in GROUP BY
  if (/must appear in the GROUP BY clause/i.test(rawMessage) || /not.*aggregate.*GROUP BY/i.test(rawMessage)) {
    return {
      category: "missing_group_by",
      title: "Missing GROUP BY",
      message:
        "You're selecting a mix of aggregated and non-aggregated columns. Every non-aggregated column in SELECT must also appear in a GROUP BY clause.",
      technical: firstLine,
    };
  }

  // Aggregate function misuse
  if (/aggregate function calls cannot be nested/i.test(rawMessage) || /aggregate functions are not allowed/i.test(rawMessage)) {
    return {
      category: "aggregate_misuse",
      title: "Aggregate function misuse",
      message: "There's a problem with how an aggregate function (SUM, COUNT, AVG, MAX, MIN...) is being used — check that it isn't nested inside another aggregate, and that it isn't used somewhere aggregates aren't allowed (like directly in a WHERE clause — use HAVING instead).",
      technical: firstLine,
    };
  }

  // Join condition / cross join warnings
  if (/no equality predicate/i.test(rawMessage) || /join condition/i.test(rawMessage)) {
    return {
      category: "join_condition",
      title: "JOIN condition issue",
      message: "There's an issue with your JOIN condition. Double-check the ON clause connects a column from one table to a matching column in the other table.",
      technical: firstLine,
    };
  }

  // Wrong number of columns (UNION/INSERT)
  if (/number of columns/i.test(rawMessage) || /each UNION query must have the same number of columns/i.test(rawMessage)) {
    return {
      category: "wrong_column_count",
      title: "Wrong number of columns",
      message: "The number of columns doesn't match between the two sides of this statement (e.g. a UNION, or an INSERT with a column list). Make sure both sides select or provide the same number of columns.",
      technical: firstLine,
    };
  }

  // Type mismatch
  if (/type mismatch/i.test(rawMessage) || /cannot compare/i.test(rawMessage) || /Could not convert/i.test(rawMessage)) {
    return {
      category: "type_mismatch",
      title: "Type mismatch",
      message: "You're comparing or combining values of incompatible types (e.g. text vs. a number, or a date vs. text). Check the column types in the schema explorer and adjust your literals or add a CAST.",
      technical: firstLine,
    };
  }

  // Subquery issues
  if (/subquery/i.test(rawMessage) || /more than one row returned by a subquery/i.test(rawMessage)) {
    return {
      category: "subquery",
      title: "Subquery issue",
      message: "There's a problem with a subquery — a subquery used where a single value is expected (e.g. after =) must return exactly one row and one column. Consider using IN, EXISTS, or LIMIT 1 if it can return multiple rows.",
      technical: firstLine,
    };
  }

  // Generic syntax error
  if (/syntax error/i.test(rawMessage) || /Parser Error/i.test(rawMessage)) {
    return {
      category: "syntax_error",
      title: "Syntax error",
      message: "There's a syntax error in your query. Check for missing commas, parentheses, quotes, or keywords near where the error points.",
      technical: firstLine,
    };
  }

  return { category: "other", title: "SQL error", message: firstLine, technical: firstLine };
}

import type { Question, QueryResult, ValidationResult } from "../types";

function normalizeValue(v: unknown): string {
  if (v === null || v === undefined) return "∅";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") {
    // normalize -0 and float rounding noise
    return (Math.round(v * 1e6) / 1e6).toString();
  }
  if (typeof v === "object") {
    // duckdb may return Date-like wrapper objects
    const s = String(v);
    return s;
  }
  return String(v).trim();
}

function rowSignature(row: Record<string, unknown>, columns: string[]): string {
  return columns.map((c) => normalizeValue(row[c])).join("|");
}

/**
 * Result-set based comparison, independent of the built-in Question type — used by both the
 * curated practice questions and PDF Practice (where "requirements" are just expected vs. actual).
 */
export function compareResults(expected: QueryResult, actual: QueryResult, orderMatters: boolean): ValidationResult {
  if (actual.columns.length !== expected.columns.length) {
    return {
      status: "fail",
      message: "Your query executed, but it doesn't return the expected number of columns.",
      detail: `Expected ${expected.columns.length} column(s), got ${actual.columns.length}.`,
    };
  }

  if (actual.rowCount !== expected.rowCount) {
    return {
      status: "fail",
      message: "Your query executed successfully, but the result doesn't match the expected result.",
      detail: `Expected ${expected.rowCount} row(s), got ${actual.rowCount}. Try checking your filtering or grouping logic.`,
    };
  }

  const expectedCols = expected.columns;
  const actualCols = actual.columns;

  if (orderMatters) {
    for (let i = 0; i < expected.rows.length; i++) {
      const eSig = expectedCols.map((c) => normalizeValue(expected.rows[i][c]));
      const aSig = actualCols.map((c) => normalizeValue(actual.rows[i][c]));
      if (eSig.join("|") !== aSig.join("|")) {
        return {
          status: "fail",
          message: "Your query returns the right kind of data, but not in the required order.",
          detail: "This question requires a specific row order (check for ORDER BY).",
        };
      }
    }
    return { status: "pass", message: "Correct!" };
  }

  // Order-independent: compare multisets of row signatures, using positional column order
  const expectedSigs = expected.rows.map((r) => rowSignature(r, expectedCols)).sort();
  const actualSigs = actual.rows.map((r) => rowSignature(r, actualCols)).sort();

  for (let i = 0; i < expectedSigs.length; i++) {
    if (expectedSigs[i] !== actualSigs[i]) {
      return {
        status: "fail",
        message: "Your query executed successfully, but the result doesn't match the expected result.",
        detail: "Try checking your filtering, joins, or grouping logic.",
      };
    }
  }

  return { status: "pass", message: "Correct!" };
}

export function validate(question: Question, expected: QueryResult, actual: QueryResult): ValidationResult {
  // Pattern requirement (e.g. must use a subquery / window function) checked by caller before this.
  return compareResults(expected, actual, !!question.orderMatters);
}

export function checkPattern(question: Question, sql: string): ValidationResult | null {
  if (!question.requiresPattern) return null;
  const re = new RegExp(question.requiresPattern.regex, "i");
  if (!re.test(sql)) {
    return {
      status: "fail",
      message: "Almost — but this exercise wants you to practice a specific technique.",
      detail: question.requiresPattern.message,
    };
  }
  return null;
}

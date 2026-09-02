import type { QueryResult } from "../types";
import { extractClauses } from "./sqlExplain";

const AGG_FN_RE = /\b(SUM|AVG|COUNT|MIN|MAX)\s*\(/gi;

function aggregateFns(sql: string): Set<string> {
  const set = new Set<string>();
  let m: RegExpExecArray | null;
  const re = new RegExp(AGG_FN_RE);
  while ((m = re.exec(sql))) set.add(m[1].toUpperCase());
  return set;
}

function has(clauses: Record<string, string>, key: string): boolean {
  return !!clauses[key] && clauses[key].trim().length > 0;
}

function hasJoin(sql: string): boolean {
  return /\bJOIN\b/i.test(sql);
}

function hasDistinct(sql: string): boolean {
  return /\bSELECT\s+DISTINCT\b/i.test(sql);
}

export interface MistakeAnalysis {
  /** Highest-priority conceptual explanation of what's likely wrong, if we could infer one. */
  headline: string | null;
  /** Additional, lower-confidence observations. */
  details: string[];
}

/**
 * Compare the user's query against the expected answer (both as SQL text) plus their executed
 * result shapes, and try to explain WHY the answer is conceptually wrong — not just that it is.
 * This is heuristic (regex-based), not a real SQL analyzer, but it covers the common classroom
 * mistakes: forgetting GROUP BY, missing a JOIN, missing a filter, wrong aggregate, etc.
 */
export function analyzeMistake(
  userSql: string,
  expectedSql: string,
  userResult: QueryResult | null,
  expectedResult: QueryResult | null
): MistakeAnalysis {
  const details: string[] = [];
  let headline: string | null = null;

  const userClauses = extractClauses(userSql);
  const expectedClauses = extractClauses(expectedSql);

  const userHasGroupBy = has(userClauses, "GROUP BY");
  const expectedHasGroupBy = has(expectedClauses, "GROUP BY");

  // Missing GROUP BY: the single most common "aggregate over everything instead of per-group" mistake.
  if (expectedHasGroupBy && !userHasGroupBy) {
    const groupCol = expectedClauses["GROUP BY"];
    if (userResult && expectedResult && userResult.rowCount < expectedResult.rowCount) {
      headline = `Your query returns a single result across the entire table.\n\nThe question asks for a result for EACH group.\n\nThink about:\n→ GROUP BY ${groupCol}`;
    } else {
      headline = `This question asks for a breakdown "per group", but your query doesn't group the rows.\n\nThink about:\n→ GROUP BY ${groupCol}`;
    }
  } else if (!expectedHasGroupBy && userHasGroupBy) {
    headline = "The expected answer doesn't group rows — your GROUP BY may be splitting the result into more rows than intended. Check whether this question actually wants one overall value rather than one per group.";
  }

  // Missing JOIN.
  const expectedHasJoin = hasJoin(expectedSql);
  const userHasJoin = hasJoin(userSql);
  if (!headline && expectedHasJoin && !userHasJoin) {
    headline = "Your query only looks at a single table.\n\nThis question needs data combined from more than one table — think about which tables share a common column, and JOIN them on it.";
  } else if (expectedHasJoin && userHasJoin) {
    // Different join type used (e.g. INNER vs LEFT) can change row counts.
    const expectedJoinType = (expectedSql.match(/\b(INNER|LEFT|RIGHT|FULL)\s+JOIN/i)?.[1] ?? "INNER").toUpperCase();
    const userJoinType = (userSql.match(/\b(INNER|LEFT|RIGHT|FULL)\s+JOIN/i)?.[1] ?? "INNER").toUpperCase();
    if (expectedJoinType && userJoinType && expectedJoinType !== userJoinType && userResult && expectedResult && userResult.rowCount !== expectedResult.rowCount) {
      details.push(`You used a ${userJoinType} JOIN, but the row counts suggest a ${expectedJoinType} JOIN may be needed instead (they behave differently when a match is missing on one side).`);
    }
  }

  // Missing WHERE filter.
  const expectedHasWhere = has(expectedClauses, "WHERE");
  const userHasWhere = has(userClauses, "WHERE");
  if (!headline && expectedHasWhere && !userHasWhere) {
    headline = "The expected answer filters rows with a WHERE clause, but your query doesn't filter at all — you're probably including rows that should be excluded.";
  }

  // Aggregate used in WHERE instead of HAVING.
  if (userHasWhere && /\b(SUM|AVG|COUNT|MIN|MAX)\s*\(/i.test(userClauses["WHERE"] || "")) {
    details.push("Aggregate functions (SUM, COUNT, AVG, MIN, MAX) can't be used directly in a WHERE clause, because WHERE runs before grouping happens. Filter on an aggregate using HAVING instead.");
  }

  // Wrong aggregate function.
  if (!headline) {
    const userAggs = aggregateFns(userSql);
    const expectedAggs = aggregateFns(expectedSql);
    if (expectedAggs.size > 0 && userAggs.size > 0) {
      const missing = [...expectedAggs].filter((f) => !userAggs.has(f));
      if (missing.length > 0 && [...userAggs].some((f) => !expectedAggs.has(f))) {
        const userOnly = [...userAggs].filter((f) => !expectedAggs.has(f));
        headline = `You used ${userOnly.join("/")}, but this question is looking for ${missing.join("/")}. Re-read the question to check which aggregate it's asking for.`;
      }
    }
  }

  // DISTINCT likely needed.
  if (!headline && hasDistinct(expectedSql) && !hasDistinct(userSql) && userResult && expectedResult && userResult.rowCount > expectedResult.rowCount) {
    details.push("Your result has more rows than expected — you may have duplicate rows. Consider using SELECT DISTINCT.");
  }

  // Column count mismatch already surfaced by compareResults, but add a nudge.
  if (!headline && userResult && expectedResult && userResult.columns.length !== expectedResult.columns.length) {
    headline = `Your query returns ${userResult.columns.length} column(s), but ${expectedResult.columns.length} are expected. Check your SELECT list against what the question is asking for.`;
  }

  return { headline, details };
}

import type { PdfQuestion } from "./types";

interface ConceptRule {
  re: RegExp;
  concept: string;
  hint: string;
  explain: string;
}

const RULES: ConceptRule[] = [
  {
    re: /PARTITION\s+BY/i,
    concept: "PARTITION BY",
    hint: "This looks like a \"per group\" problem — think about PARTITION BY to reset a calculation for each group.",
    explain: "PARTITION BY divides the rows into groups so the window function is computed separately within each group, instead of across the whole table.",
  },
  {
    re: /ROW_NUMBER\s*\(/i,
    concept: "ROW_NUMBER",
    hint: "A window function that numbers rows can help here.",
    explain: "ROW_NUMBER() assigns a unique, sequential number to each row within its window, which is useful for picking a specific row per group (like the top one).",
  },
  {
    re: /DENSE_RANK\s*\(/i,
    concept: "DENSE_RANK",
    hint: "If there could be ties, a plain row count isn't enough — consider a ranking function that handles ties without skipping numbers.",
    explain: "DENSE_RANK() ranks rows within a window, giving tied values the same rank and leaving no gaps afterward — useful for \"Nth highest\" problems.",
  },
  {
    re: /\bRANK\s*\(/i,
    concept: "RANK",
    hint: "Consider a ranking window function to order rows within a group.",
    explain: "RANK() assigns a rank within a window, skipping numbers after ties.",
  },
  {
    re: /\bLAG\s*\(/i,
    concept: "LAG",
    hint: "Comparing a row to the previous row? A window function can look backward.",
    explain: "LAG() reads a value from a previous row within the same window, useful for row-over-row comparisons.",
  },
  {
    re: /\bLEAD\s*\(/i,
    concept: "LEAD",
    hint: "Comparing a row to the next row? A window function can look forward.",
    explain: "LEAD() reads a value from a following row within the same window.",
  },
  {
    re: /OVER\s*\(/i,
    concept: "Window functions",
    hint: "This likely needs a window function — something computed per row without collapsing the rows via GROUP BY.",
    explain: "The OVER (...) clause turns an aggregate or ranking function into a window function, computing a value per row while still seeing the other rows in its window.",
  },
  {
    re: /WITH\s+[A-Za-z_][A-Za-z0-9_]*\s+AS\s*\(/i,
    concept: "CTE (WITH clause)",
    hint: "Try breaking the problem into two steps using a WITH clause (a CTE) — compute an intermediate result first, then query it.",
    explain: "A CTE (WITH ... AS (...)) names an intermediate query so a later part of the statement can filter or join against it, which keeps multi-step logic readable.",
  },
  {
    re: /\b(LEFT|RIGHT)\s+JOIN\b/i,
    concept: "Outer join",
    hint: "Some rows on one side may have no match — think about which JOIN type keeps them anyway.",
    explain: "An outer join (LEFT/RIGHT JOIN) keeps rows from one side even when there's no matching row on the other side, filling the missing columns with NULL.",
  },
  {
    re: /\bJOIN\b/i,
    concept: "JOIN",
    hint: "The data you need spans more than one table — you'll need to JOIN them on a shared key.",
    explain: "JOIN combines rows from two tables based on a matching column, usually a foreign key relationship.",
  },
  {
    re: /\bEXISTS\b/i,
    concept: "EXISTS",
    hint: "You're checking for \"at least one match\" — a correlated EXISTS subquery is efficient for that.",
    explain: "EXISTS returns true as soon as a correlated subquery finds a matching row, which is a natural way to express \"has at least one\".",
  },
  {
    re: /\bIN\s*\(\s*SELECT/i,
    concept: "IN subquery",
    hint: "A subquery that returns a list of values, checked with IN, may help here.",
    explain: "An IN (SELECT ...) subquery filters rows whose value appears anywhere in the list produced by the inner query.",
  },
  {
    re: /HAVING/i,
    concept: "HAVING",
    hint: "If you need to filter on an aggregated value (like a COUNT or SUM), WHERE won't work — think about what runs after grouping.",
    explain: "HAVING filters groups after aggregation, unlike WHERE which filters individual rows before aggregation.",
  },
  {
    re: /GROUP\s+BY/i,
    concept: "GROUP BY",
    hint: "This needs one result row per category — group the rows by that column.",
    explain: "GROUP BY collapses rows sharing the same value(s) into a single group, so aggregate functions compute one result per group.",
  },
  {
    re: /\bCASE\s+WHEN\b/i,
    concept: "CASE expression",
    hint: "You need different output depending on a condition — a CASE WHEN expression can branch inline.",
    explain: "CASE WHEN ... THEN ... ELSE ... END evaluates conditions in order and returns the matching branch's value.",
  },
  {
    re: /\bUNION\s+ALL\b/i,
    concept: "UNION ALL",
    hint: "Combining two similarly-shaped result sets, keeping duplicates? Look at UNION ALL.",
    explain: "UNION ALL stacks two compatible result sets together without removing duplicate rows.",
  },
  {
    re: /\bUNION\b/i,
    concept: "UNION",
    hint: "Combining two similarly-shaped result sets into one, without duplicates? Look at UNION.",
    explain: "UNION stacks two compatible result sets together and removes duplicate rows.",
  },
  {
    re: /\bDISTINCT\b/i,
    concept: "DISTINCT",
    hint: "If the same value could repeat across rows, think about how to keep only unique values.",
    explain: "DISTINCT removes duplicate rows from the result.",
  },
  {
    re: /COALESCE\s*\(/i,
    concept: "COALESCE",
    hint: "Missing values need a fallback — a function that returns the first non-NULL value can help.",
    explain: "COALESCE(a, b, ...) returns the first non-NULL expression in its argument list, commonly used to substitute a default for NULL.",
  },
  {
    re: /\(\s*SELECT\b[\s\S]*\)\s*(FROM|WHERE|,)?/i,
    concept: "Subquery",
    hint: "Part of this problem depends on a value computed by another query — consider nesting a subquery.",
    explain: "A subquery is a SELECT nested inside another query, whose result is used as a value, list, or table for the outer query.",
  },
];

export function generateHints(question: PdfQuestion): string[] {
  const haystack = question.answerSql ?? question.text;
  const matched = RULES.filter((r) => r.re.test(haystack));

  if (!question.hasAnswer) {
    return [
      "Read the question carefully and identify which table(s) hold the data you need.",
      "Start by writing a simple SELECT to look at the raw data before adding filters, grouping, or joins.",
      "Break the problem into steps: filter first, then group/aggregate, then sort — build the query incrementally and run it often.",
    ];
  }

  const hints: string[] = [];
  hints.push("Think about which table(s) contain the columns this question needs, and how they relate to each other.");
  for (const m of matched.slice(0, 2)) {
    hints.push(m.hint);
  }
  if (hints.length < 3) {
    hints.push("Try writing the query in small steps — get the filtering right first, then add grouping, joins, or ranking on top.");
  }
  return hints.slice(0, 3);
}

export function generateExplanation(question: PdfQuestion): { concepts: string[]; explanation: string } {
  if (!question.answerSql) {
    return { concepts: [], explanation: "No answer was found for this question in the source PDF." };
  }
  const matched = RULES.filter((r) => r.re.test(question.answerSql!));
  const concepts = Array.from(new Set(matched.map((m) => m.concept)));

  let explanation: string;
  if (matched.length === 0) {
    explanation =
      "This query reads from the table(s) referenced in the FROM clause and applies the filtering/columns shown to produce the required result.";
  } else {
    explanation = matched
      .slice(0, 4)
      .map((m) => m.explain)
      .join(" ");
  }

  return { concepts, explanation };
}

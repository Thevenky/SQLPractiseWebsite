import type { MyDbColumn, MyDbTable, MyDbQuestion, MyDbDifficulty } from "./types";

function isNumeric(type: string): boolean {
  return /INT|DECIMAL|DOUBLE|FLOAT|NUMERIC|REAL|HUGEINT/i.test(type);
}
function isTextual(type: string): boolean {
  return /VARCHAR|TEXT|CHAR|STRING/i.test(type);
}
function isDateLike(type: string): boolean {
  return /DATE|TIMESTAMP/i.test(type);
}

function pick<T>(arr: T[], n: number): T[] {
  return arr.slice(0, n);
}

function newQuestion(text: string, difficulty: MyDbDifficulty, topics: string[]): MyDbQuestion {
  return {
    id: `gen-${Math.random().toString(36).slice(2, 10)}`,
    text,
    expectedSql: null,
    hints: [],
    difficulty,
    topics,
    notes: "",
    createdAt: Date.now(),
    attempts: 0,
    passed: false,
  };
}

/**
 * Rule-based question generator: only ever references tables/columns that actually exist in the
 * current schema, so every generated question is guaranteed solvable against the live data.
 */
export function generateQuestions(tables: MyDbTable[]): MyDbQuestion[] {
  const out: MyDbQuestion[] = [];

  for (const table of tables) {
    if (table.rows.length === 0) continue;
    const numericCols = table.columns.filter((c: MyDbColumn) => isNumeric(c.type) && !c.pk);
    const textCols = table.columns.filter((c: MyDbColumn) => isTextual(c.type));
    const dateCols = table.columns.filter((c: MyDbColumn) => isDateLike(c.type));

    // Beginner: basic filtering / selection
    if (textCols.length > 0) {
      out.push(newQuestion(`Show all rows from ${table.name} where ${textCols[0].name} is not empty.`, "beginner", ["SELECT", "WHERE"]));
    }
    if (numericCols.length > 0) {
      out.push(newQuestion(`Find the ${table.name} row(s) with the highest ${numericCols[0].name}.`, "beginner", ["ORDER BY"]));
    }

    // Intermediate: aggregation
    if (numericCols.length > 0) {
      out.push(newQuestion(`What is the average ${numericCols[0].name} across all rows in ${table.name}?`, "intermediate", ["Aggregation"]));
    }
    if (textCols.length > 0 && numericCols.length > 0) {
      out.push(
        newQuestion(
          `Group ${table.name} by ${textCols[0].name} and show the total ${numericCols[0].name} for each group.`,
          "intermediate",
          ["GROUP BY", "Aggregation"]
        )
      );
    }
    if (dateCols.length > 0) {
      out.push(newQuestion(`Find rows in ${table.name} with the earliest ${dateCols[0].name}.`, "intermediate", ["ORDER BY"]));
    }

    // Advanced: top-N per group, self-relationships
    const fkCol = table.columns.find((c) => /_id$/i.test(c.name) && !c.pk);
    if (numericCols.length > 0 && fkCol) {
      out.push(
        newQuestion(
          `For each ${fkCol.name}, find the top 3 rows in ${table.name} by ${numericCols[0].name}.`,
          "advanced",
          ["Window Functions", "Top N per group"]
        )
      );
    }
    if (numericCols.length > 0) {
      out.push(
        newQuestion(
          `Find rows in ${table.name} where ${numericCols[0].name} is above the overall average ${numericCols[0].name}.`,
          "advanced",
          ["Subquery"]
        )
      );
    }
  }

  // Cross-table: joins, based on shared column names between two tables
  for (let i = 0; i < tables.length; i++) {
    for (let j = 0; j < tables.length; j++) {
      if (i === j) continue;
      const a = tables[i];
      const b = tables[j];
      const shared = a.columns.find((ca) => b.columns.some((cb) => cb.name === ca.name && (ca.pk || cb.pk)));
      if (shared) {
        out.push(
          newQuestion(
            `Join ${a.name} and ${b.name} on ${shared.name} and show the combined columns.`,
            "intermediate",
            ["JOIN"]
          )
        );
      }
    }
  }

  return pick(out, 12);
}

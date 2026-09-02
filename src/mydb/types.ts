export interface MyDbForeignKey {
  table: string;
  column: string;
}

export interface MyDbColumn {
  name: string;
  type: string;
  nullable: boolean;
  pk?: boolean;
  fk?: MyDbForeignKey | null;
  defaultValue?: string;
}

export interface MyDbTable {
  name: string;
  columns: MyDbColumn[];
  rows: Record<string, unknown>[];
}

export type MyDbDifficulty = "beginner" | "intermediate" | "advanced";

export interface MyDbQuestion {
  id: string;
  /** Short title, e.g. "Second-highest salary per department" */
  title: string;
  /** Full question prompt / description */
  description: string;
  expectedSql: string | null;
  explanation: string;
  hints: string[];
  difficulty: MyDbDifficulty;
  topics: string[];
  notes: string;
  createdAt: number;

  // Progress tracking
  attempts: number;
  correctAttempts: number;
  incorrectAttempts: number;
  hintsUsed: number;
  solutionRevealed: boolean;
  lastAttemptAt?: number;
  lastSolution?: string;
  passed: boolean;
}

/** One user-created custom database: its own tables + the questions written against it. */
export interface MyDbDatabase {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  tables: MyDbTable[];
  questions: MyDbQuestion[];
}

/** The whole persisted "My Practice" workspace: every custom database the user has created. */
export interface MyDbStore {
  databases: MyDbDatabase[];
  activeDatabaseId: string | null;
}

export const SQL_TYPES = [
  "INTEGER",
  "BIGINT",
  "DECIMAL",
  "VARCHAR",
  "TEXT",
  "DATE",
  "TIMESTAMP",
  "BOOLEAN",
  "DOUBLE",
] as const;

export const TOPIC_OPTIONS = [
  "SELECT",
  "WHERE",
  "ORDER BY",
  "GROUP BY",
  "HAVING",
  "JOIN",
  "Subquery",
  "CTE",
  "Window Functions",
  "CASE",
  "Aggregation",
  "Self Join",
] as const;

export function newDatabase(name: string): MyDbDatabase {
  const now = Date.now();
  return {
    id: `db-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    createdAt: now,
    updatedAt: now,
    tables: [],
    questions: [],
  };
}

export function newQuestion(partial: Partial<MyDbQuestion> & { title: string; description: string }): MyDbQuestion {
  return {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    expectedSql: null,
    explanation: "",
    hints: [],
    difficulty: "beginner",
    topics: [],
    notes: "",
    createdAt: Date.now(),
    attempts: 0,
    correctAttempts: 0,
    incorrectAttempts: 0,
    hintsUsed: 0,
    solutionRevealed: false,
    passed: false,
    ...partial,
  };
}

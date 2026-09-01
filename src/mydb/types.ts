export interface MyDbColumn {
  name: string;
  type: string;
  nullable: boolean;
  pk?: boolean;
}

export interface MyDbTable {
  name: string;
  columns: MyDbColumn[];
  rows: Record<string, unknown>[];
}

export type MyDbDifficulty = "beginner" | "intermediate" | "advanced";

export interface MyDbQuestion {
  id: string;
  text: string;
  expectedSql: string | null;
  hints: string[];
  difficulty: MyDbDifficulty;
  topics: string[];
  notes: string;
  createdAt: number;
  lastSolution?: string;
  lastAttemptAt?: number;
  attempts: number;
  passed: boolean;
}

export interface MyDbState {
  id: string;
  name: string;
  updatedAt: number;
  tables: MyDbTable[];
  questions: MyDbQuestion[];
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

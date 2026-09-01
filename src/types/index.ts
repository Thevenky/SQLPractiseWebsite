export interface ColumnDef {
  name: string;
  type: string;
  pk?: boolean;
  fk?: { table: string; column: string };
  nullable?: boolean;
}

export interface TableDef {
  name: string;
  description: string;
  columns: ColumnDef[];
}

export interface DatasetDef {
  id: string;
  name: string;
  description: string;
  tables: TableDef[];
  ddl: string; // CREATE TABLE statements
  seed: string; // INSERT statements
  relationships: { from: string; fromCol: string; to: string; toCol: string }[];
}

export type Level = "beginner" | "intermediate" | "advanced";
export type Difficulty = "beginner" | "easy" | "medium" | "hard" | "expert";

export interface Question {
  id: string;
  level: Level;
  topic: string;
  topicLabel: string;
  difficulty: Difficulty;
  title: string;
  description: string;
  dataset: string; // dataset id
  tables: string[];
  hints: string[];
  solution: string;
  explanation: string;
  thoughtProcess: string[];
  concept: string;
  tags: string[];
  orderMatters?: boolean;
  requiresPattern?: { regex: string; message: string };
}

export interface QueryResult {
  columns: string[];
  rows: Record<string, unknown>[];
  execMs: number;
  rowCount: number;
}

export interface ValidationResult {
  status: "pass" | "fail" | "error";
  message: string;
  detail?: string;
}

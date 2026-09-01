export interface PdfColumn {
  name: string;
  type?: string;
  pk?: boolean;
  fk?: { table: string; column: string };
}

export interface PdfTable {
  name: string;
  columns: PdfColumn[];
  sampleRows?: Record<string, unknown>[];
}

export type QuestionStatus = "unattempted" | "completed" | "incorrect" | "review";

export interface PdfQuestion {
  id: string;
  index: number;
  text: string;
  answerSql: string | null;
  hasAnswer: boolean;
  topics: string[];
  status: QuestionStatus;
  attempts: number;
  lastQueryText?: string;
}

export interface PdfExtractionWarning {
  message: string;
}

export interface PdfPracticeSet {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  schemaName: string;
  ddl: string;
  seed: string;
  tables: PdfTable[];
  questions: PdfQuestion[];
  warnings: string[];
  sourceFileName: string;
  pdfPageCount: number;
  extractionMode: "sql-ddl" | "text-schema" | "none";
}

export interface ProcessingStep {
  key: string;
  label: string;
  status: "pending" | "active" | "done";
}

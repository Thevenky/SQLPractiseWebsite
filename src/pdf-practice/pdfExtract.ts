import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { extractCreateTableBlocks, extractInsertBlocks, parseCreateTable } from "./sqlSchemaParse";
import { parseTextSchema } from "./textSchemaParse";
import { parseQuestionsAndAnswers, detectTopics } from "./questionParse";
import type { PdfPracticeSet, PdfQuestion, PdfTable, ProcessingStep } from "./types";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

export const PROCESSING_STEPS: { key: string; label: string }[] = [
  { key: "read", label: "Reading PDF" },
  { key: "schema", label: "Extracting database schema" },
  { key: "questions", label: "Extracting questions" },
  { key: "answers", label: "Extracting answers" },
  { key: "build", label: "Building SQL database" },
  { key: "validate", label: "Validating questions" },
];

export type ProgressCallback = (steps: ProcessingStep[], percent: number) => void;

function makeSteps(activeKey: string, doneKeys: string[]): ProcessingStep[] {
  return PROCESSING_STEPS.map((s) => ({
    ...s,
    status: doneKeys.includes(s.key) ? "done" : s.key === activeKey ? "active" : "pending",
  }));
}

async function readPdfText(file: File, onProgress: ProgressCallback): Promise<{ text: string; pageCount: number }> {
  onProgress(makeSteps("read", []), 2);
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;
  const pageTexts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    // Group text items into lines using their vertical position.
    let lastY: number | null = null;
    let line = "";
    const lines: string[] = [];
    for (const item of content.items as { str: string; transform: number[] }[]) {
      const y = item.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line);
        line = "";
      }
      line += (line && !line.endsWith(" ") ? " " : "") + item.str;
      lastY = y;
    }
    if (line) lines.push(line);
    pageTexts.push(lines.join("\n"));
    onProgress(makeSteps("read", []), 2 + Math.round((i / doc.numPages) * 8));
  }
  return { text: pageTexts.join("\n\n"), pageCount: doc.numPages };
}

function inferColumnType(name: string): string {
  const n = name.toLowerCase();
  if (n === "id" || n.endsWith("_id")) return "INTEGER";
  if (n.includes("date")) return "DATE";
  if (/(salary|price|total|amount|revenue|cost|avg|balance)/.test(n)) return "DOUBLE";
  if (/(quantity|count|age|year|qty|num_)/.test(n)) return "INTEGER";
  return "VARCHAR";
}

function buildDdlFromTextTables(tables: PdfTable[]): string {
  return tables
    .map((t) => {
      const cols = t.columns
        .map((c) => {
          const type = c.type ?? inferColumnType(c.name);
          return `  "${c.name}" ${type}`;
        })
        .join(",\n");
      return `CREATE TABLE "${t.name}" (\n${cols}\n);`;
    })
    .join("\n\n");
}

export interface ExtractionResult {
  tables: PdfTable[];
  ddl: string;
  seed: string;
  questions: PdfQuestion[];
  warnings: string[];
  extractionMode: PdfPracticeSet["extractionMode"];
  pageCount: number;
}

export async function extractPdf(file: File, onProgress: ProgressCallback = () => {}): Promise<ExtractionResult> {
  const warnings: string[] = [];

  const { text, pageCount } = await readPdfText(file, onProgress);

  // --- Schema ---
  onProgress(makeSteps("schema", ["read"]), 15);
  const createBlocks = extractCreateTableBlocks(text);
  const insertBlocks = extractInsertBlocks(text);
  let tables: PdfTable[] = [];
  let ddl = "";
  let seed = "";
  let extractionMode: PdfPracticeSet["extractionMode"] = "none";

  if (createBlocks.length > 0) {
    extractionMode = "sql-ddl";
    for (const block of createBlocks) {
      const parsed = parseCreateTable(block);
      if (parsed) tables.push(parsed);
    }
    ddl = createBlocks.join("\n\n");
    seed = insertBlocks.join("\n");
    if (insertBlocks.length === 0) {
      warnings.push("No INSERT statements were found — tables were created but may be empty. You can still practice writing queries.");
    }
  } else {
    const textTables = parseTextSchema(text);
    if (textTables.length > 0) {
      extractionMode = "text-schema";
      tables = textTables;
      ddl = buildDdlFromTextTables(textTables);
      warnings.push(
        "No SQL CREATE TABLE statements were found. Tables were inferred from a plain-text schema listing, and column data types were guessed from column names — double check the schema explorer before relying on it."
      );
      warnings.push("No sample data was detected in this format, so the tables were created empty.");
    } else {
      warnings.push("No database schema (SQL or plain-text table listing) could be detected in this PDF.");
    }
  }

  // --- Questions & answers ---
  onProgress(makeSteps("questions", ["read", "schema"]), 45);
  const rawQa = parseQuestionsAndAnswers(text);
  onProgress(makeSteps("answers", ["read", "schema", "questions"]), 65);

  const questions: PdfQuestion[] = rawQa.map((qa, i) => ({
    id: `q-${i + 1}`,
    index: i + 1,
    text: qa.text,
    answerSql: qa.answerSql,
    hasAnswer: !!qa.answerSql,
    topics: detectTopics(qa.text, qa.answerSql),
    status: "unattempted",
    attempts: 0,
  }));

  if (questions.length === 0) {
    warnings.push("No questions could be detected in this PDF. Try a PDF with clearly labeled 'Question:' / numbered questions.");
  } else {
    const missingAnswers = questions.filter((q) => !q.hasAnswer).length;
    if (missingAnswers > 0) {
      warnings.push(`${missingAnswers} of ${questions.length} question(s) have no detected answer — you can still practice them, but they won't be auto-graded.`);
    }
  }

  onProgress(makeSteps("build", ["read", "schema", "questions", "answers"]), 80);

  return { tables, ddl, seed, questions, warnings, extractionMode, pageCount };
}

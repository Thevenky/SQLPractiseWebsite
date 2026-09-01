import { extractPdf, PROCESSING_STEPS, type ExtractionResult, type ProgressCallback } from "./pdfExtract";
import { createPdfSchema, runQueryInSchema } from "../sql-engine/duckdb";
import type { PdfPracticeSet, ProcessingStep } from "./types";

function makeSteps(activeKey: string, doneKeys: string[]): ProcessingStep[] {
  return PROCESSING_STEPS.map((s) => ({
    ...s,
    status: doneKeys.includes(s.key) ? "done" : s.key === activeKey ? "active" : "pending",
  }));
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export interface StagedSet {
  file: File;
  extraction: ExtractionResult;
  suggestedName: string;
  schemaName: string;
}

/** Extract a PDF and build its DuckDB schema, but don't persist it yet — used for the review screen. */
export async function stagePdf(file: File, onProgress: ProgressCallback = () => {}): Promise<StagedSet> {
  const extraction = await extractPdf(file, onProgress);

  const schemaName = `pdf_${slugify(file.name) || "set"}_${Math.random().toString(36).slice(2, 8)}`;

  onProgress(makeSteps("build", ["read", "schema", "questions", "answers"]), 85);
  await createPdfSchema(schemaName, extraction.ddl, extraction.seed);

  // Validate: try running each extracted answer; if it errors, treat the question as answer-less
  // rather than silently keeping a broken answer around.
  onProgress(makeSteps("validate", ["read", "schema", "questions", "answers", "build"]), 92);
  for (const q of extraction.questions) {
    if (!q.answerSql) continue;
    try {
      await runQueryInSchema(schemaName, q.answerSql);
    } catch {
      q.hasAnswer = false;
      const msg = `Question ${q.index}'s extracted answer failed to run against the built database and was treated as "no answer".`;
      if (!extraction.warnings.includes(msg)) extraction.warnings.push(msg);
    }
  }
  onProgress(makeSteps("validate", ["read", "schema", "questions", "answers", "build", "validate"]), 100);

  return {
    file,
    extraction,
    suggestedName: file.name.replace(/\.pdf$/i, ""),
    schemaName,
  };
}

export function stagedToPracticeSet(staged: StagedSet, id: string, name: string): PdfPracticeSet {
  const now = Date.now();
  return {
    id,
    name,
    createdAt: now,
    updatedAt: now,
    schemaName: staged.schemaName,
    ddl: staged.extraction.ddl,
    seed: staged.extraction.seed,
    tables: staged.extraction.tables,
    questions: staged.extraction.questions,
    warnings: staged.extraction.warnings,
    sourceFileName: staged.file.name,
    pdfPageCount: staged.extraction.pageCount,
    extractionMode: staged.extraction.extractionMode,
  };
}
